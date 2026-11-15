"""Mathematical sanity checks and integration tests for the evidence-safe pilot."""
import asyncio
import json
import math

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.pipeline import core


def sample_profile(body, id_, slope=2, rough=4):
    return {
        'id':id_,'body':body,'latitude':10.0,'longitude':20.0,
        'name':'Test input (not an actual discovery)',
        'crs':'EPSG:4326' if body=='earth' else 'MOON:planetocentric_positive_east_degrees',
        'source_url':'https://example.org/source','source_product':'unit-test-only',
        'source_version':'test-v1','retrieved_at':'2026-01-01T00:00:00Z',
        'observation_kind':'derived',
        'features':{'slope_deg':{'value':slope,'unit':'degree','uncertainty':None},
                    'residual_roughness_m':{'value':rough,'unit':'m','uncertainty':None}}
    }


def test_stencil_flat():
    result=core.terrain_from_stencil([100]*9,1000)
    assert result['slope_deg']['value']==0
    assert result['residual_roughness_m']['value']==0


def test_stencil_plane():
    # 100 m rise from W to E over 1km sample spacing -> atan(.1)
    values=[0,100,200]*3
    result=core.terrain_from_stencil(values,1000)
    assert result['slope_deg']['value']==pytest.approx(math.degrees(math.atan(.1)),abs=1e-5)
    assert result['residual_roughness_m']['value']==0


def test_stencil_missing_not_zero():
    assert core.terrain_from_stencil([5]*8+[None],1000) is None
    assert core.terrain_from_stencil([5]*8+[float('nan')],1000) is None


def test_different_bodies_and_units_rejected():
    record=sample_profile('moon','moon-1')
    record['crs']='EPSG:4326'
    with pytest.raises(ValueError,match='distinct'):core.validate_profile(record)
    record=sample_profile('earth','earth-1')
    record['features']['slope_deg']['unit']='m'
    with pytest.raises(ValueError,match='unit'):core.validate_profile(record)


def test_compare_math_and_insufficient_features():
    ref=core.validate_profile(sample_profile('moon','m',slope=12,rough=24))
    cand=core.validate_profile(sample_profile('earth','e',slope=7,rough=4))
    result=core.compare(ref,cand)
    assert result['normalized_distance']==1.0  # 5/5 and 20/20
    assert result['similarity_percent'] is None
    assert core.compare(ref,{**cand,'features':{'slope_deg':cand['features']['slope_deg']}}) is None


def test_storage_pagination_search_and_read_only_api(monkeypatch,tmp_path):
    monkeypatch.setenv('PLANETREX_PROFILE_DB',str(tmp_path/'profiles.sqlite3'))
    client=TestClient(app)
    assert client.get('/science/profiles?body=earth').json()['profiles']==[]
    assert not (tmp_path/'profiles.sqlite3').exists()
    core.save_profile(sample_profile('moon','lunar-1',slope=12,rough=24))
    core.save_profile(sample_profile('earth','earth-1',slope=7,rough=4))
    core.save_profile(sample_profile('earth','earth-2',slope=12,rough=24))
    assert client.get('/science/profiles?body=earth&limit=1').json()['count']==1
    results=client.get('/science/candidates?reference_id=lunar-1').json()
    assert results['total_comparable']==2
    assert [r['earth_id'] for r in results['results']]==['earth-2','earth-1']
    assert client.get('/science/candidates?reference_id=missing').status_code==404
    assert client.get('/science/profiles/lunar-1').json()['body']=='moon'
    assert client.post('/science/profiles',json={}).status_code==405


def test_import_requires_source(monkeypatch,tmp_path):
    monkeypatch.setenv('PLANETREX_PROFILE_DB',str(tmp_path/'db.sqlite3'))
    path=tmp_path/'reference.json'
    path.write_text(json.dumps(sample_profile('moon','imported')),encoding='utf8')
    assert core.import_reference(path)['imported']=='imported'
    assert core.get_profile('imported')['source_product']=='unit-test-only'


def test_mocked_provider_scan(monkeypatch,tmp_path):
    monkeypatch.setenv('PLANETREX_PROFILE_DB',str(tmp_path/'db.sqlite3'))
    class Response:
        def raise_for_status(self):pass
        def json(self):return {'elevation':[20.0]*9}
    class Client:
        def __init__(self,*args,**kwargs):pass
        async def __aenter__(self):return self
        async def __aexit__(self,*args):pass
        async def get(self,*args,**kwargs):return Response()
    monkeypatch.setattr(core.httpx,'AsyncClient',Client)
    result=asyncio.run(core.scan_earth_centers([{'id':'box','latitude':10,'longitude':20}]))
    assert result['processed']==1
    profile=core.get_profile('earth:grid:box')
    assert profile['features']['slope_deg']['value']==0
    assert profile['observation_kind']=='derived'
    assert '9 DEM' in profile['quality_note']


def test_dependency_free_explorer_served():
    client=TestClient(app)
    page=client.get('/explorer')
    assert page.status_code==200
    assert 'PLANETREX' in page.text
    assert 'Explore the Moon' in page.text
    assert client.get('/explorer-assets/earth.jpg').status_code==200
