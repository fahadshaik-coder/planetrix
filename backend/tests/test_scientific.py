"""Network-free tests with official-source-shaped fixtures."""
import httpx
from fastapi.testclient import TestClient

from app.collectors.nasa import fetch_earth_events, fetch_planetary_products
from app.main import app

client = TestClient(app)


def test_analogs_are_empty_without_computed_science():
    assert client.get('/analogs?target=moon').json() == []
    assert client.get('/analogs?target=mars').json() == []
    assert client.get('/analogs?target=venus').status_code == 422


def test_openapi_contains_real_source_endpoints():
    paths = client.get('/openapi.json').json()['paths']
    assert '/scientific/earth-events' in paths
    assert '/scientific/planetary-products' in paths


def test_eonet_event_parsing():
    def handler(request):
        assert request.url.params['status'] == 'open'
        return httpx.Response(200, json={'events': [
            {'id': 'EONET-1', 'title': 'Test volcanic event', 'categories': [{'title': 'Volcanoes'}], 'geometry': [{'type': 'Point', 'coordinates': [-155.2, 19.4], 'date': '2026-11-14T00:00:00Z'}], 'sources': [{'url': 'https://example.org/evidence'}]},
            {'id': 'EONET-2', 'title': 'Polygon-only event', 'geometry': [{'type': 'Polygon', 'coordinates': []}]}
        ]})
    with httpx.Client(transport=httpx.MockTransport(handler)) as source:
        data = fetch_earth_events(source)
    assert len(data['events']) == 1
    assert data['events'][0]['longitude'] == -155.2
    assert data['analog_results'] is False


def test_pds_product_parsing():
    def handler(request):
        assert 'Mars' in request.url.params['q']
        return httpx.Response(200, json={'data': [{'id': 'urn:nasa:pds:test', 'type': 'Product_Collection', 'properties': {'pds:Identification_Area.pds:title': ['Example Archive Collection']}}]})
    with httpx.Client(transport=httpx.MockTransport(handler)) as source:
        data = fetch_planetary_products(source, 'mars')
    assert data['products'][0]['title'] == 'Example Archive Collection'
    assert data['products'][0]['id'] == 'urn:nasa:pds:test'
    assert data['analog_results'] is False


def test_upstream_error_is_explicit(monkeypatch):
    from app.api.routes import scientific
    def fail(*args, **kwargs):
        from app.collectors.nasa import NASAUpstreamError
        raise NASAUpstreamError('Upstream unavailable')
    monkeypatch.setattr(scientific, 'fetch_earth_events', fail)
    result = client.get('/scientific/earth-events')
    assert result.status_code == 502
    assert result.json()['detail'] == 'Upstream unavailable'
