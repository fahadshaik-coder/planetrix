# PLANETREX — fixed system blueprint

## Problem

Identify **Earth regions not restricted to preselected known analog sites** whose observed, modeled or inferred scientific properties measurably resemble *a chosen spatial region* of the Moon or Mars. Each result must be reproducible, evidence-backed and appropriate for a stated scientific or engineering purpose.

## Non-negotiable separation

**Batch scientific backend** (developer-controlled; 3×3 DEM terrain pilot now implemented): science source audit → dataset downloads → raw preservation → validated standardized feature profiles → regional scientific comparisons → versioned results.

**Public API** (read-only scientific profile/ranking operations now implemented): returns saved reference profiles, Earth candidates, geographic coverage, feature differences, completeness, uncertainty and source references. It **never** silently launches global scans or downloads huge datasets when a public viewer opens a page.

**Frontend** (planned Moon-first): Moon globe → select mapped lunar region → request saved comparison results → Earth globe and paginated candidate list → evidence details. Mars has the same workflow. A region with insufficient measurements returns an explicit 'not evaluated' state.

## Future scientific feature groups

1. Geology/mineralogy and surface materials
2. Topography and terrain properties
3. Temperature and illumination
4. Water/ice and resources
5. Dust, wind, erosion and surface processes
6. Biology and habitability indicators
7. Subsurface terrain and structures
8. Mobility, landing and exploration engineering context

A category may remain missing; missing is never treated as zero. A score cannot be generated from a category without comparable measurements and a justified normalization method.

## Geographic screening design

1. Use appropriate **Earth land masks and geographic cells** with documented area and dataset coverage; the existing 30° latitude/longitude grid is only a prototype and not equal-area.
2. Build stored feature profiles at meaningful regional support scales. Do not equate an isolated point sample with a cell average or a full terrain model.
3. Define a specific Moon/Mars reference region in its own planetary CRS and a documented comparison scale.
4. Search the full set of **eligible processed Earth regions**; use spatial and numerical indexes for efficiency.
5. Coarsely screen first and refine with higher-resolution evidence; retain low-ranked and not-evaluated regions for completeness.
6. Persist evidence-backed comparisons with run/version identifiers; never store fabricated science scores.

## Planned persistent records

- **Dataset manifest**: provider, product ID, version, license, source URL, checksum, retrieval time, body, CRS/datum, resolution, temporal coverage, units and nodata semantics.
- **Region**: body, unique ID, geometry/CRS, support scale, geographic coverage and feature extraction version.
- **Measurement**: region ID, definition, value/null, unit, observation type, uncertainty, quality flags, source manifest reference, original spatial support.
- **Comparison**: reference region, Earth region, feature differences, definition/normalization version, missing-data policy, completeness, uncertainty, optional calibrated score.
- **Snapshot**: code revision, input manifest checksums, run configuration, validation outcomes and published version.

Suggested future scientific storage: Parquet for extracted features plus DuckDB for indexed analysis if real workloads warrant them. Keep existing SQLite point-sample storage separate as a prototype; no migration to DuckDB is claimed yet.

## Phase order

| Phase | Goal | Status in this package |
|---|---|---|
| 1 | Inspect, test, repair existing foundation | **Repaired and tested from source archive**; Windows folder not inspected |
| 2 | Verify official scientific datasets/products | **Docs reviewed for some APIs**, scientific source audit incomplete |
| 3 | Retrieve and validate actual scientific files | Not yet implemented |
| 4 | Standardize planetary feature definitions | Not yet implemented |
| 5 | Earth land grid and real multi-feature extraction | Geographic prototype only |
| 6 | Versioned scientific storage | Not yet implemented |
| 7 | Normalization and validated similarity | Not yet implemented |
| 8 | Analog candidate discovery and search | Not yet implemented |
| 9 | Cached ranked result APIs | Not yet implemented |
| 10 | Authorized manual dataset refresh | Not yet implemented |
| 11 | Moon-first/Mars-first reference selection UI | Not yet implemented |
| 12 | End-to-end scientific and browser verification | Not yet implemented |

## Acceptance criteria before claiming 'discovered an analog'

- Earth and reference-region features have documented scientific equivalence, scale and reference frames.
- Original source products and units are traceable; missing or unsupported features stay missing.
- Numerical normalizations, weights, applicability and uncertainty are defined and independently tested.
- Candidate results are reproducible from a recorded input snapshot.
- New-candidate claims are compared with existing scientific literature and validated independently.

Until then, the system is a **geographic/scientific exploration prototype**, not a validated discovery platform.

## Latest implementation status

See `CURRENT_STATE.md` and `SCIENTIFIC_PIPELINE.md` for the verified working terrain pilot, the manual CLI, the read-only candidate API, and the Python-served `/explorer` interface. The earlier phase table describes the **full scientific goal** rather than all pilot implementation details; it should not be mistaken for completed eight-domain discovery.
