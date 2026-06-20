"""Python bridge to Node.js Gemma3N embeddings.

Replaces SHA256-based embeddings with real semantic embeddings
using transformers.js via subprocess calls to Node.js.

Usage:
  from agent.skills_ref.embeddings_gemma3n import embed_text_gemma3n
  
  embedding = embed_text_gemma3n("Hello world")
"""

import json
import subprocess
from pathlib import Path
from typing import List, Union

# Path to the Node.js embedding script
MODELS_DIR = Path(__file__).parent.parent.parent / "src" / "models" / "gemma3n"
EMBEDDING_SCRIPT = MODELS_DIR / "embedding_service.js"


def embed_text_gemma3n(text: Union[str, List[str]]) -> Union[str, List[str]]:
    """
    Generate embeddings using Gemma3N model via Node.js.
    
    Args:
        text: Single text string or list of text strings
        
    Returns:
        Hex-encoded embedding(s) for storage in JSONL
        
    Raises:
        RuntimeError: If Node.js or model execution fails
    """
    if not EMBEDDING_SCRIPT.exists():
        raise FileNotFoundError(
            f"Embedding script not found: {EMBEDDING_SCRIPT}\n"
            f"Run 'npm install' in {MODELS_DIR}"
        )
    
    # Prepare input
    is_batch = isinstance(text, list)
    input_data = {
        "texts": text if is_batch else [text],
        "format": "hex"
    }
    
    try:
        # Call Node.js script
        result = subprocess.run(
            ["node", str(EMBEDDING_SCRIPT)],
            input=json.dumps(input_data),
            capture_output=True,
            text=True,
            check=True,
            cwd=str(MODELS_DIR),
            timeout=30
        )
        
        # Parse output
        output = json.loads(result.stdout)
        
        if output.get("status") != "success":
            raise RuntimeError(f"Embedding failed: {output.get('error', 'Unknown error')}")
        
        embeddings = output["embeddings"]
        return embeddings if is_batch else embeddings[0]
    
    except subprocess.CalledProcessError as e:
        raise RuntimeError(
            f"Node.js embedding failed: {e.stderr}\n"
            f"Make sure Node.js 18+ is installed and @xenova/transformers is available"
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("Embedding timed out (>30s). Model may still be downloading.")
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Invalid JSON from embedding script: {e}")


def cosine_similarity(embedding_a: str, embedding_b: str) -> float:
    """
    Calculate cosine similarity between two hex-encoded embeddings.
    
    Args:
        embedding_a: Hex-encoded embedding
        embedding_b: Hex-encoded embedding
        
    Returns:
        Similarity score (0-1, higher is more similar)
    """
    # Convert hex to float arrays
    bytes_a = bytes.fromhex(embedding_a)
    bytes_b = bytes.fromhex(embedding_b)
    
    # Interpret as float32 arrays
    import struct
    floats_a = struct.unpack(f'{len(bytes_a) // 4}f', bytes_a)
    floats_b = struct.unpack(f'{len(bytes_b) // 4}f', bytes_b)
    
    if len(floats_a) != len(floats_b):
        raise ValueError("Embeddings must have same dimension")
    
    # Compute cosine similarity
    dot_product = sum(a * b for a, b in zip(floats_a, floats_b))
    norm_a = sum(a * a for a in floats_a) ** 0.5
    norm_b = sum(b * b for b in floats_b) ** 0.5
    
    return dot_product / (norm_a * norm_b)


# Alias for backward compatibility
embed_text = embed_text_gemma3n


if __name__ == "__main__":
    # Test embeddings
    print("Testing Gemma3N embeddings from Python...")
    
    text1 = "The weather is sunny today."
    text2 = "It's raining outside."
    
    print(f"\nText 1: {text1}")
    emb1 = embed_text_gemma3n(text1)
    print(f"Embedding (hex, first 64 chars): {emb1[:64]}...")
    
    print(f"\nText 2: {text2}")
    emb2 = embed_text_gemma3n(text2)
    print(f"Embedding (hex, first 64 chars): {emb2[:64]}...")
    
    print(f"\nSimilarity: {cosine_similarity(emb1, emb2):.4f}")
    print("\n✓ Python bridge working!")
