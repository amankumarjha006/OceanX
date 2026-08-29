import type { Dimensions, Variable, SliceResponse, VolumeResponse } from '../types/api';

export const MOCK_VARIABLES: Variable[] = [
  {
    name: 'temperature',
    units: '°C',
    long_name: 'Sea Water Temperature',
    standard_name: 'sea_water_temperature',
  },
  {
    name: 'salinity',
    units: 'PSU',
    long_name: 'Sea Water Salinity',
    standard_name: 'sea_water_salinity',
  },
  {
    name: 'u_current',
    units: 'm/s',
    long_name: 'Eastward Sea Water Velocity',
    standard_name: 'eastward_sea_water_velocity',
  },
  {
    name: 'v_current',
    units: 'm/s',
    long_name: 'Northward Sea Water Velocity',
    standard_name: 'northward_sea_water_velocity',
  },
  {
    name: 'chlorophyll',
    units: 'mg/m³',
    long_name: 'Mass Concentration of Chlorophyll in Sea Water',
    standard_name: 'mass_concentration_of_chlorophyll_in_sea_water',
  },
];

const DEPTH_VALUES = [
  0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000
];

const LAT_VALUES = Array.from({ length: 50 }, (_, i) => 5 + (i * 20) / 49);
const LON_VALUES = Array.from({ length: 50 }, (_, i) => 60 + (i * 20) / 49);

export const MOCK_DIMENSIONS: Dimensions = {
  latitude: {
    min: 5.0,
    max: 25.0,
    size: 50,
    values: LAT_VALUES,
  },
  longitude: {
    min: 60.0,
    max: 80.0,
    size: 50,
    values: LON_VALUES,
  },
  depth: {
    min: 0.0,
    max: 1000.0,
    size: 20,
    values: DEPTH_VALUES,
  },
  time: {
    min: 0,
    max: 23,
    size: 24,
    values: Array.from({ length: 24 }, (_, i) => i),
    units: 'hours since 2024-01-01 00:00:00',
  },
};

export function generateMockSlice(variable: string, depth: number, time: number): SliceResponse {
  const numLat = 50;
  const numLon = 50;
  const values: number[][] = [];

  const depthFactor = Math.exp(-depth / 300);
  const timeFactor = Math.sin((time / 24) * 2 * Math.PI);

  for (let r = 0; r < numLat; r++) {
    const row: number[] = [];
    const lat = LAT_VALUES[r];
    for (let c = 0; c < numLon; c++) {
      const lon = LON_VALUES[c];
      let val = 0;

      if (variable === 'temperature') {
        const baseTemp = 28 - (lat - 5) * 0.2;
        const deepTemp = 4;
        const tempRange = baseTemp - deepTemp;
        val = deepTemp + tempRange * depthFactor + 0.5 * timeFactor;
        val += Math.sin((lat / 5) + (lon / 10)) * 1.2;
      } else if (variable === 'salinity') {
        val = 35.0 + 0.5 * (1 - depthFactor) + 0.3 * Math.sin(lat / 4) + 0.1 * timeFactor;
      } else if (variable === 'u_current') {
        val = 0.4 * depthFactor * Math.sin((lat - 15) * 0.3) + 0.05 * timeFactor;
      } else if (variable === 'v_current') {
        val = 0.4 * depthFactor * Math.cos((lon - 70) * 0.3) + 0.05 * timeFactor;
      } else if (variable === 'chlorophyll') {
        val = Math.max(0, (1.8 * Math.exp(-depth / 50)) * (1 + 0.2 * Math.sin(lat / 3)) + 0.05 * timeFactor);
      } else {
        val = 10 + 5 * Math.sin(lat + lon);
      }

      row.push(Number(val.toFixed(3)));
    }
    values.push(row);
  }

  return {
    variable,
    depth,
    time,
    latitude: LAT_VALUES,
    longitude: LON_VALUES,
    values,
  };
}

export function generateMockVolume(variable: string, time: number): VolumeResponse {
  const volumeValues: number[][][] = [];
  
  for (let d = 0; d < DEPTH_VALUES.length; d++) {
    const depth = DEPTH_VALUES[d];
    const slice = generateMockSlice(variable, depth, time);
    volumeValues.push(slice.values);
  }

  return {
    variable,
    time,
    depth: DEPTH_VALUES,
    latitude: LAT_VALUES,
    longitude: LON_VALUES,
    values: volumeValues,
  };
}
