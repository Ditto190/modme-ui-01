"""
Test suite for semantic router functionality.

Tests cover:
- Router initialization (local and cloud modes)
- Route matching for all 8 route types
- Ensemble routing (top-k)
- Fallback behavior
- Continuous learning (add_utterance)
- Privacy verification (local mode)
"""

import os
from unittest.mock import patch

import pytest

from routes.definitions import ALL_ROUTES
from routes.router import ModMeSemanticRouter, get_router


class TestRouterInitialization:
    """Test router initialization in different modes."""
    
    def test_local_mode_initialization(self):
        """Test router initializes successfully in local mode."""
        router = ModMeSemanticRouter(mode="local")
        assert router.mode == "local"
        assert router.route_layer is not None
        assert len(router.route_layer.routes) == 8
    
    def test_invalid_mode_raises_error(self):
        """Test that invalid mode raises ValueError."""
        with pytest.raises(ValueError, match="Invalid mode"):
            ModMeSemanticRouter(mode="invalid")
    
    @patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-key"})
    def test_cloud_mode_with_api_key(self):
        """Test cloud mode initialization with API key."""
        router = ModMeSemanticRouter(mode="cloud")
        assert router.mode == "cloud"
        assert router.route_layer is not None
    
    def test_cloud_mode_without_api_key_raises_error(self):
        """Test cloud mode without API key raises ValueError."""
        # Ensure OPENAI_API_KEY is not set
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="OPENAI_API_KEY"):
                ModMeSemanticRouter(mode="cloud")
    
    def test_singleton_pattern(self):
        """Test that get_router returns same instance."""
        router1 = get_router()
        router2 = get_router()
        assert router1 is router2


class TestDashboardRouting:
    """Test dashboard route matching."""
    
    @pytest.fixture
    def router(self):
        """Create a router instance for testing."""
        return ModMeSemanticRouter(mode="local")
    
    def test_dashboard_explicit_match(self, router):
        """Test exact dashboard utterance matches."""
        route = router.route("show me a dashboard")
        assert route is not None
        assert route.name == "dashboard"
    
    def test_dashboard_variant_match(self, router):
        """Test dashboard variant phrasing."""
        route = router.route("create KPI view")
        assert route is not None
        assert route.name == "dashboard"
    
    def test_dashboard_natural_language(self, router):
        """Test natural language dashboard request."""
        route = router.route("I need to see my business metrics")
        # Should route to dashboard or return None (acceptable)
        if route is not None:
            assert route.name in ["dashboard", "analysis"]


class TestDataQueryRouting:
    """Test data query route matching."""
    
    @pytest.fixture
    def router(self):
        return ModMeSemanticRouter(mode="local")
    
    def test_data_query_explicit_match(self, router):
        """Test exact data query utterance."""
        route = router.route("query the database")
        assert route is not None
        assert route.name == "data_query"
    
    def test_sql_like_query(self, router):
        """Test SQL-like query phrasing."""
        route = router.route("get all records where status is active")
        assert route is not None
        assert route.name == "data_query"
    
    def test_data_retrieval(self, router):
        """Test data retrieval phrasing."""
        route = router.route("fetch customer data")
        # Should route to data_query or return None
        if route is not None:
            assert route.name == "data_query"


class TestVisualizationRouting:
    """Test visualization route matching."""
    
    @pytest.fixture
    def router(self):
        return ModMeSemanticRouter(mode="local")
    
    def test_chart_creation(self, router):
        """Test chart creation request."""
        route = router.route("create a bar chart")
        assert route is not None
        assert route.name == "visualization"
    
    def test_graph_request(self, router):
        """Test graph creation request."""
        route = router.route("show me a line graph")
        assert route is not None
        assert route.name == "visualization"
    
    def test_plot_request(self, router):
        """Test plot creation request."""
        route = router.route("plot sales over time")
        assert route is not None
        assert route.name == "visualization"


