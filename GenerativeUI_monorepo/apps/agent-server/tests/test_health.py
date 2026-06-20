from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_root_returns_ok() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "Agent Server API"


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
