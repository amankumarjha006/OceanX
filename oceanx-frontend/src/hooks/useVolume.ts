import { useState, useEffect, useRef } from 'react';
import { fetchVolume } from '../api/backend';

export interface VolumeData {
  values: number[][][]; // [depth][lat][lon]
  min: number;
  max: number;
  depth: number[];
  time: number;
  variable: string;
}

export function useVolume(variable: string, time: number) {
  const [data, setData] = useState<VolumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cache to prevent refetching during Play animations
  const cacheRef = useRef<Record<string, VolumeData>>({});

  useEffect(() => {
    const cacheKey = `${variable}_${time}`;
    if (cacheRef.current[cacheKey]) {
      setData(cacheRef.current[cacheKey]);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchVolume(variable, time, controller.signal);
        
        let globalMin = Infinity;
        let globalMax = -Infinity;
        
        for (const depthSlice of response.values) {
          for (const row of depthSlice) {
            for (const val of row) {
              if (val < globalMin) globalMin = val;
              if (val > globalMax) globalMax = val;
            }
          }
        }
        
        const volumeData: VolumeData = {
          values: response.values,
          min: globalMin === Infinity ? 0 : globalMin,
          max: globalMax === -Infinity ? 1 : globalMax,
          depth: response.depth,
          time: response.time,
          variable: response.variable,
        };
        
        cacheRef.current[cacheKey] = volumeData;
        
        if (isMounted) {
          setData(volumeData);
          setLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // Ignore canceled requests
        }
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch volume');
          setData(null);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [variable, time]);

  return { data, loading, error };
}
