import type { Variable, Dimensions, SliceResponse } from '../types/api';
import { MOCK_DIMENSIONS, MOCK_VARIABLES, generateMockSlice } from './mockData';

const BASE_URL = '/';
let forceMockMode = false;

export function setUseMockMode(useMock: boolean) {
  forceMockMode = useMock;
}

export function isUseMockMode(): boolean {
  return forceMockMode;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function checkBackendHealth(): Promise<boolean> {
  if (forceMockMode) return false;
  try {
    const res = await fetch(`${BASE_URL}`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchDimensions(): Promise<Dimensions> {
  if (forceMockMode) return MOCK_DIMENSIONS;
  try {
    return await fetchJson<Dimensions>('dimensions');
  } catch (err) {
    if (forceMockMode) return MOCK_DIMENSIONS;
    throw err;
  }
}

export async function fetchVariables(): Promise<Variable[]> {
  if (forceMockMode) return MOCK_VARIABLES;
  try {
    const data = await fetchJson<{ variables: Variable[] }>('variables');
    return data.variables;
  } catch (err) {
    if (forceMockMode) return MOCK_VARIABLES;
    throw err;
  }
}

export async function fetchSlice(variable: string, depth: number, time: number): Promise<SliceResponse> {
  if (forceMockMode) return generateMockSlice(variable, depth, time);
  try {
    return await fetchJson<SliceResponse>(`slice?variable=${encodeURIComponent(variable)}&depth=${depth}&time=${time}`);
  } catch (err) {
    if (forceMockMode) return generateMockSlice(variable, depth, time);
    throw err;
  }
}