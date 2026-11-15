# PLANETREX geographic discovery workflow (new build)

## What is implemented

The system now starts with a **global geographic search grid**, not a fixed list of named planetary analog sites. The world is tiled from -90° to +90° latitude and -180° to +180° longitude (WGS84), including ocean cells. All cells at a given search resolution are generated deterministically; no unknown area is deliberately skipped. The initial globe shows 72 cells of 30° × 30°. Clicking any one cell and selecting **Refine this region** generates a 3 × 3 finer grid (10° × 10°); users can repeat this process to 0.25° angular resolution. Cell sizes are measured in degrees and **are not equal-area**.

A cell is an *unassessed geographic search area*, never a scientifically identified analog. A selected cell can be sampled at its **center coordinate** against an external 90 m digital elevation model via the Open-Meteo elevation API. This yields a **point estimate** of elevation in meters, not average terrain, slope, geology, habitability, or similarity. Failed or missing observations are not filled with zeros. Point estimates are persisted in `data/results/discovery.sqlite3` and automatically recovered on subsequent visits. The backend limits a single sampling request to 100 points; this is not a background global data-harvesting engine. A global 30° grid fits in 72 samples; finer global sampling requires a locally hosted/downloaded dataset and batching infrastructure, not unrestricted use of public endpoints.

The Moon/Mars selector represents the **future comparison target only**. Neither mode invents feature similarity, reference region results, or evidence. The existing NASA PDS/EONET archive endpoints remain available but the new geographic scanner does not mistake event/archive metadata for discovered analogs.

## APIs

- `GET /health` — backend health.
- `GET /discovery/grid?step=30&south=-90&north=90&west=-180&east=180` — grid for all Earth regions in bounds. Maximum 600 cells per response.
- `POST /discovery/elevations` — request point elevations for 1–100 WGS84 coordinates. Returns nullable measurements plus source, retrieval time, units and method notes. Requires internet access; errors are reported as HTTP 502.
- `GET /discovery/observations` — locally persisted observations (most recent 3,000), for restoring previous samples.
- Existing `/scientific/*` endpoints remain available.

## Provenance and scientific limits

Open-Meteo Elevation API: https://open-meteo.com/en/docs/elevation-api , using Copernicus DEM 2021 GLO-90. Citation: https://doi.org/10.5270/ESA-c5d3d65 . Open-Meteo attribution and provider usage terms apply. Results can be model-derived and do not necessarily represent field observations. Point elevation alone does **not** measure or predict geological analog quality. No planetary feature normalization or similarity algorithm is implemented.

To genuinely discover previously unrecognized Earth–Moon/Mars analog locations, the next research phase must build (1) licensed worldwide gridded features for geology, terrain, climate, water and other scientific categories, (2) comparable planetary reference-region features with distinct coordinate systems and units, (3) rigorous missing-value and uncertainty handling, (4) a documented normalization and weighting system, (5) coarse-to-fine candidate ranking, field or remote validation, and (6) a reproducible versioned batch job. No missing-data result should be represented as a confirmed discovery.

## Troubleshooting

If the globe is blank, ensure `frontend/public/earth_naturalearth.jpg` was extracted and `http://127.0.0.1:5173/earth_naturalearth.jpg` loads. Unlike the previous app, the globe **does not depend on an external NASA texture URL**. The globe's panel has an explicit fixed viewport height; changing the data state no longer swaps between different globe layouts. Check browser developer console if WebGL is blocked or hardware acceleration is disabled.

If scanning elevation fails, check `http://127.0.0.1:8000/docs`, firewall/network access to the documented provider, and the displayed API error. The grid and 3D globe should continue working without the elevation provider.

This implementation has backend automated tests and source syntax checks. The developer execution environment could not install the frontend npm dependencies because the package registry was unreachable, so browser interactions and production bundle are not claimed to have passed. Run `npm install`, `npm test`, and `npm run build` on Windows to validate frontend behavior.
