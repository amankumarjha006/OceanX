export interface Variable {
  name: string;
  units: string;
  long_name: string;
  standard_name: string;
}

export interface Dimensions {
  latitude: {
    min: number;
    max: number;
    size: number;
    values: number[];
  };
  longitude: {
    min: number;
    max: number;
    size: number;
    values: number[];
  };
  depth: {
    min: number;
    max: number;
    size: number;
    values: number[];
  };
  time: {
    min: number;
    max: number;
    size: number;
    values: number[];
    units: string;
  };
}

export interface SliceResponse {
  variable: string;
  depth: number;
  time: number;
  latitude: number[];
  longitude: number[];
  values: number[][];
}

export interface VolumeResponse {
  variable: string;
  time: number;
  depth: number[];
  latitude: number[];
  longitude: number[];
  values: number[][][]; // [depthIndex][latIndex][lonIndex]
}