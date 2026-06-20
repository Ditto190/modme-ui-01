#!/usr/bin/env python3
"""
test_gemini_embeddings.py - Test Google Gemini embeddings integration

This script tests the embedding generation using Google Gemini API.
Requires GOOGLE_API_KEY environment variable to be set.

Usage:
    # Set API key
    export GOOGLE_API_KEY="your-api-key"  # Unix/macOS
    $env:GOOGLE_API_KEY="your-api-key"    # Windows PowerShell
    
    # Run test
    python scripts/test_gemini_embeddings.py
"""

from __future__ import annotations

import os
import sys
from typing import Literal

try:
    import google.generativeai as genai  # noqa: E402
except ImportError:
    print("❌ google-generativeai not installed. Run: pip install google-generativeai")
    sys.exit(1)

# Constants
DEFAULT_EMBEDDING_MODEL = "models/gemini-embedding-001"
SUPPORTED_DIMENSIONS = [768, 1536, 3072]

TaskType = Literal[
    "RETRIEVAL_DOCUMENT",
    "RETRIEVAL_QUERY",
    "SEMANTIC_SIMILARITY",
    "CLASSIFICATION",
    "CLUSTERING"
]


def test_embedding_generation():
    """Test basic embedding generation."""
    print("=" * 60)
    print("🧪 Testing Google Gemini Embeddings")
    print("=" * 60)
    
    # Check API key
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GOOGLE_API_KEY environment variable not set")
        print("   Set it with: export GOOGLE_API_KEY='your-api-key'")
        sys.exit(1)
    
    # Configure genai
    genai.configure(api_key=api_key)
    print("✅ Google Generative AI configured")
    
    # Test texts
    test_texts = [
        "Python is a versatile programming language",
        "Machine learning models learn patterns from data",
        "The quick brown fox jumps over the lazy dog",
    ]
    
    # Test different dimensions
    for dim in SUPPORTED_DIMENSIONS:
        print(f"\n📐 Testing {dim}-dimensional embeddings...")
        
        for text in test_texts[:1]:  # Just test first text for each dimension
            try:
                result = genai.embed_content(
                    model=DEFAULT_EMBEDDING_MODEL,
                    content=text,
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=dim,
                )
                embedding = result['embedding']
                print(f"   ✅ Generated embedding: {len(embedding)} dimensions")
                print(f"      First 5 values: {embedding[:5]}")
                print(f"      Norm: {sum(v*v for v in embedding)**0.5:.4f}")
            except Exception as e:
                print(f"   ❌ Failed: {e}")
                return False
    
    # Test different task types
    print("\n📋 Testing different task types...")
    task_types: list[TaskType] = [
        "RETRIEVAL_DOCUMENT",
        "RETRIEVAL_QUERY",
        "SEMANTIC_SIMILARITY",
    ]
    
    for task_type in task_types:
        try:
            result = genai.embed_content(
                model=DEFAULT_EMBEDDING_MODEL,
                content=test_texts[0],
                task_type=task_type,
                output_dimensionality=768,
            )
            print(f"   ✅ {task_type}: {len(result['embedding'])} dimensions")
        except Exception as e:
            print(f"   ❌ {task_type} failed: {e}")
    
    # Test batch embedding
    print("\n📦 Testing batch embedding...")
    try:
        result = genai.embed_content(
            model=DEFAULT_EMBEDDING_MODEL,
            content=test_texts,  # Batch mode
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=768,
        )
        embeddings = result['embedding']
        print(f"   ✅ Batch generated: {len(embeddings)} embeddings")
        print(f"      Each has {len(embeddings[0])} dimensions")
    except Exception as e:
        print(f"   ❌ Batch embedding failed: {e}")
    
    # Test semantic similarity
    print("\n🔍 Testing semantic similarity...")
    try:
        similar_texts = [
            "Python is a popular programming language",
            "Python is widely used for software development",
        ]
        dissimilar_texts = [
            "Python is a popular programming language",
            "The weather is sunny today",
        ]
        
        # Get embeddings
        result1 = genai.embed_content(
            model=DEFAULT_EMBEDDING_MODEL,
            content=similar_texts,
            task_type="SEMANTIC_SIMILARITY",
            output_dimensionality=768,
        )
        
        result2 = genai.embed_content(
            model=DEFAULT_EMBEDDING_MODEL,
            content=dissimilar_texts,
            task_type="SEMANTIC_SIMILARITY",
            output_dimensionality=768,
        )
        
        # Compute cosine similarity
        def cosine_similarity(a: list[float], b: list[float]) -> float:
            dot = sum(x*y for x, y in zip(a, b))
            norm_a = sum(x*x for x in a) ** 0.5
            norm_b = sum(x*x for x in b) ** 0.5
            return dot / (norm_a * norm_b)
        
        sim_similar = cosine_similarity(
            result1['embedding'][0],
            result1['embedding'][1]
        )
        sim_dissimilar = cosine_similarity(
            result2['embedding'][0],
            result2['embedding'][1]
        )
        
        print(f"   Similar texts similarity: {sim_similar:.4f}")
        print(f"   Dissimilar texts similarity: {sim_dissimilar:.4f}")
        
        if sim_similar > sim_dissimilar:
            print("   ✅ Semantic similarity working correctly!")
        else:
            print("   ⚠️ Unexpected similarity scores")
            
    except Exception as e:
        print(f"   ❌ Similarity test failed: {e}")
    
    print("\n" + "=" * 60)
    print("✅ All embedding tests completed!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = test_embedding_generation()
    sys.exit(0 if success else 1)
