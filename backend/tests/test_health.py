"""Tests for the Step 1 application."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_expected_json() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"service": "PLANETREX", "status": "healthy"}
    assert response.headers["content-type"].startswith("application/json")


def test_openapi_lists_health_endpoint() -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert "/health" in response.json()["paths"]
