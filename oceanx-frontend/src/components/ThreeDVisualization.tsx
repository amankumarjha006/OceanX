import { useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { valueToThreeColor, type ColormapType } from '../utils/colormap';

const GRID_SIZE = 50;
const SEGMENTS = GRID_SIZE - 1;
const BLOCK_WIDTH = 40; // Longitude extent
const BLOCK_DEPTH = 40; // Latitude extent
const BLOCK_HEIGHT = 10; // Volumetric ocean thickness
const HEIGHT_SCALE = 2.5;

interface ThreeDVisualizationProps {
  values: number[][];
  min: number;
  max: number;
  colormap: ColormapType;
  latRange: { min: number; max: number };
  lonRange: { min: number; max: number };
  depthValue: number;
}

// 1. TOP SURFACE HEIGHTMAP
function TopSurface({ values, min, max, colormap }: { values: number[][]; min: number; max: number; colormap: ColormapType }) {
  const geoRef = useRef<THREE.PlaneGeometry | null>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(BLOCK_WIDTH, BLOCK_DEPTH, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    const colorAttr = new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3);
    geo.setAttribute('color', colorAttr);
    return geo;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.35,
      metalness: 0.1,
    });
  }, []);

  geoRef.current = geometry;

  useEffect(() => {
    const geo = geoRef.current;
    if (!geo) return;

    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = geo.getAttribute('color') as THREE.BufferAttribute;
    const rows = values.length;
    const cols = values[0]?.length || 0;
    if (rows === 0 || cols === 0) return;

    const vertexCount = posAttr.count;

    for (let i = 0; i < vertexCount; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      if (r >= rows || c >= cols) continue;

      const val = values[r][c];
      const normVal = max === min ? 0.5 : (val - min) / (max - min);
      
      // Y offset relative to top of block (BLOCK_HEIGHT / 2 = 5)
      const h = BLOCK_HEIGHT / 2 + normVal * HEIGHT_SCALE;
      posAttr.setY(i, h);

      const color = valueToThreeColor(val, min, max, colormap);
      colorAttr.setXYZ(i, color.r, color.g, color.b);
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    geo.computeVertexNormals();
  }, [values, min, max, colormap]);

  return <mesh geometry={geometry} material={material} />;
}

// 2. SIDE WALLS WITH DEPTH GRADIENT
function SideWall({
  position,
  rotation,
  width,
  edgeValues,
  min,
  max,
  colormap,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  edgeValues: number[];
  min: number;
  max: number;
  colormap: ColormapType;
}) {
  const geoRef = useRef<THREE.PlaneGeometry | null>(null);
  const vSegments = 10;
  const hSegments = edgeValues.length - 1;

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, BLOCK_HEIGHT, hSegments, vSegments);
    const colorAttr = new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3);
    geo.setAttribute('color', colorAttr);
    return geo;
  }, [width, hSegments]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.1,
    });
  }, []);

  geoRef.current = geometry;

  useEffect(() => {
    const geo = geoRef.current;
    if (!geo) return;

    const colorAttr = geo.getAttribute('color') as THREE.BufferAttribute;
    const cols = edgeValues.length;
    const vertexCount = colorAttr.count;

    const deepColor = valueToThreeColor(min, min, max, colormap);

    for (let i = 0; i < vertexCount; i++) {
      const row = Math.floor(i / cols); // 0 (top) to vSegments (bottom)
      const col = i % cols;
      const topVal = edgeValues[col] ?? min;

      const topColor = valueToThreeColor(topVal, min, max, colormap);
      const depthFactor = row / vSegments; // 0 = surface, 1 = deep bottom

      // Interpolate surface color down to deep ocean color
      const r = topColor.r * (1 - depthFactor * 0.7) + deepColor.r * (depthFactor * 0.7);
      const g = topColor.g * (1 - depthFactor * 0.7) + deepColor.g * (depthFactor * 0.7);
      const b = topColor.b * (1 - depthFactor * 0.7) + deepColor.b * (depthFactor * 0.7);

      colorAttr.setXYZ(i, r, g, b);
    }

    colorAttr.needsUpdate = true;
  }, [edgeValues, min, max, colormap]);

  return <mesh position={position} rotation={rotation} geometry={geometry} material={material} />;
}

// 3. OUTLINE EDGES
function BlockOutline() {
  const edgesGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_DEPTH);
    return new THREE.EdgesGeometry(box);
  }, []);

  return (
    <lineSegments geometry={edgesGeometry}>
      <lineBasicMaterial attach="material" color="#06b6d4" linewidth={2} transparent opacity={0.6} />
    </lineSegments>
  );
}

// 4. BOTTOM BASE
function BottomSurface() {
  return (
    <mesh position={[0, -BLOCK_HEIGHT / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[BLOCK_WIDTH, BLOCK_DEPTH]} />
      <meshStandardMaterial color="#020617" roughness={0.9} metalness={0.2} />
    </mesh>
  );
}

export function ThreeDVisualization({
  values,
  min,
  max,
  colormap,
  latRange: _latRange,
  lonRange: _lonRange,
  depthValue: _depthValue,
}: ThreeDVisualizationProps) {
  const numRows = values.length;
  const numCols = values[0]?.length || 0;

  // Extract edge values for the 4 side walls
  const northEdges = useMemo(() => (numRows > 0 ? values[0] : []), [values, numRows]);
  const southEdges = useMemo(() => (numRows > 0 ? values[numRows - 1] : []), [values, numRows]);
  const westEdges = useMemo(() => values.map((r) => r[0] || 0), [values]);
  const eastEdges = useMemo(() => values.map((r) => r[numCols - 1] || 0), [values, numCols]);

  return (
    <div className="three-d-container" style={{ width: '100%', height: '620px', position: 'relative' }}>
      <Canvas
        gl={{ antialias: true }}
        camera={{ position: [38, 28, 38], fov: 42, near: 0.1, far: 1000 }}
      >
        <color attach="background" args={['#080d1a']} />
        
        {/* Lights */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[40, 60, 40]} intensity={0.9} />
        <directionalLight position={[-30, 20, -30]} intensity={0.4} />

        <group position={[0, 0, 0]}>
          {/* Top Surface Slice */}
          <TopSurface values={values} min={min} max={max} colormap={colormap} />

          {/* 4 Side Walls */}
          {/* North Wall (Back, Z = -20) */}
          <SideWall
            position={[0, 0, -BLOCK_DEPTH / 2]}
            rotation={[0, 0, 0]}
            width={BLOCK_WIDTH}
            edgeValues={northEdges}
            min={min}
            max={max}
            colormap={colormap}
          />
          {/* South Wall (Front, Z = +20) */}
          <SideWall
            position={[0, 0, BLOCK_DEPTH / 2]}
            rotation={[0, Math.PI, 0]}
            width={BLOCK_WIDTH}
            edgeValues={southEdges}
            min={min}
            max={max}
            colormap={colormap}
          />
          {/* West Wall (Left, X = -20) */}
          <SideWall
            position={[-BLOCK_WIDTH / 2, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            width={BLOCK_DEPTH}
            edgeValues={westEdges}
            min={min}
            max={max}
            colormap={colormap}
          />
          {/* East Wall (Right, X = +20) */}
          <SideWall
            position={[BLOCK_WIDTH / 2, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            width={BLOCK_DEPTH}
            edgeValues={eastEdges}
            min={min}
            max={max}
            colormap={colormap}
          />

          {/* Abyssal Floor */}
          <BottomSurface />

          {/* Wireframe Outline Box */}
          <BlockOutline />
        </group>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={15}
          maxDistance={150}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}