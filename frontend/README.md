# PLANETREX — Earth-wide discovery explorer

The **new default interface is Global Discovery**, not a preloaded list of known Earth analog sites and not a live NASA events feed. It renders a bundled Earth map, tiles Earth into geographic search areas, allows repeated regional refinement, and requests real DEM point elevations where supported. No similarity scores are invented.

## Run on Windows (Command Prompt)

From the extracted `planetrex` folder, start the backend in Terminal 1:

```cmd
py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

In Terminal 2, from the extracted `planetrex` folder:

```cmd
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173/ . The API documentation is at http://127.0.0.1:8000/docs . Run `npm test` and `npm run build` in the frontend directory to check the local installation.

## What the controls do

- Switch Moon/Mars: future comparison target, **not a switch to an already-computed ranking**.
- Choose a grid point: select a previously unassessed Earth geographic region.
- Refine region: inspect 3 × 3 smaller cells across the entire selected area.
- Back / Whole Earth: navigate geographic search levels.
- Sample real terrain elevations: query an external digital elevation model for **cell-center** coordinates, not entire cells. Results are saved by the backend to SQLite and restored on reload.
- Search and filter: search geographic coordinate labels and filter measurement status.

The image `public/earth_naturalearth.jpg` is a bundled **stylized physical Earth map** with oceans and continents, not a scientific data layer. It is provided for visual geographic orientation and should not be used to infer measurements. See `../docs/discovery_workflow.md` for scientific limitations and provider citations.

Previous prototype components and demonstration data files are retained in `src/` for reference, but they are no longer rendered by the default application.
