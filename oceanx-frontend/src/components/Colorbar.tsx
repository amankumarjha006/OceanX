import { useEffect, useRef } from 'react';
import type { ColormapType } from './HeatmapCanvas';

interface ColorbarProps {
  min: number;
  max: number;
  units: string;
  colormap?: ColormapType;
  width?: number;
  height?: number;
}

const COLORMAPS: Record<ColormapType, { offset: number; color: [number, number, number] }[]> = {
  thermal: [
    { offset: 0.0, color: [15, 23, 42] },
    { offset: 0.2, color: [14, 116, 144] },
    { offset: 0.4, color: [34, 197, 94] },
    { offset: 0.7, color: [234, 179, 8] },
    { offset: 0.9, color: [249, 115, 22] },
    { offset: 1.0, color: [225, 29, 72] },
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

export function Colorbar({
  min,
  max,
  units,
  colormap = 'thermal',
  width = 24,
  height = 500,
}: ColorbarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    const stops = COLORMAPS[colormap] || COLORMAPS.thermal;
    stops.forEach((stop) => {
      gradient.addColorStop(stop.offset, `rgb(${stop.color.join(',')})`);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, [min, max, colormap, width, height]);

  const mid = (min + max) / 2;
  const q1 = min + (max - min) * 0.25;
  const q3 = min + (max - min) * 0.75;

  return (
    <div className="colorbar-container" style={{ height: `${height}px` }}>
      <canvas ref={canvasRef} width={width} height={height} className="colorbar-bar" />
      <div className="colorbar-ticks">
        <span className="tick top">{max.toFixed(2)} {units}</span>
        <span className="tick q3">{q3.toFixed(2)}</span>
        <span className="tick mid">{mid.toFixed(2)}</span>
        <span className="tick q1">{q1.toFixed(2)}</span>
        <span className="tick bot">{min.toFixed(2)} {units}</span>
      </div>
    </div>
  );
}