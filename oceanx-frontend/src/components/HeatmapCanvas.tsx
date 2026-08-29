import { useEffect, useRef, useState } from 'react';
import { valueToColor, type ColormapType } from '../utils/colormap';

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