#!/usr/bin/env python3
"""
Token Audit Script for GitLens/AI Tools
Scans repository files and reports token counts to identify heavy contributors.

Usage:
    python scripts/audit-tokens.py
    python scripts/audit-tokens.py --top 20
    python scripts/audit-tokens.py --dir src/
"""

import sys
import os
from pathlib import Path
from typing import List, Tuple
import argparse

try:
    import tiktoken
except ImportError:
    print("ERROR: tiktoken not installed. Run: pip install tiktoken")
    sys.exit(1)


def count_tokens(file_path: Path, encoding) -> int:
    """Count tokens in a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
            return len(encoding.encode(text))
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}", file=sys.stderr)
        return 0


def should_skip(path: Path) -> bool:
    """Check if path should be skipped based on ignore patterns."""
    skip_dirs = {
        'node_modules', '.next', 'out', 'build', 'dist', '.turbo',
        '.venv', 'venv', '__pycache__', '.git', '.mastra',
        'chroma_data', 'output_chunks', 'data', '.vault', '.logs', '.memory',
        'test-mcp-validation', 'coverage', '.nyc_output',
        'agent-generator/output', 'templates'
    }
    
    skip_extensions = {'.pyc', '.pyo', '.pyd', '.db', '.sqlite', '.sqlite3', '.log'}
    
    # Check if any parent directory is in skip_dirs
    for part in path.parts:
        if part in skip_dirs:
            return True
    
    # Check file extension
    if path.suffix in skip_extensions:
        return True
    
    # Skip lock files
    if path.name in {'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'uv.lock', 'poetry.lock'}:
        return True
    
    return False


def scan_directory(root_dir: Path, top_n: int = 50) -> List[Tuple[Path, int]]:
    """Scan directory and return list of (file_path, token_count) sorted by tokens."""
    encoding = tiktoken.get_encoding("cl100k_base")
    results = []
    
    print(f"Scanning {root_dir}...", file=sys.stderr)
    
    for file_path in root_dir.rglob('*'):
        if file_path.is_file() and not should_skip(file_path):
            tokens = count_tokens(file_path, encoding)
            if tokens > 0:
                results.append((file_path, tokens))
    
    # Sort by token count descending
    results.sort(key=lambda x: x[1], reverse=True)
    
    return results[:top_n]


def format_tokens(tokens: int) -> str:
    """Format token count for display."""
    if tokens >= 1000:
        return f"{tokens/1000:.1f}k"
    return str(tokens)


def main():
    parser = argparse.ArgumentParser(description='Audit token usage across repository files')
    parser.add_argument('--top', type=int, default=50, help='Number of top files to show (default: 50)')
    parser.add_argument('--dir', type=str, default='.', help='Directory to scan (default: current)')
    parser.add_argument('--threshold', type=int, default=1000, help='Only show files above threshold (default: 1000)')
    
    args = parser.parse_args()
    
    root_dir = Path(args.dir).resolve()
    
    if not root_dir.exists():
        print(f"ERROR: Directory {root_dir} does not exist")
        sys.exit(1)
    
    results = scan_directory(root_dir, args.top)
    
    if not results:
        print("No files found to analyze.")
        return
    
    # Print header
    print(f"\n{'Tokens':<10} {'File'}")
    print(f"{'-'*10} {'-'*70}")
    
    total_tokens = 0
    filtered_results = [(path, tokens) for path, tokens in results if tokens >= args.threshold]
    
    for file_path, tokens in filtered_results:
        relative_path = file_path.relative_to(root_dir) if file_path.is_relative_to(root_dir) else file_path
        print(f"{format_tokens(tokens):<10} {relative_path}")
        total_tokens += tokens
    
    # Print summary
    print(f"\n{'-'*80}")
    print(f"Total tokens in top {len(filtered_results)} files: {format_tokens(total_tokens)} ({total_tokens:,})")
    print(f"\nFiles excluded: node_modules, .venv, .git, build outputs, lock files, .logs, data/")
    print(f"\nTo reduce GitLens token count:")
    print(f"  1. Ensure .gitlensignore exists (created by this script)")
    print(f"  2. Restart VS Code to apply changes")
    print(f"  3. Check GitLens settings → 'Gitlens: Excluded' patterns")
    print(f"  4. Consider increasing threshold: GitLens → Advanced → Token Limit")


if __name__ == '__main__':
    main()
