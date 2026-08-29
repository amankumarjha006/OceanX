import numpy as np
import xarray as xr
import pandas as pd

np.random.seed(42)

n_lat = 50
n_lon = 50
n_depth = 20
n_time = 24

latitude = np.linspace(5, 25, n_lat)
longitude = np.linspace(60, 80, n_lon)
depth = np.array([0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000], dtype=np.float32)
time = np.arange(n_time, dtype=np.int32)

lat_grid, lon_grid = np.meshgrid(latitude, longitude, indexing='ij')
lat0, lon0 = 15.0, 70.0

depth_decay_temp = np.exp(-depth / 200.0)
temp_surface = 28.0
temp_deep = 5.0
temp_profile = temp_deep + (temp_surface - temp_deep) * depth_decay_temp

lat_factor = 1.5 * (1 - (latitude - 5) / 20)

# Warm-core temperature anomaly at gyre center (15°N, 70°E)
# Gaussian in lat/lon, decaying with depth (e-folding ~200m like thermocline)
temp_anomaly_amp = 1.5  # °C
temp_anomaly_sigma = 6.0  # degrees
temp_anomaly_lonlat = temp_anomaly_amp * np.exp(-((lon_grid - lon0)**2 + (lat_grid - lat0)**2) / (2 * temp_anomaly_sigma**2))
temp_anomaly_depth = np.exp(-depth / 200.0)
temp_anomaly = temp_anomaly_lonlat[np.newaxis, np.newaxis, :, :] * temp_anomaly_depth[np.newaxis, :, np.newaxis, np.newaxis]

time_osc = 0.5 * np.sin(2 * np.pi * time / 24)

temperature = (temp_profile[np.newaxis, :, np.newaxis, np.newaxis] +
               lat_factor[np.newaxis, np.newaxis, :, np.newaxis] +
               time_osc[:, np.newaxis, np.newaxis, np.newaxis] +
               temp_anomaly)

salinity_base = 35.0
salinity_depth = 0.5 * (1 - np.exp(-depth / 500))
salinity_lat = 1.0 * (latitude - 5) / 20
salinity_time = 0.1 * np.sin(2 * np.pi * time / 24 + np.pi/4)

# Salinity anomaly: slightly higher away from gyre center (fresher at core due to upwelling)
# Gaussian dip at center, decaying with depth
sal_anomaly_amp = 0.25  # PSU
sal_anomaly_sigma = 6.0  # degrees
sal_anomaly_lonlat = sal_anomaly_amp * (1 - np.exp(-((lon_grid - lon0)**2 + (lat_grid - lat0)**2) / (2 * sal_anomaly_sigma**2)))
sal_anomaly_depth = np.exp(-depth / 200.0)
sal_anomaly = sal_anomaly_lonlat[np.newaxis, np.newaxis, :, :] * sal_anomaly_depth[np.newaxis, :, np.newaxis, np.newaxis]

salinity = (salinity_base +
            salinity_depth[np.newaxis, :, np.newaxis, np.newaxis] +
            salinity_lat[np.newaxis, np.newaxis, :, np.newaxis] +
            salinity_time[:, np.newaxis, np.newaxis, np.newaxis] +
            sal_anomaly)

dist_from_center = np.sqrt((lat_grid - lat0)**2 + (lon_grid - lon0)**2)
max_vel = 0.4
radius = 5.0
vel_magnitude = max_vel * (dist_from_center / radius) * np.exp(1 - dist_from_center / radius)
vel_magnitude = np.where(dist_from_center > 0, vel_magnitude, 0)

theta = np.arctan2(lat_grid - lat0, lon_grid - lon0)
u_surface = -vel_magnitude * np.sin(theta)
v_surface = vel_magnitude * np.cos(theta)

depth_decay_curr = np.exp(-depth / 200.0)

