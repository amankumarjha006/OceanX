import { useEffect, useRef, useState } from 'react';

export type ColormapType = 'thermal' | 'ocean' | 'chlorophyll' | 'viridis';

interface HeatmapCanvasProps {
  values: number[][];
  min: number;
  max: number;
  units?: string;
  latRange?: { min: number; max: number };
  lonRange?: { min: number; max: number };
  colormap?: ColormapType;
  width?: number;
  height?: number;
}

const COLORMAPS: Record<ColormapType, { offset: number; color: [number, number, number] }[]> = {
  thermal: [
    { offset: 0.0, color: [15, 23, 42] },      // deep dark blue
    { offset: 0.2, color: [14, 116, 144] },   // cyan-blue
    { offset: 0.4, color: [34, 197, 94] },    // green
    { offset: 0.7, color: [234, 179, 8] },    // yellow
    { offset: 0.9, color: [249, 115, 22] },   // orange
    { offset: 1.0, color: [225, 29, 72] },    // vivid red
  ],
  ocean: [
    { offset: 0.0, color: [3, 7, 18] },
    { offset: 0.25, color: [15, 23, 42] },
    { offset: 0.5, color: [14, 116, 144] },
    { offset: 0.75, color: [6, 182, 212] },
    { offset: 1.0, color: [165, 243, 252] },
  ],
  chlorophyll: [
    { offset: 0.0, color: [6, 78, 59] },
    { offset: 0.3, color: [16, 185, 129] },
    { offset: 0.6, color: [134, 239, 172] },
    { offset: 0.85, color: [253, 224, 71] },
    { offset: 1.0, color: [239, 68, 68] },
  ],
  viridis: [
    { offset: 0.0, color: [68, 1, 84] },
    { offset: 0.25, color: [59, 82, 139] },
    { offset: 0.5, color: [33, 145, 140] },
    { offset: 0.75, color: [94, 201, 98] },
    { offset: 1.0, color: [253, 231, 37] },
  ],
};

function interpolateColor(t: number, cmap: ColormapType = 'thermal'): string {
  const stops = COLORMAPS[cmap] || COLORMAPS.thermal;
  const clamped = Math.max(0, Math.min(1, t));

  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (clamped >= a.offset && clamped <= b.offset) {
      const localT = (clamped - a.offset) / (b.offset - a.offset);
      const r = Math.round(a.color[0] + (b.color[0] - a.color[0]) * localT);
      const g = Math.round(a.color[1] + (b.color[1] - a.color[1]) * localT);
      const bl = Math.round(a.color[2] + (b.color[2] - a.color[2]) * localT);
      return `rgb(${r},${g},${bl})`;
    }
  }
  const last = stops[stops.length - 1];
  return `rgb(${last.color[0]},${last.color[1]},${last.color[2]})`;
}

function valueToColor(value: number, min: number, max: number, cmap: ColormapType): string {
  if (max === min) return interpolateColor(0.5, cmap);
  const t = (value - min) / (max - min);
  return interpolateColor(t, cmap);
}

export function HeatmapCanvas({
  values,
  min,
  max,
  units = '',
  latRange = { min: 5, max: 25 },
  lonRange = { min: 60, max: 80 },
  colormap = 'thermal',
  width = 540,
  height = 540,
}: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    lat: number;
    lon: number;
    val: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = values.length;
    const cols = values[0]?.length || 0;
    if (rows === 0 || cols === 0) return;

    canvas.width = width;
    canvas.height = height;

    const cellWidth = width / cols;
    const cellHeight = height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = values[r][c];
        ctx.fillStyle = valueToColor(val, min, max, colormap);
        ctx.fillRect(c * cellWidth, r * cellHeight, cellWidth + 0.5, cellHeight + 0.5);
      }
    }
  }, [values, min, max, colormap, width, height]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rows = values.length;
    const cols = values[0]?.length || 0;
    if (rows === 0 || cols === 0) return;

    const colIndex = Math.min(cols - 1, Math.max(0, Math.floor((x / rect.width) * cols)));
    const rowIndex = Math.min(rows - 1, Math.max(0, Math.floor((y / rect.height) * rows)));

    const val = values[rowIndex][colIndex];
    const lat = latRange.min + ((rows - 1 - rowIndex) / (rows - 1)) * (latRange.max - latRange.min);
    const lon = lonRange.min + (colIndex / (cols - 1)) * (lonRange.max - lonRange.min);

    setHoverInfo({ lat, lon, val, x, y });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  return (
    <div className="heatmap-container">
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="heatmap-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        {hoverInfo && (
          <div
            className="heatmap-tooltip"
            style={{
              left: `${Math.min(hoverInfo.x + 12, width - 140)}px`,
              top: `${Math.max(hoverInfo.y - 45, 10)}px`,
            }}
          >
            <div><strong>Val:</strong> {hoverInfo.val.toFixed(2)} {units}</div>
            <div><strong>Lat:</strong> {hoverInfo.lat.toFixed(1)}°N</div>
            <div><strong>Lon:</strong> {hoverInfo.lon.toFixed(1)}°E</div>
          </div>
        )}
      </div>

      <div className="heatmap-axes">
        <div className="axis-lon">
          <span>{lonRange.min}°E</span>
          <span>{((lonRange.min + lonRange.max) / 2).toFixed(1)}°E</span>
          <span>{lonRange.max}°E</span>
        </div>
      </div>
    </div>
  );
}