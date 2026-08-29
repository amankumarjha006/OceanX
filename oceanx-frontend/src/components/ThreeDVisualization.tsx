import { useMemo, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { valueToThreeColor, type ColormapType } from '../utils/colormap';

const GRID_SIZE = 50;
const SEGMENTS = GRID_SIZE - 1;
const BLOCK_WIDTH = 40; // Longitude extent
const BLOCK_DEPTH = 40; // Latitude extent
const BLOCK_HEIGHT = 10; // Volumetric ocean thickness
const HEIGHT_SCALE = 2.5;

interface ThreeDVisualizationProps {
  volumeValues: number[][][]; // [depth][lat][lon]
  min: number;
  max: number;
  colormap: ColormapType;
  latRange: { min: number; max: number };
  lonRange: { min: number; max: number };
  depthValue: number;
  depthValues: number[];
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
      
      const isEdge = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
      
      // Y offset relative to top of block (BLOCK_HEIGHT / 2 = 5)
      const h = BLOCK_HEIGHT / 2 + (isEdge ? 0 : normVal * HEIGHT_SCALE);
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

// 2. SIDE WALLS WITH EXACT VERTICAL DEPTH MAPPING
function SideWall({
  position,
  rotation,
  width,
  curtainData,
  depthValues,
  min,
  max,
  colormap,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  curtainData: number[][]; // [depth][segment]
  depthValues: number[];
  min: number;
  max: number;
  colormap: ColormapType;
}) {
  const geoRef = useRef<THREE.PlaneGeometry | null>(null);

  const geometry = useMemo(() => {
    const hSegments = (curtainData[0]?.length || 1) - 1;
    const vSegments = depthValues.length - 1;
    const maxDepth = depthValues[depthValues.length - 1] || 1;
    
    const geo = new THREE.PlaneGeometry(width, BLOCK_HEIGHT, hSegments, vSegments);
    
    // adjust Y positions based on actual depth proportionality
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const cols = hSegments + 1;
    
    for (let i = 0; i < posAttr.count; i++) {
      const row = Math.floor(i / cols); // 0 to vSegments
      const depth = depthValues[row];
      const y = (BLOCK_HEIGHT / 2) - (depth / maxDepth) * BLOCK_HEIGHT;
      posAttr.setY(i, y);
    }
    
    geo.computeVertexNormals();

    const colorAttr = new THREE.Float32BufferAttribute(new Float32Array(posAttr.count * 3), 3);
    geo.setAttribute('color', colorAttr);
    return geo;
  }, [width, curtainData, depthValues]);

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
    const cols = curtainData[0]?.length || 1;
    const vertexCount = colorAttr.count;

    for (let i = 0; i < vertexCount; i++) {
      const row = Math.floor(i / cols); 
      const col = i % cols;
      const val = curtainData[row]?.[col] ?? min;

      const color = valueToThreeColor(val, min, max, colormap);
      colorAttr.setXYZ(i, color.r, color.g, color.b);
    }

    colorAttr.needsUpdate = true;
  }, [curtainData, min, max, colormap]);

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

// 5. DEPTH HIGHLIGHT BAND & AXIS
function DepthHighlight({ depthValue, maxDepth, depthValues }: { depthValue: number; maxDepth: number; depthValues: number[] }) {
  const y = (BLOCK_HEIGHT / 2) - (depthValue / maxDepth) * BLOCK_HEIGHT;
  
  const points = useMemo(() => {
    const w = BLOCK_WIDTH / 2;
    const d = BLOCK_DEPTH / 2;
    const ext = 0.05; // Extend slightly outside box
    return [
      [-w - ext, 0, -d - ext],
      [w + ext, 0, -d - ext],
      [w + ext, 0, d + ext],
      [-w - ext, 0, d + ext],
      [-w - ext, 0, -d - ext],
    ] as [number, number, number][];
  }, []);

  // Select evenly spaced labels
  const labels = useMemo(() => {
    const numLabels = 5;
    const step = Math.max(1, Math.floor(depthValues.length / numLabels));
    const selected = [];
    for (let i = 0; i < depthValues.length; i += step) {
      selected.push(depthValues[i]);
    }
    if (!selected.includes(depthValues[depthValues.length - 1])) {
      selected.push(depthValues[depthValues.length - 1]);
    }
    return selected;
  }, [depthValues]);

  return (
    <group>
      {/* Highlight Line */}
      <Line points={points} position={[0, y, 0]} color="#ffffff" lineWidth={3} />
      
      {/* Axis Labels on East Edge */}
      <group position={[BLOCK_WIDTH / 2 + 1, 0, BLOCK_DEPTH / 2 + 1]}>
        {labels.map(depth => {
          const ly = (BLOCK_HEIGHT / 2) - (depth / maxDepth) * BLOCK_HEIGHT;
          return (
            <Text
              key={depth}
              position={[0, ly, 0]}
              color="white"
              fontSize={1.4}
              anchorX="left"
              anchorY="middle"
            >
              {`${depth}m`}
            </Text>
          );
        })}
      </group>
    </group>
  );
}

export function ThreeDVisualization({
  volumeValues,
  min,
  max,
  colormap,
  latRange: _latRange,
  lonRange: _lonRange,
  depthValue,
  depthValues,
}: ThreeDVisualizationProps) {
  const selectedDepthIndex = depthValues.indexOf(depthValue);
  const topFaceValues = volumeValues[selectedDepthIndex >= 0 ? selectedDepthIndex : 0];

  const numRows = topFaceValues?.length || 0;
  const numCols = topFaceValues?.[0]?.length || 0;
  const maxDepth = depthValues[depthValues.length - 1] || 1;

  // Extract curtain values for the 4 side walls (all depths)
  const northCurtain = useMemo(() => volumeValues.map(slice => slice[0] || []), [volumeValues]);
  const southCurtain = useMemo(() => volumeValues.map(slice => slice[numRows - 1] || []), [volumeValues, numRows]);
  const westCurtain = useMemo(() => volumeValues.map(slice => slice.map(r => r[0] || 0)), [volumeValues]);
  const eastCurtain = useMemo(() => volumeValues.map(slice => slice.map(r => r[numCols - 1] || 0)), [volumeValues, numCols]);

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
          <TopSurface values={topFaceValues} min={min} max={max} colormap={colormap} />

          {/* 4 Side Walls */}
          {/* North Wall (Back, Z = -20) */}
          <SideWall
            position={[0, 0, -BLOCK_DEPTH / 2]}
            rotation={[0, 0, 0]}
            width={BLOCK_WIDTH}
            curtainData={northCurtain}
            depthValues={depthValues}
            min={min}
            max={max}
            colormap={colormap}
          />
          {/* South Wall (Front, Z = +20) */}
          <SideWall
            position={[0, 0, BLOCK_DEPTH / 2]}
            rotation={[0, Math.PI, 0]}
            width={BLOCK_WIDTH}
            curtainData={southCurtain}
            depthValues={depthValues}
            min={min}
            max={max}
            colormap={colormap}
          />
          {/* West Wall (Left, X = -20) */}
          <SideWall
            position={[-BLOCK_WIDTH / 2, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            width={BLOCK_DEPTH}
            curtainData={westCurtain}
            depthValues={depthValues}
            min={min}
            max={max}
            colormap={colormap}
          />
          {/* East Wall (Right, X = +20) */}
          <SideWall
            position={[BLOCK_WIDTH / 2, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            width={BLOCK_DEPTH}
            curtainData={eastCurtain}
            depthValues={depthValues}
            min={min}
            max={max}
            colormap={colormap}
          />

          {/* Abyssal Floor */}
          <BottomSurface />

          {/* Wireframe Outline Box */}
          <BlockOutline />

          {/* Dynamic Depth Highlight Band & Axis */}
          <DepthHighlight depthValue={depthValue} maxDepth={maxDepth} depthValues={depthValues} />
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