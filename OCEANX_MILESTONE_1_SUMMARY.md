# OCEANX Milestone 1 — Data Pipeline Complete

## Overview
Built a 3-step backend pipeline for a browser-based 3D ocean analysis platform:
1. Environment setup with Python venv and dependencies
2. Synthetic NetCDF dataset generation (`demo_ocean.nc`)
3. FastAPI backend with `/slice`, `/variables`, `/dimensions` endpoints

All endpoints tested and working.

---

## Project Structure
```
oceanx-backend/
├── requirements.txt
├── generate_synthetic_data.py
├── main.py
├── demo_ocean.nc          # 24×20×50×50 = 1.2M data points per variable
└── venv/                  # Python 3.11+ virtual environment
```

---

## Step 1: Environment Setup
**Created:**
- `oceanx-backend/` directory
- Python virtual environment (`venv/`)
- `requirements.txt` with: fastapi, uvicorn[standard], xarray, netCDF4, numpy, pandas, python-multipart
- Verified all imports work

---

## Step 2: Synthetic NetCDF Generation
**Script:** `generate_synthetic_data.py`

### Dimensions
| Dimension | Range | Points | Notes |
|-----------|-------|--------|-------|
| latitude | 5°N → 25°N | 50 | Evenly spaced |
| longitude | 60°E → 80°E | 50 | Evenly spaced |
| depth | 0 → 1000m | 20 | Non-uniform: denser near surface [0,5,10,20,30,50,75,100,125,150,200,250,300,400,500,600,700,800,900,1000] |
| time | 0 → 23 hrs | 24 | Hourly steps |

### Variables (shape: time, depth, lat, lon)
| Variable | Range | Description |
|----------|-------|-------------|
| temperature | ~5–30°C | Realistic thermocline: 28°C surface → 5°C at 1000m, warmer near equator, diurnal ±0.5°C oscillation |
| salinity | 34.9–36.5 PSU | Base 35 PSU, slight depth increase, lat gradient, small time variation |
| u_current | -0.4 to 0.4 m/s | Clockwise gyre centered at 15°N, 70°E, exponential depth decay |
| v_current | -0.4 to 0.4 m/s | Gyre companion, same pattern |
| chlorophyll | 0–2.2 mg/m³ | Surface peak near 10°N/70°E, exponential decay with depth (50m scale), ±10% time variation |

### Metadata (CF-1.8 conventions)
- Per-variable: `units`, `long_name`, `standard_name`
- Global: `source="SYNTHETIC - NOT REAL OBSERVATIONAL DATA"`, `institution="OCEANX Hackathon Prototype"`

---

## Step 3: FastAPI Backend
**File:** `main.py`

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check: `{"status": "ok", "message": "OCEANX backend running"}` |
| `/variables` | GET | List all variables with units, long_name, standard_name |
| `/dimensions` | GET | Lat/lon/depth/time ranges and values for frontend sliders |
| `/slice` | GET | Extract 2D slice: `?variable=temperature&depth=250&time=5` |

### `/slice` Parameters
- `variable` (required): One of temperature, salinity, u_current, v_current, chlorophyll
- `depth` (float): Target depth in meters — uses nearest depth level
- `time` (int): Time index 0–23 — uses exact index

### `/slice` Response
```json
{
  "variable": "temperature",
  "depth": 250.0,
  "time": 5,
  "latitude": [...],      // 50 values
  "longitude": [...],     // 50 values
  "values": [[...]]       // 50×50 2D array [lat][lon]
}
```

### Error Handling (400)
- Invalid variable → lists available
- Depth out of range [0, 1000]
- Time index out of range [0, 23]

### CORS
Enabled for all origins (`allow_origins=["*"]`)

---

## Verification Results

### Server Start
```bash
cd oceanx-backend && venv/Scripts/python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Test Commands & Responses

**1. Health Check**
```bash
curl http://localhost:8000/
# {"status":"ok","message":"OCEANX backend running"}
```

**2. Variables**
```bash
curl http://localhost:8000/variables
# Returns 5 variables with full metadata
```

**3. Dimensions**
```bash
curl http://localhost:8000/dimensions
# Returns lat/lon/depth/time ranges, sizes, and coordinate arrays
```

**4. Slice — Temperature at 250m, time=5**
```bash
curl "http://localhost:8000/slice?variable=temperature&depth=250&time=5"
```
- Returns 50×50 grid
- Values range ~12.1–13.6°C (physically sane: cooler at higher latitudes, ~13°C at 250m)
- Actual depth used: 250.0m (exact match in dataset)
- Actual time used: 5 (0-indexed)

**5. Error Cases**
```bash
curl "http://localhost:8000/slice?variable=invalid&depth=250&time=5"
# 400: Variable 'invalid' not found. Available: [...]

curl "http://localhost:8000/slice?variable=temperature&depth=2000&time=5"
# 400: Depth 2000.0 out of range [0.0, 1000.0]

curl "http://localhost:8000/slice?variable=temperature&depth=250&time=30"
# 400: Time index 30 out of range [0, 23]
```

---

## Next Steps (Milestone 2)
- Frontend: Three.js / React 3D globe visualization
- Depth/time sliders consuming `/dimensions`
- Color-mapped slice rendering from `/slice`
- Multi-variable comparison view