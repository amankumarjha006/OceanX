import * as THREE from 'three';

export type ColormapType = 'thermal' | 'ocean' | 'chlorophyll' | 'viridis';

export const COLORMAPS: Record<ColormapType, { offset: number; color: [number, number, number] }[]> = {
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

export function interpolateColor(t: number, cmap: ColormapType = 'thermal'): string {
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

export function valueToColor(value: number, min: number, max: number, cmap: ColormapType): string {
  if (max === min) return interpolateColor(0.5, cmap);
  const t = (value - min) / (max - min);
  return interpolateColor(t, cmap);
}

export function valueToThreeColor(value: number, min: number, max: number, cmap: ColormapType): THREE.Color {
  if (max === min) {
    const colorStr = interpolateColor(0.5, cmap);
    return new THREE.Color(colorStr);
  }
  const t = (value - min) / (max - min);
  const colorStr = interpolateColor(t, cmap);
  return new THREE.Color(colorStr);
}