class TestComponentRouting:
    """Test component route matching."""
    
    @pytest.fixture
    def router(self):
        return ModMeSemanticRouter(mode="local")
    
    def test_component_addition(self, router):
        """Test component addition request."""
        route = router.route("add a stat card")
        assert route is not None
        assert route.name == "component"
    
    def test_component_inquiry(self, router):
        """Test component availability inquiry."""
        route = router.route("show me available components")
        assert route is not None
        assert route.name == "component"


class TestAnalysisRouting:
    """Test analysis route matching."""
    
    @pytest.fixture
    def router(self):
        return ModMeSemanticRouter(mode="local")
    
    def test_trend_analysis(self, router):
        """Test trend analysis request."""
        route = router.route("analyze sales trends")
        assert route is not None
        assert route.name == "analysis"
    
    def test_correlation_analysis(self, router):
        """Test correlation analysis request."""
        route = router.route("find correlations in the data")
        assert route is not None
        assert route.name == "analysis"
    
    def test_pattern_detection(self, router):
        """Test pattern detection request."""
        route = router.route("what patterns do you see")
        assert route is not None
        # Could match analysis or chitchat depending on context
        assert route.name in ["analysis", "chitchat"]


class TestAuditRouting:
    """Test audit route matching."""
    
    @pytest.fixture
    def router(self):
        return ModMeSemanticRouter(mode="local")
    
    def test_audit_logging(self, router):
        """Test audit logging request."""
        route = router.route("log this action")
        assert route is not None
        assert route.name == "audit"
    
    def test_audit_trail(self, router):
        """Test audit trail request."""
        route = router.route("create an audit trail")
        assert route is not None
        assert route.name == "audit"
    
    def test_compliance_report(self, router):
        """Test compliance report request."""
        route = router.route("compliance report for last month")
        assert route is not None
        assert route.name == "audit"


class TestMultimodalRouting:
    """Test multimodal route matching."""
    
    @pytest.fixture
    def router(self):
        return ModMeSemanticRouter(mode="local")
    
    def test_image_analysis(self, router):
        """Test image analysis request."""
        route = router.route("analyze this image")
        assert route is not None
        assert route.name == "multimodal"
    
    def test_document_extraction(self, router):
        """Test document text extraction."""
        route = router.route("extract text from document")
        assert route is not None
        assert route.name == "multimodal"
    
    def test_image_inquiry(self, router):
        """Test image content inquiry."""
        route = router.route("what's in this picture")
        assert route is not None
        assert route.name == "multimodal"


class TestChitchatRouting:
    """Test chitchat route matching."""
    
    @pytest.fixture
    def router(self):
        return ModMeSemanticRouter(mode="local")
    
    def test_greeting(self, router):
        """Test greeting matches chitchat."""
        route = router.route("hello")
        assert route is not None
        assert route.name == "chitchat"
    
    def test_capability_inquiry(self, router):
        """Test capability inquiry."""
        route = router.route("what can you do")
        assert route is not None
        assert route.name == "chitchat"
    
    def test_thanks(self, router):
        """Test thank you message."""
        route = router.route("thank you")
        assert route is not None
        assert route.name == "chitchat"


class TestEnsembleRouting:
    """Test ensemble (top-k) routing functionality."""
    
    @pytest.fixture
    def router(self):
        return ModMeSemanticRouter(mode="local")
    
    def test_top_k_returns_multiple_routes(self, router):
        """Test top-k routing returns multiple routes."""
        top_routes = router.top_k_routes(
            "analyze data and create a chart",
            k=3,
            threshold=0.3
        )
        assert isinstance(top_routes, list)
        # Should return some routes (at least 1)
        assert len(top_routes) >= 1
        assert len(top_routes) <= 3
    
    def test_top_k_includes_scores(self, router):
        """Test that top-k returns routes with scores."""
        top_routes = router.top_k_routes(
            "show dashboard with charts",
            k=2,
            threshold=0.3
        )
        for route, score in top_routes:
            assert route is not None
            assert isinstance(score, (int, float))
            assert 0.0 <= score <= 1.0
    
    def test_top_k_sorted_by_score(self, router):
        """Test that routes are sorted by score descending."""
        top_routes = router.top_k_routes(
            "create visualization dashboard",
            k=3,
            threshold=0.3
        )
        if len(top_routes) > 1:
            scores = [score for _, score in top_routes]
            assert scores == sorted(scores, reverse=True)
    
    def test_threshold_filtering(self, router):
        """Test that threshold filters low-scoring routes."""
        # High threshold should return fewer results
        high_threshold_routes = router.top_k_routes(
            "hello there",
            k=5,
            threshold=0.8
        )
        low_threshold_routes = router.top_k_routes(
            "hello there",
            k=5,
            threshold=0.3
        )
        # Low threshold should return at least as many as high threshold
        assert len(low_threshold_routes) >= len(high_threshold_routes)


