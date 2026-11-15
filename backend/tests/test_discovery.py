from fastapi.testclient import TestClient
from app.main import app
from app.discovery.grid import Bounds, make_grid
from app.discovery import elevation

client = TestClient(app)


def test_global_grid_covers_poles_and_dateline():
    response = client.get('/discovery/grid?step=30')
    assert response.status_code == 200
    data = response.json()
    assert data['count'] == 72
    assert data['cells'][0]['bounds'] == {'south': -90, 'north': -60, 'west': -180, 'east': -150}
    assert data['cells'][-1]['bounds'] == {'south': 60, 'north': 90, 'west': 150, 'east': 180}
    assert all(c['similarity_percent'] is None and c['status'] == 'unassessed' for c in data['cells'])


def test_invalid_grid_rejected():
    assert client.get('/discovery/grid?step=1').status_code == 422
    assert client.get('/discovery/grid?south=90&north=0').status_code == 422


def test_refine_tiles_without_gaps():
    cells = make_grid(Bounds(south=10, north=17, west=20, east=27), 3)
    assert len(cells) == 9
    assert cells[-1]['bounds'] == {'south': 16, 'north': 17, 'west': 26, 'east': 27}


def test_elevation_validation():
    assert client.post('/discovery/elevations', json={'points': [{'latitude': 120, 'longitude': 0}]}).status_code == 404


def test_elevation_real_provider_mock(monkeypatch, tmp_path):
    import httpx
    class MockClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def get(self, *_args, **_kwargs):
            return httpx.Response(200, json={'elevation': [162.0, None]}, request=httpx.Request('GET', 'https://example.org'))
    monkeypatch.setattr(elevation.httpx, 'AsyncClient', lambda **kwargs: MockClient())
    monkeypatch.setenv('PLANETREX_DISCOVERY_DB', str(tmp_path/'results.sqlite3'))
    import asyncio
    samples = asyncio.run(elevation.sample_elevations([
        {'latitude': 12, 'longitude': 22}, {'latitude': 13, 'longitude': 23}]))
    assert samples[0]['elevation_m'] == 162.0
    assert samples[1]['elevation_m'] is None and samples[1]['status'] == 'missing'
    assert (tmp_path/'results.sqlite3').exists()


def test_stored_observations_reopen(monkeypatch, tmp_path):
    monkeypatch.setenv('PLANETREX_DISCOVERY_DB', str(tmp_path/'observations.sqlite3'))
    assert client.get('/discovery/observations').json()['samples'] == []
    elevation.save_observations([{'latitude':1.0,'longitude':2.0,'elevation_m':0.0,'retrieved_at':'2026-11-14T00:00:00+00:00'}])
    payload = client.get('/discovery/observations').json()
    assert payload['samples'][0]['elevation_m'] == 0.0
    assert payload['similarity_percent'] is None


def test_stored_observations_does_not_create_database(monkeypatch, tmp_path):
    db = tmp_path / 'not_created.sqlite3'
    monkeypatch.setenv('PLANETREX_DISCOVERY_DB', str(db))
    assert client.get('/discovery/observations').json()['samples'] == []
    assert not db.exists()


def test_elevation_rejects_nonfinite_provider_response(monkeypatch, tmp_path):
    import httpx
    class MockClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False
        async def get(self, *_args, **_kwargs):
            return httpx.Response(200, json={'elevation': [float('nan')]},
                                  request=httpx.Request('GET', 'https://example.org'))
    monkeypatch.setattr(elevation.httpx, 'AsyncClient', lambda **kwargs: MockClient())
    monkeypatch.setenv('PLANETREX_DISCOVERY_DB', str(tmp_path / 'results.sqlite3'))
    import asyncio
    import pytest
    with pytest.raises(ValueError):
        asyncio.run(elevation.sample_elevations([{'latitude': 12, 'longitude': 22}]))
    assert not (tmp_path / 'results.sqlite3').exists()


def test_saved_point_preserves_provenance(monkeypatch, tmp_path):
    monkeypatch.setenv('PLANETREX_DISCOVERY_DB', str(tmp_path / 'observations.sqlite3'))
    elevation.save_observations([{'latitude':1.0,'longitude':2.0,'elevation_m':0.0,
        'retrieved_at':'2026-11-14T00:00:00+00:00'}])
    sample = client.get('/discovery/observations').json()['samples'][0]
    assert sample['elevation_m'] == 0.0
    assert sample['provenance']['unit'] == 'm'
    assert 'Copernicus' in sample['provenance']['source']
