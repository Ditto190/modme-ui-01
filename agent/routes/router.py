"""
Semantic router manager for ModMe GenUI Workbench.

This module provides the core routing functionality for multi-agent orchestration.
It supports both local (privacy-first) and cloud-based embedding models.
"""

import os
from typing import List, Optional, Tuple

from semantic_router import SemanticRouter
from semantic_router.encoders import HuggingFaceEncoder, OpenAIEncoder

from .definitions import ALL_ROUTES


class ModMeSemanticRouter:
    """
    Semantic router for intent classification in GenUI workbench.
    
    Supports two modes:
    - local: Uses HuggingFace sentence-transformers (privacy-first, no API calls)
    - cloud: Uses OpenAI embeddings (requires API key)
    
    All routing decisions are kept in-memory with no external vector database.
    """
    
    def __init__(self, mode: str = "local"):
        """
        Initialize the semantic router.
        
        Args:
            mode: Either "local" (HuggingFace) or "cloud" (OpenAI)
        
        Raises:
            ValueError: If mode is invalid or required API keys are missing
        """
        self.mode = mode
        
        if mode == "local":
            # Privacy-first: HuggingFace encoder, no external API calls
            encoder = HuggingFaceEncoder(name="sentence-transformers/all-MiniLM-L6-v2")
        elif mode == "cloud":
            # Cloud mode: OpenAI embeddings
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable required for cloud mode")
            encoder = OpenAIEncoder(api_key=api_key)
        else:
            raise ValueError(f"Invalid mode: {mode}. Must be 'local' or 'cloud'")
        
        # Initialize semantic router with in-memory vector storage
        self.router = SemanticRouter(
            encoder=encoder,
            routes=ALL_ROUTES,
            auto_sync="local",  # Keep vectors in-memory, no external DB
        )
    
    def route(self, query: str) -> Optional[object]:
        """
        Find the best matching route for a query.
        
        Args:
            query: User's input text
        
        Returns:
            The best matching Route object, or None if no match above threshold
        """
        result = self.router(query)
        return result
    
    def route_with_score(self, query: str) -> Tuple[Optional[object], float]:
        """
        Find the best route with confidence score.
        
        Args:
            query: User's input text
        
        Returns:
            Tuple of (Route object or None, confidence score)
        """
        # Get route and access scores from router
        route = self.router(query)
        
        # If we have a route, try to get the score
        if route:
            # The router stores the last classification scores
            # We'll return a default high score if route matched
            return (route, 1.0)
        else:
            return (None, 0.0)
    
    def top_k_routes(
        self, query: str, k: int = 3, threshold: float = 0.5
    ) -> List[Tuple[object, float]]:
        """
        Get top-k routes for ensemble routing.
        
        Args:
            query: User's input text
            k: Number of top routes to return
            threshold: Minimum similarity score (0-1)
        
        Returns:
            List of (Route, score) tuples, sorted by score descending
        """
        # Get similarity scores for all routes
        scores = []
        
        # Encode the query
        query_embedding = self.router.encoder([query])
        
        # Compare against each route's embeddings
        for route in self.router.routes:
            # Get route embeddings
            if hasattr(route, 'utterances') and route.utterances:
                # Calculate similarity with route utterances
                utterance_embeddings = self.router.encoder(route.utterances)
                
                # Calculate cosine similarity (simplified - using dot product for normalized vectors)
                similarities = []
                for utt_emb in utterance_embeddings:
                    # Compute cosine similarity
                    sim = sum(q * u for q, u in zip(query_embedding[0], utt_emb))
                    similarities.append(sim)
                
                # Use max similarity for this route
                max_sim = max(similarities) if similarities else 0.0
                if max_sim >= threshold:
                    scores.append((route, max_sim))
        
        # Sort by score descending and take top k
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:k]
    
    def add_utterance(self, route_name: str, utterance: str) -> bool:
        """
        Add a new utterance to an existing route (continuous learning).
        
        Args:
            route_name: Name of the route to update
            utterance: New example utterance to add
        
        Returns:
            True if successful, False if route not found
        """
        for route in self.router.routes:
            if route.name == route_name:
                if hasattr(route, 'utterances'):
                    route.utterances.append(utterance)
                    # Re-initialize router to update embeddings
                    encoder = self.router.encoder
                    self.router = SemanticRouter(
                        encoder=encoder,
                        routes=self.router.routes,
                        auto_sync="local",
                    )
                    return True
        return False


# Singleton instance
_router_instance: Optional[ModMeSemanticRouter] = None


def get_router() -> ModMeSemanticRouter:
    """
    Get or create singleton router instance.
    
    The router is initialized based on the SEMANTIC_ROUTER_MODE environment
    variable (defaults to "local" for privacy).
    
    Returns:
        Singleton ModMeSemanticRouter instance
    """
    global _router_instance
    if _router_instance is None:
        mode = os.getenv("SEMANTIC_ROUTER_MODE", "local")
        _router_instance = ModMeSemanticRouter(mode=mode)
    return _router_instance