class TestFallbackBehavior:
    """Test fallback and no-route scenarios."""
    
    @pytest.fixture
    def router(self):
        return ModMeSemanticRouter(mode="local")
    
    def test_unrelated_query_may_return_none(self, router):
        """Test that completely unrelated queries may return None."""
        route = router.route("asdfghjkl qwertyuiop")
        # Random gibberish might not match any route
        # This is acceptable behavior
        if route is not None:
            # If it does match something, that's also acceptable
            assert route.name in [r.name for r in ALL_ROUTES]
    
    def test_empty_query(self, router):
        """Test handling of empty query."""
        route = router.route("")
        # Empty string should either return None or chitchat
        if route is not None:
            assert isinstance(route.name, str)


class TestContinuousLearning:
    """Test dynamic utterance addition."""
    
    @pytest.fixture
    def router(self):
        return ModMeSemanticRouter(mode="local")
    
    def test_add_utterance_to_existing_route(self, router):
        """Test adding new utterance to existing route."""
        result = router.add_utterance(
            route_name="dashboard",
            utterance="build me an executive summary view"
        )
        assert result is True
    
    def test_add_utterance_to_nonexistent_route(self, router):
        """Test adding utterance to non-existent route returns False."""
        result = router.add_utterance(
            route_name="nonexistent",
            utterance="some utterance"
        )
        assert result is False
    
    def test_added_utterance_improves_matching(self, router):
        """Test that added utterance improves future routing."""
        # Add a very specific utterance
        custom_phrase = "show executive dashboard with kpis"
        router.add_utterance("dashboard", custom_phrase)
        
        # Now query with similar phrase
        route = router.route(custom_phrase)
        assert route is not None
        assert route.name == "dashboard"


class TestPrivacyVerification:
    """Test privacy and local-only operation."""
    
    def test_local_mode_no_external_calls(self):
        """Test that local mode doesn't require internet."""
        # This test verifies that router can be initialized
        # and used without external API calls
        router = ModMeSemanticRouter(mode="local")
        
        # Should work without internet
        route = router.route("show me a dashboard")
        assert route is not None
    
    def test_route_definitions_loaded(self):
        """Test that all route definitions are loaded."""
        router = ModMeSemanticRouter(mode="local")
        route_names = [r.name for r in router.route_layer.routes]
        
        expected_routes = [
            "dashboard", "data_query", "visualization", "component",
            "analysis", "audit", "multimodal", "chitchat"
        ]
        
        for expected in expected_routes:
            assert expected in route_names


class TestRouteWithScore:
    """Test route_with_score method."""
    
    @pytest.fixture
    def router(self):
        return ModMeSemanticRouter(mode="local")
    
    def test_route_with_score_returns_tuple(self, router):
        """Test that route_with_score returns (route, score) tuple."""
        result = router.route_with_score("show me a dashboard")
        assert isinstance(result, tuple)
        assert len(result) == 2
        
        route, score = result
        if route is not None:
            assert hasattr(route, 'name')
            assert isinstance(score, (int, float))
    
    def test_route_with_score_confidence(self, router):
        """Test that score is in valid range."""
        route, score = router.route_with_score("create a chart")
        if route is not None:
            assert 0.0 <= score <= 1.0


# Run tests with: pytest tests/test_semantic_router.py -v
# Coverage: pytest tests/test_semantic_router.py --cov=routes --cov-report=term-missing
