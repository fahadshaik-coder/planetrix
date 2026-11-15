# Preliminary scientific data source inventory

**Status: planning only.** These are possible authoritative catalogs to assess later;
PLANETREX does **not** currently call, download, authenticate to or validate any of them.
Links point to public entry pages and are not promises of a stable programmatic API.
Availability, licensing, metadata quality and spatial coverage must be checked per product.

| Body / topic | Candidate data source | Potential use / verification needed |
| --- | --- | --- |
| Earth — imagery, elevation, environment | [NASA Earthdata](https://www.earthdata.nasa.gov/) | Identify specific sensor, calibration, spatiotemporal coverage and access method. |
| Earth — multispectral scenes | [USGS EarthExplorer](https://earthexplorer.usgs.gov/) | Landsat/DEM products; assess resolution, masking and license. |
| Earth — cryosphere | [NSIDC](https://nsidc.org/data) | Ice, snow and frozen-ground datasets; check scientific appropriateness. |
| Earth — biodiversity observations | [GBIF](https://www.gbif.org/) | Biological occurrence records, *not* direct proof of habitability or biosignatures. |
| Moon — mission and orbital data | [NASA Planetary Data System](https://pds.nasa.gov/) | LRO and other archived products; validate producer, projection and version. |
| Moon — terrain | [LRO LOLA (PDS Geosciences)](https://pds-geosciences.wustl.edu/missions/lro/default.htm) | Potential lunar topography source; exact product selection pending. |
| Mars — imagery and topography | [NASA PDS](https://pds.nasa.gov/) | MRO, MGS and other archived products; coverage/product checks pending. |
| Moon/Mars — cartographic products | [USGS Astrogeology](https://astrogeology.usgs.gov/) | Planetary map products and reference-frame specifications. |
| Moon/Mars — complementary archives | [ESA Planetary Science Archive](https://archives.esac.esa.int/psa/) | Possible mission product coverage; product access and version checks pending. |

## Intended evaluation checklist for future steps

- Product citation, processing level, source and access terms.
- Spatial coverage, map resolution, coordinate frame, vertical datum and longitude convention.
- Temporal support, uncertainty, missing-value codes and cloud/shadow/quality flags.
- Calibration, derived/model status and whether comparisons across bodies are defensible.
- Download footprint, reproducibility, version pinning and checksums.
- Appropriate role: geological, terrain, thermal, water/ice, aeolian, biology,
  subsurface or exploration/engineering categories (some categories may have no
  defensible remotely sensed measurement at a given location).

No scientific measurements are present in Step 1.

## Implemented read-only source adapters (live-data phase)

- `GET /scientific/earth-events?limit=40` proxies **NASA EONET v3** open natural-event metadata and only plots the most recent **Point** geometry in Earth WGS 84 (EPSG:4326). EONET is an event aggregator, not a globally complete geological survey. Polygon-only events are omitted rather than assigned fictional coordinates. Event dates are observed/event timestamps, not guaranteed real-time measurements.
- `GET /scientific/planetary-products?target=moon|mars` searches **NASA PDS Search API** with a documented `target_name` query. Responses are archive product *metadata*; they are not point observations, geographic matches, or similarity percentages. PDS warns that API registry coverage can be incomplete.
- `GET /analogs?target=moon|mars` returns `[]` until a scientifically defined comparison job produces validated records.

No NASA credentials are required for these public endpoints. Requests are made only when API endpoints are visited; there is no background scan. Upstream network failures return `502` and never fall back to demo scores. No missing science values are replaced with zero. Public endpoint specs: https://eonet.gsfc.nasa.gov/docs/v3 and https://nasa-pds.github.io/pds-api/guides/search/endpoints.html.

**Verification limitation:** external DNS/network requests were blocked in the packaging environment, so live upstream responses are *not* verified here. Backend tests validate adapters against sample JSON and test the failure paths. Confirm both endpoints on a network-connected computer. Avoid interpreting an empty feed as evidence of absence of physical phenomena.
