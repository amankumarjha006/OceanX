import { useState, useEffect, useCallback } from 'react';
import { fetchSlice } from '../api/backend';

interface SliceData {
  values: number[][];
  min: number;
  max: number;
  depth: number;
  time: number;
}

export function useSlice(variable: string, depth: number, time: number) {
  const [data, setData] = useState<SliceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSlice(variable, depth, time);
      const flatValues = response.values.flat();
      const min = Math.min(...flatValues);
      const max = Math.max(...flatValues);
      setData({
        values: response.values,
        min,
        max,
        depth: response.depth,
        time: response.time,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch slice');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [variable, depth, time]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}