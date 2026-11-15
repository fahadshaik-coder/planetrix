"""Tests for the PLANETREX Scientific Engine: references, analog matching, and experiment suitability."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_list_references():
    moon_res = client.get("/science/references?body=moon")
    assert moon_res.status_code == 200
    moon_data = moon_res.json()
    assert moon_data["body"] == "moon"
    assert moon_data["count"] >= 5
    apollo_11 = next((r for r in moon_data["references"] if r["id"] == "moon-apollo-11"), None)
    assert apollo_11 is not None
    assert apollo_11["features"]["slope_deg"]["value"] == 2.15

    mars_res = client.get("/science/references?body=mars")
    assert mars_res.status_code == 200
    mars_data = mars_res.json()
    assert mars_data["body"] == "mars"
    jezero = next((r for r in mars_data["references"] if r["id"] == "mars-jezero"), None)
    assert jezero is not None
    assert jezero["features"]["slope_deg"]["value"] == 4.60


def test_analog_matches_with_experiment_suitability():
    res = client.get("/science/analog-matches?reference_id=moon-apollo-11")
    assert res.status_code == 200
    data = res.json()
    assert data["target_body"] == "moon"
    candidates = data["analog_candidates"]
    assert len(candidates) > 0

    first = candidates[0]
    assert "name" in first
    assert "normalized_distance" in first
    assert "similarity_percent" in first
    assert "experiments" in first
    assert len(first["experiments"]) == 5

    # Check the 5 experiment disciplines
    domain_ids = [exp["id"] for exp in first["experiments"]]
    assert "habitat_construction" in domain_ids
    assert "rover_movements" in domain_ids
    assert "resource_extraction" in domain_ids
    assert "life_detection" in domain_ids
    assert "subsurface_exploration" in domain_ids

    # Each experiment has scientific rationale and readiness score
    for exp in first["experiments"]:
        assert exp["readiness_score"] >= 0
        assert exp["suitability"] in ("High", "Moderate", "Low")
        assert len(exp["scientific_rationale"]) > 10
        assert len(exp["key_experiments"]) >= 2


def test_list_experiment_domains():
    res = client.get("/science/experiments")
    assert res.status_code == 200
    domains = res.json()
    assert len(domains) == 5
