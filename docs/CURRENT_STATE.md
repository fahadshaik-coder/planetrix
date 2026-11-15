# PLANETREX — Verified development state (2026-11-15)

## Inspected origin

This is a preserved development copy of the earlier `PLANETREX_Foundation_Repair_Verified.zip` / extracted workspace. The user's original `C:\Users\pixel\OneDrive\Documents\PLANTREX` is not mounted and was not modified. Review and merge selectively before replacing any local work.

## Verified backend

- FastAPI health and geospatial grid endpoints.
- Existing NASA EONET and PDS catalog-metadata adapters (live external responses **not** tested).
- Existing stored point-elevation observations, read-only; public elevation-download route retired.
- New operator-only manual 3×3 DEM terrain batch process: nine real Open-Meteo/Copernicus DEM sample points per Earth grid center; output local slope and detrended roughness; validates missing/non-finite values.
- New SQLite profile store with body-specific coordinate conventions, sources, versions, observation type, raw units and nullable uncertainty.
- Import of externally verified Moon/Mars terrain reference profiles from JSON files.
- New **read-only** `/science/profiles` and `/science/candidates` APIs. The candidate API uses explicit two-feature normalized terrain distances, not similarity percentages, and excludes incomplete profiles.
- Dependency-free Earth exploration page served at `/explorer` with locally bundled image, plus preserved React/Three frontend with a scientific result panel.

## Actual tests and checks

- 25 automated backend tests passed in the execution environment (including mock-provider tests and formula sanity checks).
- `/health`, `/explorer`, `/explorer-assets/earth.jpg`, `/science/profiles` and `/discovery/grid` served successfully via FastAPI TestClient.
- Backend started and `/health` was accessed via a real local HTTP request (HTTP 200).
- 32 TypeScript/TSX source files passed syntax transpilation checks; that is **not** a TypeScript type-check or a verified frontend build.
- The React npm installation timed out/failed in the execution environment, so React browser behavior was **not** verified.
- A headless browser screenshot attempt for `/explorer` timed out, so visual behavior has **not** been confirmed even though its assets and HTML served successfully.
- Real remote DEM or NASA responses were **not** tested due limited network access.

## Still incomplete

- Verified planetary reference scientific measurements (none bundled) and correctly comparable lunar/Martian elevation profiles.
- Scientific scale/resolution equivalence tests, independent geoscience validation, uncertainty estimation.
- Genuine eight-domain global feature extraction and land-only coverage.
- Full Moon-first / Mars-first 3D planetary mapping with selectable reference regions (current globe shows Earth; target selection filters available references).
- Full indexed global discovery database, immutable versioned snapshots, publish/rollback workflow, and validated similarity percentages.

**This release is an operational backend and terrain screening pilot, not a scientifically verified global planetary analog discovery platform.**
