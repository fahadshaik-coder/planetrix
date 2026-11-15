# PLANETREX — scientific pipeline, usage and scientific limits

## What this release genuinely does

The backend can generate geographic cells for any Earth coordinates, request a small 3×3 stencil of *modeled* DEM elevations around each chosen cell center, derive approximate local slope and plane-detrended roughness, and store each processed Earth **point-neighborhood** profile in SQLite. It does **not** characterize the whole geographic cell, identify rock types, or establish Moon/Mars similarity.

A locally controlled `import-reference` command can import a real Moon/Mars terrain feature profile whose values have been independently measured, documented and verified by the project operator. No planetary measurements are bundled. After importing a reference, a read-only API can retrieve ranked normalized terrain distances to all comparable stored Earth profiles. A normalized distance is **not a similarity percentage or confidence score**. This pilot is **not validated for planetary analog science**.

## Real scientific sources and provenance

- Open-Meteo elevation endpoint: https://open-meteo.com/en/docs/elevation-api; Copernicus DEM GLO-90 2021, 90 m resolution, modeled surface elevation. Official citation: https://doi.org/10.5270/ESA-c5d3d65. Samples are not direct field observations. Provider terms/licensing need review for intended use. The app saves the source, product, version and retrieval time.
- NASA PDS Search API: https://nasa-pds.github.io/pds-api/guides/search/endpoints.html. The existing catalog search returns **metadata**, not automatically interpreted terrain measurements; a separately verified lunar or Martian derived topographic profile is required for reference import.
- NASA EONET: https://eonet.gsfc.nasa.gov/docs/v3. Earth event locations are not planetary analog evidence.

The system does **not** automatically ingest planetary DEMs or geologic products. Missing NASA API data are not silently substituted.

## 1. Set up (Windows PowerShell)

Open a terminal in the extracted `planetrex` project folder:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
cd backend
..\.venv\Scripts\python.exe -m pytest -q
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

In a second terminal, after installing Node.js:

```powershell
cd <your-extracted-planetrex-folder>\frontend
npm install
npm run dev
```

Python-only explorer: http://127.0.0.1:8000/explorer; backend docs: http://127.0.0.1:8000/docs; optional React frontend: http://127.0.0.1:5173. The Python-only explorer displays a software-rendered, rotatable Earth sphere with local texture; no npm installation is required. The React frontend is not browser-verified in this environment.

## 2. Manually collect Earth DEM terrain around cell centers

Open **another** terminal in `planetrex\backend` and run:

```powershell
..\.venv\Scripts\python.exe -m app.pipeline.cli scan --south 10 --north 12 --west 76 --east 78 --step 1 --limit 4 --spacing-m 1000
```

This calls Open-Meteo for 9 nearby DEM sample points per cell, in requests of at most 100 points. Up to 30 geographic cells are allowed per manual run; limiting each operation avoids uncontrolled API traffic. Review provider service limits first. The cells are **geographic selection regions**; the resulting profiles describe approximately 2×2 km terrain around each center only. Geographic center positions may represent ocean, so a land mask remains necessary for global land-only coverage.

Output profiles are stored in `data/results/profiles.sqlite3` (excluded from Git and ZIP). Use `PLANETREX_PROFILE_DB` to override the path.

### Computing terrain features

The nine modeled elevation samples are arranged on a regularly spaced (approximately geographic) 3×3 stencil. A least-squares plane is fitted to the heights. Two derived features are recorded:

- `slope_deg`: arctangent of the magnitude of the fitted plane's horizontal height gradient, in degrees.
- `residual_roughness_m`: population standard deviation of elevation residuals after removing that fitted plane, in metres.

If any of the nine samples is invalid or missing, the entire derived profile is marked unavailable; missing data are never replaced with zero. The stencil approximation should not be used near the poles or anti-meridian. Neither feature has a quantified uncertainty yet; `uncertainty=null` is preserved.

## 3. Planetary reference import

PLANETREX does not ship fabricated Moon/Mars data. Create a UTF-8 JSON file **only after verifying an actual planetary terrain product and its associated region, units, methodology and spatial scale**. Structure:

