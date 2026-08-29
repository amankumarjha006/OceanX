import { useState, useEffect, useCallback } from 'react';
import { Controls, HeatmapCanvas, Colorbar, StatusBar } from './components';
import type { ColormapType } from './components/HeatmapCanvas';
import { fetchDimensions, fetchVariables, checkBackendHealth, setUseMockMode } from './api/backend';
import { useSlice } from './hooks/useSlice';
import type { Dimensions, Variable } from './types/api';
import './App.css';

function App() {
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [selectedVariable, setSelectedVariable] = useState('temperature');
  const [depthIndex, setDepthIndex] = useState(0);
  const [timeIndex, setTimeIndex] = useState(0);
  const [colormap, setColormap] = useState<ColormapType>('thermal');
  const [isPlaying, setIsPlaying] = useState(false);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    setInitialLoading(true);
    setInitialError(null);

    const isLive = await checkBackendHealth();
    setBackendConnected(isLive);

    if (!isLive && !isDemoMode) {
      // Automatically fallback to demo mode so user never sees a blank page
      setUseMockMode(true);
      setIsDemoMode(true);
    } else {
      setUseMockMode(isDemoMode);
    }

    try {
      const [dims, vars] = await Promise.all([fetchDimensions(), fetchVariables()]);
      setDimensions(dims);
      setVariables(vars);
      if (vars.length > 0 && !vars.some(v => v.name === selectedVariable)) {
        setSelectedVariable(vars[0].name);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not connect to ocean data server';
      setInitialError(msg);
    } finally {
      setInitialLoading(false);
    }
  }, [isDemoMode, selectedVariable]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle animation timer for playing through 24-hour time steps
  useEffect(() => {
    let timer: number | undefined;
    if (isPlaying) {
      timer = window.setInterval(() => {
        setTimeIndex((prev) => (prev + 1) % 24);
      }, 600);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  const depthValue = dimensions?.depth.values[depthIndex] ?? 0;
  const { data, loading, error } = useSlice(selectedVariable, depthValue, timeIndex);
  const variableMeta = variables.find((v) => v.name === selectedVariable);

  const toggleDemoMode = () => {
    const nextMode = !isDemoMode;
    setIsDemoMode(nextMode);
    setUseMockMode(nextMode);
  };

  return (
    <div className="app-container">
      <header className="header-bar">
        <div className="brand">
          <div className="logo-icon">🌊</div>
          <div>
            <h1>OCEANX</h1>
            <p className="subtitle">Oceanographic 2D & 3D Multi-Variable Heatmap Engine</p>
          </div>
        </div>

        <div className="header-actions">
          <div className={`status-badge ${backendConnected ? 'connected' : 'offline'}`}>
            <span className="dot"></span>
            {backendConnected ? 'Backend Server Connected' : 'Offline / Local Engine'}
          </div>

          <button
            type="button"
            className="toggle-mode-btn"
            onClick={toggleDemoMode}
          >
            {isDemoMode ? '🔌 Try Live Backend' : '⚡ Use Demo Mode'}
          </button>
        </div>
      </header>

      <main className="main-content">
        {initialLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Initializing OCEANX Data Pipeline...</p>
          </div>
        ) : initialError ? (
          <div className="error-state">
            <h2>⚠️ Connection Issue Detected</h2>
            <p>{initialError}</p>
            <p className="hint">
              The backend FastAPI server could not be reached at <code>http://localhost:8000</code>.
            </p>
            <div className="error-actions">
              <button type="button" className="btn-primary" onClick={loadInitialData}>
                🔄 Retry Connection
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setIsDemoMode(true); setUseMockMode(true); loadInitialData(); }}>
                ⚡ Switch to Demo Mode
              </button>
            </div>
          </div>
        ) : dimensions && variables.length > 0 ? (
          <>
            <StatusBar
              variableMeta={variableMeta}
              depth={depthValue}
              time={timeIndex}
              minVal={data?.min}
              maxVal={data?.max}
            />

            <Controls
              variables={variables}
              depthValues={dimensions.depth.values}
              selectedVariable={selectedVariable}
              depthIndex={depthIndex}
              timeIndex={timeIndex}
              colormap={colormap}
              isPlaying={isPlaying}
              onVariableChange={setSelectedVariable}
              onDepthChange={setDepthIndex}
              onTimeChange={setTimeIndex}
              onColormapChange={setColormap}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              loading={loading}
              error={error}
            />

            <div className="visualization-card">
              <div className="card-header">
                <h3>2D Horizontal Depth Slice Visualization</h3>
                <span className="info-chip">
                  Region: {dimensions.latitude.min}°N-{dimensions.latitude.max}°N | {dimensions.longitude.min}°E-{dimensions.longitude.max}°E
                </span>
              </div>

              <div className="visualization-body">
                {data ? (
                  <div className="heatmap-layout">
                    <HeatmapCanvas
                      values={data.values}
                      min={data.min}
                      max={data.max}
                      units={variableMeta?.units || ''}
                      latRange={{ min: dimensions.latitude.min, max: dimensions.latitude.max }}
                      lonRange={{ min: dimensions.longitude.min, max: dimensions.longitude.max }}
                      colormap={colormap}
                    />
                    <Colorbar
                      min={data.min}
                      max={data.max}
                      units={variableMeta?.units || ''}
                      colormap={colormap}
                    />
                  </div>
                ) : (
                  <div className="no-data-card">
                    {loading ? (
                      <div className="spinner"></div>
                    ) : (
                      <p>No slice data available for selected level</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default App;