import type { Variable } from '../types/api';

interface StatusBarProps {
  variableMeta?: Variable;
  depth: number;
  time: number;
  minVal?: number;
  maxVal?: number;
}

export function StatusBar({ variableMeta, depth, time, minVal, maxVal }: StatusBarProps) {
  const timeStr = time.toString().padStart(2, '0');
  const units = variableMeta?.units || '';

  return (
    <div className="stats-bar">
      <div className="stat-pill">
        <span className="stat-label">Variable</span>
        <span className="stat-value">{variableMeta?.long_name || variableMeta?.name || 'Temperature'}</span>
      </div>

      <div className="stat-pill">
        <span className="stat-label">Depth</span>
        <span className="stat-value">{depth.toFixed(1)} m</span>
      </div>

      <div className="stat-pill">
        <span className="stat-label">Timestamp</span>
        <span className="stat-value">Hour {timeStr}:00</span>
      </div>

      {minVal !== undefined && maxVal !== undefined && (
        <>
          <div className="stat-pill">
            <span className="stat-label">Min</span>
            <span className="stat-value min">{minVal.toFixed(2)} {units}</span>
          </div>

          <div className="stat-pill">
            <span className="stat-label">Max</span>
            <span className="stat-value max">{maxVal.toFixed(2)} {units}</span>
          </div>
        </>
      )}
    </div>
  );
}