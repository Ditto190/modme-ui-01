"""Tests for application factory and DI wiring."""

from src.adapters.inbound.websocket_route import create_websocket_router
from src.app.container import create_container
from src.app.factory import create_app


def test_create_container_wires_orchestrator_and_connection_manager() -> None:
    container = create_container()
    assert container.orchestrator is not None
    assert container.connection_manager is not None
    assert container.orchestrator.get_state().status == "idle"


def _collect_route_paths(routes: object, prefix: str = "") -> set[str]:
    paths: set[str] = set()
    for route in routes:  # type: ignore[union-attr]
        route_path = getattr(route, "path", None)
        full_path = f"{prefix}{route_path}" if route_path else prefix
        if route_path:
            paths.add(full_path)
        nested = getattr(route, "routes", None)
        if nested:
            paths.update(_collect_route_paths(nested, full_path if route_path else prefix))
    return paths


def test_websocket_router_exposes_agent_path() -> None:
    container = create_container()
    router = create_websocket_router(
        container.orchestrator,
        container.connection_manager,
    )
    paths = _collect_route_paths(router.routes)
    assert "/ws/agent" in paths


def test_create_app_builds_fastapi_instance() -> None:
    app = create_app()
    assert app.title == "Agent Server"
    assert any(getattr(route, "path", None) == "/health" for route in app.routes)
