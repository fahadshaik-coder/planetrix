"""Moon/Mars navigation route and explorer asset integrity."""
from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)

def test_moon_navigation_markers_have_names_and_coordinates():
    data=client.get('/exploration/sites?body=moon')
    assert data.status_code==200
    payload=data.json()
    assert payload['count']>=6
    apollo11=next(x for x in payload['sites'] if x['id']=='apollo-11')
    assert apollo11['name']=='Tranquility Base'
    assert abs(apollo11['latitude']-0.67416)<1e-5
    assert apollo11['similarity_percent'] is None
    assert apollo11['measured_reference_id'] is None

def test_mars_navigation_markers_and_validation():
    response=client.get('/exploration/sites?body=mars')
    assert response.status_code==200
    sites=response.json()['sites']
    assert any(s['name']=='Jezero Crater' for s in sites)
    assert client.get('/exploration/sites?body=earth').status_code==422

def test_explorer_uses_moon_first_and_bundled_assets():
    text=client.get('/explorer').text
    assert 'Explore the Moon' in text
    assert 'moon-tab' in text
    assert 'earth' not in text.split('<h1 id="page-heading">')[1].split('</h1>')[0].lower()
    for filename in ('explorer.css','explorer.js','moon.jpg','mars.jpg','earth.jpg'):
        result=client.get('/explorer-assets/'+filename)
        assert result.status_code==200,filename

def test_no_scientific_matches_fabricated(monkeypatch, tmp_path):
    monkeypatch.setenv('PLANETREX_PROFILE_DB',str(tmp_path/'does-not-exist.sqlite3'))
    assert client.get('/science/profiles?body=moon').json()['profiles']==[]
    assert client.get('/science/profiles?body=earth').json()['profiles']==[]

def test_offline_region_labels_are_not_analog_discoveries():
    payload=client.get('/explorer-assets/earth_region_names.json')
    assert payload.status_code==200
    data=payload.json()
    assert len(data['labels'])==72
    assert 'approximate' in data['source']
    assert 'India' in data['labels']['0:60:30:90']
