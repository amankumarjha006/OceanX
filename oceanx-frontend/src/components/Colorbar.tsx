import { useEffect, useRef } from 'react';
import { COLORMAPS, type ColormapType } from '../utils/colormap';

interface ColorbarProps {
  min: number;
  max: number;
  units: string;
  colormap?: ColormapType;
  width?: number;
  height?: number;
}

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
  }, [colormap, width, height]);

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