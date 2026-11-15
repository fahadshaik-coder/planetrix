# PLANETREX architecture — Step 1

## Mission and current scope

PLANETREX will be a **batch scientific discovery** system for comparisons among Earth,
the Moon, and Mars. It aims to search *beyond known analog locations* on Earth.
Step 1 provides only application scaffolding, configuration, a liveness endpoint,
documentation, and tests. There is **no acquisition, comparison, scoring, scan, or UI**.

## Module boundaries

| Path | Future responsibility |
| --- | --- |
| `app/main.py` | Compose FastAPI and attach routers. Keep jobs out of import/startup. |
| `app/config.py` | Validate environment configuration and provider-specific settings. |
| `app/api/routes/` | Lightweight endpoints exposing validated persisted results and job status. |
| `app/collectors/` | Adapters for official remote catalogs and downloads; record citations, versions and acquisition metadata. |
| `app/processing/` | Validate units, masks, spatial reference systems, measurement validity, resampling and feature extraction. |
| `app/models/` | Explicit typed models for planetary regions, observations, uncertainties, completeness, provenance, and run manifests. |
| `app/similarity/` | Future normalization and interpretable feature-level distance methods, scientifically defined before any percentage is shown. |
| `app/discovery/` | Deterministic tiled global scan, coarse candidate screening and fine-scale follow-up. |
| `app/storage/` | Immutable raw-data metadata, versioned derived feature sets, persisted batch results and reproducibility manifests. |
| `data/raw/` | Original source payloads with externally recorded provenance; not committed to Git. |
| `data/processed/` | Derived measurements, spatial indexes and quality flags; not committed to Git. |
| `data/results/` | Batch run output and saved candidate rankings; not committed to Git. |
| `backend/tests/` | Unit/HTTP tests now; future scientific and integration tests. |

## Proposed future pipeline (design only)

1. Define dataset catalog entries (URI, provider, product, retrieval date, license, version, checksum, coverage and spatial resolution).
2. Ingest source observations into `raw/` without silently converting invalid or missing values.
3. Validate planetary body, coordinates, native map projection, vertical datum, units, uncertainties, nodata masks and source metadata.
4. Transform measurements into comparable *explicitly defined* feature representations. Record resolution changes and transformations.
5. Run reproducible, versioned coarse-to-fine Earth region selection against specified Moon/Mars reference regions.
6. After documented normalization, evaluate feature-level distances, completeness, uncertainty and evidence; write immutable run results.
7. Serve persisted results through the API, not by re-running the scientific processing on every HTTP request.

## Scientific invariants

- **Missing is not zero**: use nullable measurements plus validity/missingness reasons; never impute zero implicitly.
- **Measured vs modeled**: every value needs an observation type (measured, remotely sensed, inferred, modeled) and quality notes.
- **Units**: retain source units and explicit conversion history; future code should validate units dimensionally.
- **Planetary reference frames**: store the body and full CRS/projection/datum; Earth geographic coordinates cannot be silently treated as Moon/Mars coordinates.
- **Resolution and coverage**: record support area, sampling scale, temporal interval, and positional accuracy where available.
- **Comparability**: a similarity percentage is forbidden until normalization, feature weights, missing-data policy and calibration have been defined and tested.
- **Uncertainty and provenance**: trace every derived feature to source products and processing/algorithm versions, including quality masks.
- **Repeatability**: record run ID, run time, config, code revision, input checksums and processing versions; do not overwrite prior results.
- **No false scientific conclusions**: a high numerical resemblance need not establish geological origin, biological habitability, or mission suitability.

## Execution strategy (future)

A CLI or dedicated batch worker will process large geospatial tiles independently of HTTP
requests. Catalog metadata can be indexed separately from large raster arrays, and the
final API can read precomputed run summaries. Introduce heavy libraries, queues and a
database only after representative datasets and resource requirements are established.

## Step 1 HTTP contract

`GET /health` returns HTTP 200 and exactly:

```json
{"service":"PLANETREX","status":"healthy"}
```

This means the **API process** is responding. It does not indicate data-source
connectivity, scientific pipeline readiness, or database health.