```json
{
  "id": "your-reference-unique-id",
  "body": "moon",
  "latitude": 0.0,
  "longitude": 0.0,
  "name": "actual documented reference region name",
  "crs": "MOON:actual-documented-planetocentric-convention",
  "resolution_m": null,
  "source_url": "https://actual-official-product-url.example",
  "source_product": "actual source product identifier",
  "source_version": "actual product version",
  "retrieved_at": "2026-11-15T00:00:00Z",
  "observation_kind": "derived",
  "features": {
    "slope_deg": {"value": 0.0, "unit": "degree", "uncertainty": null},
    "residual_roughness_m": {"value": 0.0, "unit": "m", "uncertainty": null}
  },
  "quality_note": "Describe calculation method and surface extent"
}
```

**This block illustrates JSON structure only. `0.0` values are placeholders, NOT scientific measurements, and MUST be replaced with verified measured values; `source_url` is also a placeholder.** The relative topographic extent and method should match the Earth's 3×3 stencil, otherwise scientific interpretation is not justified. The code does not currently prove that they match. For Mars, use `body=mars` and a `MARS:` coordinate convention. Never pass Earth EPSG:4326 for Moon/Mars positions.

Save to an operator-controlled path; import from `backend` using:

```powershell
..\.venv\Scripts\python.exe -m app.pipeline.cli import-reference C:\path\to\verified-reference.json
```

Review imported values and provenance before drawing any conclusions. Although validation checks field presence, units, coordinate/body distinction and numeric finiteness, the code cannot authenticate external citations or physical comparability of independently prepared datasets.

## 4. Query the stored results

Read-only endpoints:

- `GET /science/profiles?body=earth` — stored sampled Earth terrain-neighborhood profiles
- `GET /science/profiles?body=moon` and `body=mars` — imported references
- `GET /science/profiles/{id}` — complete profile, measurements, provenance and source version
- `GET /science/candidates?reference_id=...&limit=50&offset=0` — comparable Earth profiles ranked by a pilot normalized terrain distance

The frontend's **SCIENTIFIC SCREENING** section shows these saved references and candidates, or clear empty states if none exist. User browsing does not trigger a dataset refresh. The old public `POST /discovery/elevations` route has been retired; the UI can only reload previously saved point observations.

### Distance definition

For each of the **two** features, the absolute value difference is divided by a screening scale. Current defaults: `slope_deg` / 5 degrees; `residual_roughness_m` / 20 metres. The returned `normalized_distance` is the mean of both normalized differences, lower meaning numerically closer under these declared thresholds. These 5° and 20 m values are **provisional engineering parameters, not a validated scientific normalization**. They can be changed only in backend code at present. A missing feature excludes a pair rather than silently reweighting it. The API returns `similarity_percent=null` and labels results `UNVALIDATED TERRAIN SCREENING`.

No comparison should be interpreted as scientific matching until relevant terrain resolution, support scale, measurement methods, uncertainties, normalizations, and external analog validation are independently established.

## 5. Remaining work before final scientific discovery claims

1. Select documented lunar and Martian reference DEM products and extract equivalent region-based features using appropriate planet CRS, scales and projection conventions.
2. Add a land/ocean mask and an equal-area global spatial tiling scheme; persist actual coverage counts, not just geographic grid coordinates.
3. Extract Earth terrain over **whole spatial patches**, not only 9 points. Document nodata and quality coverage.
4. Implement geology, mineralogy, environmental conditions, water/ice, surface processes, biology, subsurface, and engineering domains using validated sources and definitions.
5. Develop independently validated normalization and uncertainty handling. Calibrate any score to reference examples before calling it similarity.
6. Version immutable dataset inputs, processing code, QA outcomes and published snapshots; consider DuckDB/Parquet when larger raster-derived feature tables are available.
7. Complete and visually test the Moon-first and Mars region-selection globe interface. The present frontend is an Earth exploration prototype with target controls.
8. Test actual live DEM response and frontend production build on a machine with npm/network access; CI or automated browser testing is still needed.

## Scientific status

**Operational geographic/exploratory backend and deterministic terrain screening pilot, NOT a finished eight-category scientifically validated planetary analog discovery engine.**
