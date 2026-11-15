# PLANETREX — Moon-first/Mars-to-Earth interaction

## What the application actually does

1. **Starts on a Moon globe.** Its labeled mission-site points come from `GET /exploration/sites?body=moon`; custom Moon coordinates can be selected by clicking any visible part of the globe.
2. **Mars selection.** The top navigation switches the globe and labeled landing sites to Mars (`GET /exploration/sites?body=mars`). The Moon and Mars illustrations are local synthetic *visual textures*, not NASA scientific imagery or measurement rasters.
3. **Selecting a region transitions to Earth.** The selected planetary body, location and geographic coordinates are retained in application state. Earth is displayed with clickable points and an accompanying list.
4. **If source-backed reference terrain features have been imported for the selected location**, the interface fetches stored candidate comparisons from `GET /science/candidates?reference_id=...`. These are **unvalidated normalized terrain distances** (not a similarity percentage, not a confirmed discovery).
5. **If no comparable reference is imported**, it shows processed Earth profiles when any exist; otherwise it shows 72 **unassessed** geographic grid cells. Nothing is presented as a scientific match. Users can click Earth points or list entries to focus the globe and view details.
6. **Back to Moon/Mars** returns to the planetary site selection screen. A change of planetary mode resets the selection to avoid stale Earth data.

## Important limitations

- Documented mission-site locations are **navigation anchors** only. Their existence does not imply a measured terrain profile or a terrestrial analog.
- The two-feature slope/roughness screening pipeline in `backend/app/pipeline` only works after *real* Earth DEM profiles and verified Moon/Mars reference features have been imported; see `SCIENTIFIC_PIPELINE.md`.
- The approximate country labels on the default Earth cell view were computed offline from the public-domain **Natural Earth 1:110m country polygons** at each grid center. These are *center-point labels*, not precise addresses or discovered sites; ocean cells remain unassessed.
- Custom Moon/Mars selections are navigational requests: creating scientifically justified matches for those arbitrary regions requires actual measured source products to be ingested at the selected region and spatial scale.
- The rendering is a lightweight interactive textured sphere in an HTML canvas, **not** scientific GIS-grade planetary mapping. Replacing it with vetted mission-derived planetary basemaps is a later step.
- The Python-served `/explorer` interface is the canonical UI. The preserved React/Vite frontend at port 5173 embeds this exact page via a backend proxy, avoiding two contradictory frontends.
- Tests verify FastAPI responses and static files; browser visual interactions could not be run due to local browser access restrictions in the execution environment.

## Local Windows PowerShell commands

From the **extracted `planetrex` folder**, not from a parent `TEST` folder:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
cd backend
..\.venv\Scripts\python.exe -m pytest -q
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Open <http://127.0.0.1:8000/explorer>.

Optional React/Vite wrapper (requires backend already running): from `planetrex/frontend`, run `npm install` and `npm run dev` and open <http://127.0.0.1:5173/>.

## Provenance for site navigation labels

- NASA NSSDC Apollo lunar landing site coordinates: <https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html>
- NASA Mars 2020 Jezero crater landing coordinates: <https://ntrs.nasa.gov/citations/20210024644>
- NASA Curiosity Gale crater location: <https://mars.nasa.gov/internal_resources/698/>
- NASA Mars mission site descriptions linked from each site in the explorer
- Natural Earth world admin country polygons: <https://www.naturalearthdata.com/about/terms-of-use/>

These URLs are attribution for geographic navigation—not evidence of cross-planet similarity.
