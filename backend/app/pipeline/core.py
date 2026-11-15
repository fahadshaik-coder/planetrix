"""Terrain research pilot: reproducible scientific profiles and evidence-safe comparison.

A 3x3 DEM point sample is NOT sufficient to characterize an entire large grid cell.
Calculations below describe only a local ~2 km stencil around a cell center.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import csv
import json
import math
import os
import sqlite3
from statistics import pstdev
from typing import Any

import httpx

from app.discovery.elevation import SOURCE_URL, SOURCE_NAME, SOURCE_CITATION

FEATURES = {"slope_deg": "degree", "residual_roughness_m": "m"}
# Comparison scales are *explicit engineering screening parameters* (not validated
# scientific equivalence or probabilistic similarity). Both are user-adjustable.
DEFAULT_SCALES = {"slope_deg": 5.0, "residual_roughness_m": 20.0}


def db_location() -> Path:
    override = os.environ.get("PLANETREX_PROFILE_DB")
    return Path(override) if override else Path(__file__).resolve().parents[3] / "data" / "results" / "profiles.sqlite3"


def connect(*, create: bool = True) -> sqlite3.Connection | None:
    path = db_location()
    if not create and not path.exists():
        return None
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.executescript('''
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY, body TEXT NOT NULL CHECK(body IN ('earth','moon','mars')),
      latitude REAL NOT NULL, longitude REAL NOT NULL,
      name TEXT NOT NULL, crs TEXT NOT NULL,
      resolution_m REAL, source_url TEXT NOT NULL,
      source_product TEXT NOT NULL, source_version TEXT NOT NULL,
      retrieved_at TEXT NOT NULL,
      observation_kind TEXT NOT NULL CHECK(observation_kind IN ('observed','modeled','derived')),
      feature_json TEXT NOT NULL,
      quality_note TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_body ON profiles(body);
    CREATE TABLE IF NOT EXISTS processing_runs (
      run_id TEXT PRIMARY KEY, started_at TEXT NOT NULL,
      method TEXT NOT NULL, parameters TEXT NOT NULL,
      count_ok INTEGER NOT NULL, count_missing INTEGER NOT NULL
    );
    ''')
    return connection


def validate_profile(record: dict[str, Any]) -> dict[str, Any]:
    """Reject guessed measurements and planet CRS mix-ups."""
    required = {"id", "body", "latitude", "longitude", "name", "crs", "source_url",
                "source_product", "source_version", "retrieved_at", "observation_kind", "features"}
    if required - record.keys():
        raise ValueError(f"Missing required fields: {sorted(required - record.keys())}")
    body = record["body"]
    if body not in ("earth", "moon", "mars"):
        raise ValueError("body must be earth, moon or mars")
    coords = (float(record["latitude"]), float(record["longitude"]))
    if not all(map(math.isfinite, coords)) or not (-90 <= coords[0] <= 90 and -180 <= coords[1] <= 180):
        raise ValueError("Invalid planetary coordinates")
    if body == "earth" and record["crs"] != "EPSG:4326":
        raise ValueError("Earth must use EPSG:4326 WGS84 in this pilot")
    if body != "earth" and (not str(record["crs"]).startswith(body.upper() + ":") or record["crs"] == "EPSG:4326"):
        raise ValueError("Moon/Mars reference must specify a distinct explicit body coordinate convention (MOON:... / MARS:...)")
    if record["observation_kind"] not in ("observed", "modeled", "derived"):
        raise ValueError("Invalid observation kind")
    for key in ("id", "name", "crs", "source_url", "source_product", "source_version", "retrieved_at"):
        if not isinstance(record[key], str) or not record[key].strip():
            raise ValueError(f"Missing nonempty provenance field {key}")
    if not str(record["source_url"]).startswith("https://"):
        raise ValueError("source_url must be an HTTPS source")
    features = record["features"]
    if not isinstance(features, dict) or not features:
        raise ValueError("At least one documented measured feature is required")
    if set(features) - set(FEATURES):
        raise ValueError("Unsupported feature names; do not mix incomparable quantities")
    normalized: dict[str, dict] = {}
    for name, reading in features.items():
        if not isinstance(reading, dict) or reading.get("unit") != FEATURES[name]:
            raise ValueError(f"{name} requires unit {FEATURES[name]}")
        value = reading.get("value")
        if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or value < 0:
            raise ValueError(f"Invalid measurement {name}")
        uncertainty = reading.get("uncertainty")
        if uncertainty is not None and (isinstance(uncertainty, bool) or not isinstance(uncertainty, (int,float)) or not math.isfinite(uncertainty) or uncertainty < 0):
            raise ValueError("Uncertainty must be a nonnegative number or null")
        normalized[name] = {"value": float(value), "unit": FEATURES[name], "uncertainty": uncertainty}
    clean = dict(record)
    clean["latitude"], clean["longitude"] = coords
    clean["features"] = normalized
    return clean


def save_profile(record: dict[str, Any]) -> None:
    r = validate_profile(record)
    with connect() as db:
        db.execute('''INSERT INTO profiles
        (id,body,latitude,longitude,name,crs,resolution_m,source_url,source_product,source_version,
         retrieved_at,observation_kind,feature_json,quality_note)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET body=excluded.body,latitude=excluded.latitude,
        longitude=excluded.longitude,name=excluded.name,crs=excluded.crs,resolution_m=excluded.resolution_m,
        source_url=excluded.source_url,source_product=excluded.source_product,
        source_version=excluded.source_version,retrieved_at=excluded.retrieved_at,
        observation_kind=excluded.observation_kind,feature_json=excluded.feature_json,quality_note=excluded.quality_note''',
        (r["id"],r["body"],r["latitude"],r["longitude"],r["name"],r["crs"],r.get("resolution_m"),
         r["source_url"],r["source_product"],r["source_version"],r["retrieved_at"],
         r["observation_kind"],json.dumps(r["features"],sort_keys=True),r.get("quality_note", "")))


def list_profiles(body: str, limit: int = 100, offset: int = 0) -> list[dict]:
    db = connect(create=False)
    if db is None: return []
    with db:
        rows = db.execute('SELECT * FROM profiles WHERE body=? ORDER BY id LIMIT ? OFFSET ?',
                          (body,limit,offset)).fetchall()
    return [decode(row) for row in rows]


def get_profile(profile_id: str) -> dict | None:
    db = connect(create=False)
    if db is None:return None
    with db:
        row = db.execute('SELECT * FROM profiles WHERE id=?',(profile_id,)).fetchone()
    return decode(row) if row else None


def decode(row: sqlite3.Row) -> dict:
    item = dict(row)
    item["features"] = json.loads(item.pop("feature_json"))
    return item


def compare(reference: dict, candidate: dict, scales: dict[str, float] | None = None) -> dict | None:
    """Return normalized distance, NOT a probability or similarity percentage.

    Require both terrain features; otherwise evidence is insufficient. This pilot
    uses fixed screening scales, explicitly exposed with every result.
    """
    if reference["body"] not in ("moon", "mars") or candidate["body"] != "earth":
        raise ValueError("Comparison requires one Moon/Mars reference and one Earth candidate")
    scales = scales or DEFAULT_SCALES
    if not all(name in reference["features"] and name in candidate["features"] for name in FEATURES):
        return None
    if set(scales) != set(FEATURES) or any(not isinstance(s,(float,int)) or s<=0 or not math.isfinite(s) for s in scales.values()):
        raise ValueError("Invalid comparison scales")
    diffs = {name: {
        "reference":reference["features"][name], "earth": candidate["features"][name],
        "absolute_difference":round(abs(reference["features"][name]["value"]-candidate["features"][name]["value"]),6),
        "normalized_difference":round(abs(reference["features"][name]["value"]-candidate["features"][name]["value"])/scales[name],6),
        "scale":scales[name], "unit":FEATURES[name]}
        for name in FEATURES}
    return {"reference_id":reference["id"],"earth_id":candidate["id"],
            "normalized_distance":round(sum(d["normalized_difference"] for d in diffs.values())/len(diffs),6),
            "feature_differences":diffs,"data_coverage":1.0,
            "similarity_percent":None,
            "scientific_status":"UNVALIDATED TERRAIN SCREENING; not a verified planetary analog",
            "caveats":"Only local terrain slope and detrended roughness; compare region scales, resolution and methodology before scientific use"}


def search(reference_id: str, limit: int = 50, offset: int = 0, scales: dict[str,float] | None = None) -> dict:
    reference = get_profile(reference_id)
    if reference is None: raise LookupError("Reference profile not found")
    if reference["body"] == "earth":raise ValueError("Reference must be Moon or Mars")
    results = []
    db = connect(create=False)
    if db:
        with db:
            rows = db.execute("SELECT * FROM profiles WHERE body='earth'").fetchall()
        for row in rows:
            result = compare(reference,decode(row),scales)
            if result is not None:results.append(result)
    results.sort(key=lambda r:(r["normalized_distance"],r["earth_id"]))
    return {"reference":reference,"total_comparable":len(results),"results":results[offset:offset+limit],
            "limit":limit,"offset":offset,"scoring":"Pilot two-feature normalized distance; lower is closer; NOT a similarity percentage",
            "missing_profiles_excluded":True}


def terrain_from_stencil(heights: list[float | None], spacing_m: float) -> dict[str,dict] | None:
    """Nine raster DEM samples, row-major: north-to-south, west-to-east.

    Fit a plane z=ax+by+c using the centered grid's least-squares gradient,
    then compute residual population std dev (not raw relief) in metres.
    """
    if len(heights) != 9 or any(h is None or isinstance(h,bool) or not isinstance(h,(int,float)) or not math.isfinite(h) for h in heights):
        return None
    if not math.isfinite(spacing_m) or spacing_m <= 0:raise ValueError("Invalid sample spacing")
    z = [float(h) for h in heights]
    x = [-1,0,1]*3
    y = [1]*3+[0]*3+[-1]*3
    mean_z = sum(z)/9
    a = sum(xx*zz for xx,zz in zip(x,z))/(6*spacing_m)
    b = sum(yy*zz for yy,zz in zip(y,z))/(6*spacing_m)
    slope = math.degrees(math.atan(math.hypot(a,b)))
    residuals=[zz-(mean_z+a*xx*spacing_m+b*yy*spacing_m) for xx,yy,zz in zip(x,y,z)]
    roughness=pstdev(residuals)
    return {"slope_deg":{"value":round(slope,6),"unit":"degree","uncertainty":None},
            "residual_roughness_m":{"value":round(roughness,6),"unit":"m","uncertainty":None}}


def point_stencil(latitude: float, longitude: float, spacing_m: float = 1000.0) -> list[dict]:
    """Approximate WGS84 local 3x3 stencil. Not valid within ~1.5 km of poles/antimeridian."""
    if abs(latitude)>89.98 or not(-180<=longitude<=180):
        raise ValueError("Stencil near poles is not supported")
    delta_lat = spacing_m/111_195.0
    delta_lon = spacing_m/(111_195.0*math.cos(math.radians(latitude)))
    if longitude-delta_lon < -180 or longitude+delta_lon > 180:
        raise ValueError("Stencil crossing antimeridian is not supported")
    return [{"latitude":latitude+dy*delta_lat,"longitude":longitude+dx*delta_lon}
            for dy in (1,0,-1) for dx in (-1,0,1)]


async def scan_earth_centers(cells: list[dict], spacing_m: float = 1000.0) -> dict:
    """Admin-only manual collection: never call this from public API requests.

    Fetch all 9 samples for each center, in provider-sized batches <=100.
    Persist only valid terrain profiles. Report incomplete cells separately.
    """
    if not 1<=len(cells)<=30:raise ValueError("Scan 1-30 cells per manual batch")
    if not 90<=spacing_m<=5000:raise ValueError("spacing_m must be 90..5000")
    coords=[]
    for cell in cells:
        coords.extend(point_stencil(cell["latitude"],cell["longitude"],spacing_m))
    heights=[]
    async with httpx.AsyncClient(timeout=30,follow_redirects=True) as client:
        for start in range(0,len(coords),100):
            part=coords[start:start+100]
            response=await client.get(SOURCE_URL,params={
                "latitude": ",".join(str(c["latitude"]) for c in part),
                "longitude": ",".join(str(c["longitude"]) for c in part)})
            response.raise_for_status()
            vals=response.json().get("elevation")
            if not isinstance(vals,list) or len(vals)!=len(part):
                raise ValueError("Upstream DEM response shape mismatch")
            heights.extend(vals)
    timestamp=datetime.now(timezone.utc).isoformat()
    success=[];missing=[]
    for index, cell in enumerate(cells):
        features=terrain_from_stencil(heights[index*9:index*9+9],spacing_m)
        if features is None:
            missing.append(cell["id"]);continue
        profile={"id":"earth:grid:"+cell["id"],"body":"earth","latitude":cell["latitude"],
                 "longitude":cell["longitude"],"name":"Grid center "+cell["id"],
                 "crs":"EPSG:4326","resolution_m":90,
                 "source_url":SOURCE_URL,"source_product":SOURCE_NAME,
                 "source_version":"Copernicus GLO-90 2021", "retrieved_at":timestamp,
                 "observation_kind":"derived","features":features,
                 "quality_note":f"9 DEM samples at {spacing_m}m spacing (~2km local stencil); not the entire angular grid cell. Uncertainty not estimated."}
        save_profile(profile);success.append(profile["id"])
    with connect() as db:
        db.execute('INSERT INTO processing_runs VALUES (?,?,?,?,?,?)',(
            timestamp, timestamp,'terrain_stencil_3x3',json.dumps({"spacing_m":spacing_m,"cells":[c["id"] for c in cells]}),
            len(success),len(missing)))
    return {"processed":len(success),"missing":missing,"profile_ids":success,"retrieved_at":timestamp,
            "scientific_status":"Local terrain properties only; not planetary analog matches"}


def import_reference(path: Path) -> dict:
    """Import only explicitly sourced Moon/Mars profiles; no bundled invented data."""
    record=json.loads(path.read_text(encoding="utf-8"))
    if record.get("body") not in ("moon","mars"):
        raise ValueError("Only Moon or Mars reference profiles may be imported")
    save_profile(record)
    return {"imported":record["id"],"source":record["source_url"]}