u_current = u_surface[np.newaxis, np.newaxis, :, :] * depth_decay_curr[np.newaxis, :, np.newaxis, np.newaxis]
u_current = np.repeat(u_current, n_time, axis=0)

v_current = v_surface[np.newaxis, np.newaxis, :, :] * depth_decay_curr[np.newaxis, :, np.newaxis, np.newaxis]
v_current = np.repeat(v_current, n_time, axis=0)

chl_surface = 1.0 + 1.0 * np.exp(-((lat_grid - 10)**2 + (lon_grid - 70)**2) / 25)
chl_depth_decay = np.exp(-depth / 50.0)
chl_time = 0.1 * np.sin(2 * np.pi * time / 24 + np.pi/2)

chlorophyll = (chl_surface[np.newaxis, np.newaxis, :, :] *
               chl_depth_decay[np.newaxis, :, np.newaxis, np.newaxis] *
               (1 + chl_time[:, np.newaxis, np.newaxis, np.newaxis]))

ds = xr.Dataset(
    {
        'temperature': (['time', 'depth', 'latitude', 'longitude'], temperature.astype(np.float32),
                        {'units': 'degrees_C', 'long_name': 'Sea Water Temperature', 'standard_name': 'sea_water_temperature'}),
        'salinity': (['time', 'depth', 'latitude', 'longitude'], salinity.astype(np.float32),
                     {'units': 'PSU', 'long_name': 'Sea Water Salinity', 'standard_name': 'sea_water_salinity'}),
        'u_current': (['time', 'depth', 'latitude', 'longitude'], u_current.astype(np.float32),
                      {'units': 'm/s', 'long_name': 'Eastward Current Velocity', 'standard_name': 'eastward_sea_water_velocity'}),
        'v_current': (['time', 'depth', 'latitude', 'longitude'], v_current.astype(np.float32),
                      {'units': 'm/s', 'long_name': 'Northward Current Velocity', 'standard_name': 'northward_sea_water_velocity'}),
        'chlorophyll': (['time', 'depth', 'latitude', 'longitude'], chlorophyll.astype(np.float32),
                        {'units': 'mg/m3', 'long_name': 'Chlorophyll Concentration', 'standard_name': 'mass_concentration_of_chlorophyll_in_sea_water'}),
    },
    coords={
        'time': (['time'], time, {'units': 'hours since 2024-01-01 00:00:00', 'long_name': 'Time', 'calendar': 'standard'}),
        'depth': (['depth'], depth, {'units': 'meters', 'long_name': 'Depth', 'positive': 'down', 'standard_name': 'depth'}),
        'latitude': (['latitude'], latitude, {'units': 'degrees_north', 'long_name': 'Latitude', 'standard_name': 'latitude'}),
        'longitude': (['longitude'], longitude, {'units': 'degrees_east', 'long_name': 'Longitude', 'standard_name': 'longitude'}),
    },
    attrs={
        'title': 'Synthetic Ocean Data for OCEANX Development',
        'source': 'SYNTHETIC - NOT REAL OBSERVATIONAL DATA',
        'institution': 'OCEANX Hackathon Prototype',
        'Conventions': 'CF-1.8',
        'history': 'Generated by generate_synthetic_data.py for development/testing only',
    }
)

output_path = 'demo_ocean.nc'
ds.to_netcdf(output_path)

print(f"Saved to {output_path}")
print(f"\nDimensions: {dict(ds.dims)}")
print(f"\nVariables:")
for var in ds.data_vars:
    v = ds[var]
    print(f"  {var}: shape={v.shape}, units={v.attrs.get('units')}, range=[{v.min().values:.3f}, {v.max().values:.3f}], mean={v.mean().values:.3f}")

print(f"\nDepth levels: {depth.tolist()}")
print(f"Time range: {time[0]} to {time[-1]} hours")
print(f"Lat range: {latitude[0]} to {latitude[-1]}°N")
print(f"Lon range: {longitude[0]} to {longitude[-1]}°E")