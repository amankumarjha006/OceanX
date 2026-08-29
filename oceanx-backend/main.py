import xarray as xr
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="OCEANX Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ds: xr.Dataset = None


@app.on_event("startup")
async def load_dataset():
    global ds
    ds = xr.open_dataset("demo_ocean.nc")


@app.get("/")
async def root():
    return {"status": "ok", "message": "OCEANX backend running"}


@app.get("/variables")
async def get_variables():
    variables = []
    for name, var in ds.data_vars.items():
        variables.append({
            "name": name,
            "units": var.attrs.get("units", ""),
            "long_name": var.attrs.get("long_name", ""),
            "standard_name": var.attrs.get("standard_name", ""),
        })
    return {"variables": variables}


@app.get("/dimensions")
async def get_dimensions():
    depth_vals = ds["depth"].values.tolist()
    time_vals = list(range(len(ds["time"])))
    lat_vals = ds["latitude"].values.tolist()
    lon_vals = ds["longitude"].values.tolist()

    return {
        "latitude": {
            "min": float(lat_vals[0]),
            "max": float(lat_vals[-1]),
            "size": len(lat_vals),
            "values": lat_vals,
        },
        "longitude": {
            "min": float(lon_vals[0]),
            "max": float(lon_vals[-1]),
            "size": len(lon_vals),
            "values": lon_vals,
        },
        "depth": {
            "min": float(depth_vals[0]),
            "max": float(depth_vals[-1]),
            "size": len(depth_vals),
            "values": depth_vals,
        },
        "time": {
            "min": time_vals[0],
            "max": time_vals[-1],
            "size": len(time_vals),
            "values": time_vals,
            "units": "hours since 2024-01-01 00:00:00",
        },
    }


@app.get("/slice")
async def get_slice(
    variable: str = Query(..., description="Variable name (e.g., temperature)"),
    depth: float = Query(..., description="Depth in meters"),
    time: int = Query(..., description="Time index (0-23)"),
):
    if variable not in ds.data_vars:
        raise HTTPException(
            status_code=400,
            detail=f"Variable '{variable}' not found. Available: {list(ds.data_vars.keys())}",
        )

    var_data = ds[variable]

    depth_min, depth_max = float(ds["depth"].min()), float(ds["depth"].max())
    time_min, time_max = 0, len(ds["time"]) - 1

    if depth < depth_min or depth > depth_max:
        raise HTTPException(
            status_code=400,
            detail=f"Depth {depth} out of range [{depth_min}, {depth_max}]",
        )
    if time < time_min or time > time_max:
        raise HTTPException(
            status_code=400,
            detail=f"Time index {time} out of range [{time_min}, {time_max}]",
        )

    selected = var_data.sel(depth=depth, method="nearest").isel(time=time)

    actual_depth = float(selected.depth.values)
    actual_time = int(time)

    return {
        "variable": variable,
        "depth": actual_depth,
        "time": actual_time,
        "latitude": selected.latitude.values.tolist(),
        "longitude": selected.longitude.values.tolist(),
        "values": selected.values.tolist(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)