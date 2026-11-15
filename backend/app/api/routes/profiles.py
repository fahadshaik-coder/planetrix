"""Scientific endpoints: verified Moon/Mars references, live Copernicus DEM queries,
and multi-domain experiment suitability analysis for Earth analog sites.
"""
from typing import Literal
from fastapi import APIRouter, HTTPException, Query
from app.pipeline.core import get_profile, list_profiles, search
from app.pipeline.scientific_engine import (
    ensure_scientific_database_initialized,
    search_analog_matches_for_reference,
    fetch_live_copernicus_dem_metrics,
    VERIFIED_MOON_REFERENCES,
    VERIFIED_MARS_REFERENCES,
    EXPERIMENT_DOMAINS,
)

router = APIRouter(prefix='/science', tags=['Stored scientific profiles'])


@router.get('/references')
def list_references(body: Literal['moon', 'mars']) -> dict:
    """Return verified planetary reference regions with LRO LOLA / MOLA scientific metrics."""
    ensure_scientific_database_initialized()
    refs = VERIFIED_MOON_REFERENCES if body == 'moon' else VERIFIED_MARS_REFERENCES
    return {
        'body': body,
        'count': len(refs),
        'references': refs,
        'provenance': 'NASA LRO LOLA / MOLA & HiRISE official topography products',
    }


@router.get('/experiments')
def list_experiment_domains() -> list[dict]:
    """Return the 5 core mission experiment domains and ideal terrain parameters."""
    return EXPERIMENT_DOMAINS


@router.get('/analog-matches')
def get_analog_matches(reference_id: str, limit: int = Query(15, ge=1, le=50)) -> dict:
    """Find and rank Earth analog locations for a selected Moon/Mars reference site,
    complete with 5-domain experiment suitability evaluations."""
    try:
        return search_analog_matches_for_reference(reference_id, limit)
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get('/live-terrain')
async def get_live_terrain(
    latitude: float = Query(..., ge=-89.9, le=89.9),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    spacing_m: float = Query(1000.0, ge=90.0, le=5000.0),
) -> dict:
    """Query live Copernicus 90m DEM (Open-Meteo API) for actual physical elevation, slope, and roughness."""
    try:
        return await fetch_live_copernicus_dem_metrics(latitude, longitude, spacing_m)
    except Exception as exc:
        raise HTTPException(502, f"Live Copernicus DEM query failed: {exc}") from exc


@router.get('/profiles')
def profiles(body: Literal['earth', 'moon', 'mars'], limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)) -> dict:
    items = list_profiles(body, limit, offset)
    return {'body': body, 'profiles': items, 'count': len(items), 'source': 'local stored data only'}


@router.get('/profiles/{profile_id:path}')
def profile(profile_id: str) -> dict:
    item = get_profile(profile_id)
    if item is None:
        raise HTTPException(404, 'Stored profile not found')
    return item


@router.get('/candidates')
def candidates(reference_id: str, limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)) -> dict:
    try:
        return search(reference_id, limit, offset)
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
