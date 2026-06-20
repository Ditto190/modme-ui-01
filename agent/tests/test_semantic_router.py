"""
Test suite for semantic router functionality.

Tests cover:
- Route definitions and structure  
- Router initialization logic (requires network for full tests)

Note: Full integration tests require internet access to download models.
Run with `pytest tests/test_semantic_router.py` (without CI=true) when
network is available.
"""

import os
from unittest.mock import patch

import pytest

from routes.definitions import ALL_ROUTES
from routes.router import ModMeSemanticRouter


class TestRouteDefinitions:
    """Test route definitions are properly structured."""
    
    def test_all_routes_have_names(self):
        """Test that all routes have valid names."""
        for route in ALL_ROUTES:
            assert hasattr(route, 'name')
            assert isinstance(route.name, str)
            assert len(route.name) > 0
    
    def test_all_routes_have_utterances(self):
        """Test that all routes have utterances."""
        for route in ALL_ROUTES:
            assert hasattr(route, 'utterances')
            assert isinstance(route.utterances, list)
            assert len(route.utterances) >= 5, f"Route {route.name} has fewer than 5 utterances"
    
    def test_route_names_unique(self):
        """Test that all route names are unique."""
        route_names = [r.name for r in ALL_ROUTES]
        assert len(route_names) == len(set(route_names))
    
    def test_expected_routes_exist(self):
        """Test that all expected routes are defined."""
        route_names = [r.name for r in ALL_ROUTES]
        expected_routes = [
            "dashboard", "data_query", "visualization", "component",
            "analysis", "audit", "multimodal", "chitchat"
        ]
        for expected in expected_routes:
            assert expected in route_names
    
    def test_utterances_are_strings(self):
        """Test that all utterances are strings."""
        for route in ALL_ROUTES:
            for utterance in route.utterances:
                assert isinstance(utterance, str)
                assert len(utterance) > 0
    
    def test_route_count(self):
        """Test that we have exactly 8 routes."""
        assert len(ALL_ROUTES) == 8


class TestRouterInitialization:
    """Test router initialization logic."""
    
    def test_invalid_mode_raises_error(self):
        """Test that invalid mode raises ValueError."""
        with pytest.raises(ValueError, match="Invalid mode"):
            ModMeSemanticRouter(mode="invalid")
    
    def test_cloud_mode_without_api_key_raises_error(self):
        """Test cloud mode without API key raises ValueError."""
        # Ensure OPENAI_API_KEY is not set
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="OPENAI_API_KEY"):
                ModMeSemanticRouter(mode="cloud")


# Integration tests that require network access
# These tests will only run when network is available and CI is not set
@pytest.mark.skipif(
    os.getenv("CI") == "true",
    reason="Integration tests requiring network access skipped in CI"
)
class TestRouterIntegration:
    """Integration tests requiring network access to download models."""
    
    def test_local_mode_initialization(self):
        """Test router initializes successfully in local mode."""
        router = ModMeSemanticRouter(mode="local")
        assert router.mode == "local"
        assert router.router is not None
        assert len(router.router.routes) == 8
    
    def test_dashboard_routing(self):
        """Test dashboard route matching."""
        router = ModMeSemanticRouter(mode="local")
        route = router.route("show me a dashboard")
        assert route is not None
        assert route.name == "dashboard"
    
    def test_data_query_routing(self):
        """Test data query route matching."""
        router = ModMeSemanticRouter(mode="local")
        route = router.route("query the database")
        assert route is not None
        assert route.name == "data_query"
    
    def test_visualization_routing(self):
        """Test visualization route matching."""
        router = ModMeSemanticRouter(mode="local")
        route = router.route("create a bar chart")
        assert route is not None
        assert route.name == "visualization"
    
    def test_component_routing(self):
        """Test component route matching."""
        router = ModMeSemanticRouter(mode="local")
        route = router.route("add a stat card")
        assert route is not None
        assert route.name == "component"
    
    def test_analysis_routing(self):
        """Test analysis route matching."""
        router = ModMeSemanticRouter(mode="local")
        route = router.route("analyze sales trends")
        assert route is not None
        assert route.name == "analysis"
    
    def test_audit_routing(self):
        """Test audit route matching."""
        router = ModMeSemanticRouter(mode="local")
        route = router.route("log this action")
        assert route is not None
        assert route.name == "audit"
    
    def test_multimodal_routing(self):
        """Test multimodal route matching."""
        router = ModMeSemanticRouter(mode="local")
        route = router.route("analyze this image")
        assert route is not None
        assert route.name == "multimodal"
    
    def test_chitchat_routing(self):
        """Test chitchat route matching."""
        router = ModMeSemanticRouter(mode="local")
        route = router.route("hello")
        assert route is not None
        assert route.name == "chitchat"
    
    def test_top_k_routing(self):
        """Test ensemble (top-k) routing."""
        router = ModMeSemanticRouter(mode="local")
        top_routes = router.top_k_routes(
            "analyze data and create a chart",
            k=3,
            threshold=0.3
        )
        assert isinstance(top_routes, list)
        assert len(top_routes) >= 1
        assert len(top_routes) <= 3
        for route, score in top_routes:
            assert route is not None
            assert isinstance(score, (int, float))
            assert 0.0 <= score <= 1.0
    
    def test_add_utterance(self):
        """Test continuous learning - adding new utterances."""
        router = ModMeSemanticRouter(mode="local")
        result = router.add_utterance(
            route_name="dashboard",
            utterance="build me an executive summary view"
        )
        assert result is True
        
        # Test with non-existent route
        result = router.add_utterance(
            route_name="nonexistent",
            utterance="some utterance"
        )
        assert result is False


# Run tests with: pytest tests/test_semantic_router.py -v
# Run with integration tests: pytest tests/test_semantic_router.py -v (when network available)
# Run only unit tests: CI=true pytest tests/test_semantic_router.py -v
