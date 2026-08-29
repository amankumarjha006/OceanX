import type { Variable } from '../types/api';
import type { ColormapType } from './HeatmapCanvas';

interface ControlsProps {
  variables: Variable[];
  depthValues: number[];
  selectedVariable: string;
  depthIndex: number;
  timeIndex: number;
  colormap: ColormapType;
  isPlaying: boolean;
  onVariableChange: (variable: string) => void;
  onDepthChange: (index: number) => void;
  onTimeChange: (index: number) => void;
  onColormapChange: (cmap: ColormapType) => void;
  onTogglePlay: () => void;
  loading: boolean;
  error: string | null;
}

export function Controls({
  variables,
  depthValues,
  selectedVariable,
  depthIndex,
  timeIndex,
  colormap,
  isPlaying,
  onVariableChange,
  onDepthChange,
  onTimeChange,
  onColormapChange,
  onTogglePlay,
  loading,
  error,
}: ControlsProps) {
  if (variables.length === 0 || depthValues.length === 0) {
    return <div className="controls-skeleton">Loading controls parameters...</div>;
  }

  const currentDepth = depthValues[depthIndex] ?? 0;

  return (
    <div className="controls-panel">
      <div className="controls-grid">
        <div className="control-card">
          <label htmlFor="variable-select" className="control-label">
            <span className="icon">🌊</span> Ocean Variable
          </label>
          <select
            id="variable-select"
            className="styled-select"
            value={selectedVariable}
            onChange={(e) => onVariableChange(e.target.value)}
            disabled={loading}
          >
            {variables.map((v) => (
              <option key={v.name} value={v.name}>
                {v.long_name} ({v.units})
              </option>
            ))}
          </select>
        </div>

        <div className="control-card">
          <label htmlFor="colormap-select" className="control-label">
            <span className="icon">🎨</span> Color Palette
          </label>
          <select
            id="colormap-select"
            className="styled-select"
            value={colormap}
            onChange={(e) => onColormapChange(e.target.value as ColormapType)}
          >
            <option value="thermal">Thermal / Infrared</option>
            <option value="ocean">Deep Ocean Blue</option>
            <option value="chlorophyll">Emerald Chlorophyll</option>
            <option value="viridis">Viridis / Perceptual</option>
          </select>
        </div>

        <div className="control-card slider-card">
          <div className="slider-header">
            <label htmlFor="depth-slider" className="control-label">
              <span className="icon">📏</span> Depth Level
            </label>
            <span className="value-badge">{currentDepth.toFixed(1)} m (Level {depthIndex + 1}/{depthValues.length})</span>
          </div>
          <div className="slider-row">
            <input
              id="depth-slider"
              type="range"
              className="styled-slider"
              min="0"
              max={depthValues.length - 1}
              value={depthIndex}
              onChange={(e) => onDepthChange(Number(e.target.value))}
              disabled={loading}
            />
          </div>
        </div>

        <div className="control-card slider-card">
          <div className="slider-header">
            <label htmlFor="time-slider" className="control-label">
              <span className="icon">⏱️</span> Time Series (24h)
            </label>
            <span className="value-badge">Step {timeIndex}:00 hrs</span>
          </div>
          <div className="slider-row">
            <button
              type="button"
              className={`play-btn ${isPlaying ? 'playing' : ''}`}
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause auto-animation' : 'Play time series animation'}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <input
              id="time-slider"
              type="range"
              className="styled-slider"
              min="0"
              max="23"
              value={timeIndex}
              onChange={(e) => onTimeChange(Number(e.target.value))}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}
    </div>
  );
}