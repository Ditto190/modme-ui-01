#!/usr/bin/env python3
"""
Journal CLI - Lightweight runner for journal adapter.

Supports both local file writes and optional remote MCP server calls.
Designed for GitHub Actions and local development.

Usage:
    # Local mode (default)
    python journal-cli.py write "My journal entry"
    
    # With custom path
    python journal-cli.py write "Entry" --journal-path /path/to/journal
    
    # Remote mode (call MCP server)
    python journal-cli.py write "Entry" --remote http://localhost:8000
    
    # Read last entry
    python journal-cli.py read --last
    
    # List entries
    python journal-cli.py list --date 2026-01-07
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

# Add parent directories to path for imports
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
AGENT_DIR = REPO_ROOT / "agent"

sys.path.insert(0, str(AGENT_DIR))

try:
    from tools.journal_adapter import _current_timestamp_parts, process_feelings
except ImportError:
    print("Error: Could not import journal_adapter. Run from repo root.", file=sys.stderr)
    sys.exit(1)


class MockToolContext:
    """Mock ToolContext for CLI usage."""
    
    def __init__(self):
        self.state = {}


def write_local(entry: str, journal_path: Optional[str] = None) -> Dict[str, str]:
    """Write entry using local adapter."""
    context = MockToolContext()
    result = process_feelings(context, entry, journal_path)
    return result


def write_remote(entry: str, remote_url: str) -> Dict[str, str]:
    """Write entry by calling remote MCP server."""
    try:
        import requests
    except ImportError:
        return {
            "status": "error",
            "message": "requests library required for remote mode. Install: pip install requests"
        }
    
    try:
        response = requests.post(
            f"{remote_url}/process_feelings",
            json={"diary_entry": entry},
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"status": "error", "message": f"Remote call failed: {e}"}


def read_last(journal_path: Optional[str] = None) -> Optional[Dict]:
    """Read the most recent journal entry."""
    root = journal_path or os.path.join(os.getcwd(), ".private-journal")
    
    if not os.path.exists(root):
        return None
    
    # Find most recent date directory
    date_dirs = sorted([d for d in os.listdir(root) if os.path.isdir(os.path.join(root, d))], reverse=True)
    
    for date_dir in date_dirs:
        date_path = os.path.join(root, date_dir)
        files = sorted([f for f in os.listdir(date_path) if f.endswith('.json')], reverse=True)
        
        if files:
            filepath = os.path.join(date_path, files[0])
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
    
    return None


def list_entries(date: Optional[str] = None, journal_path: Optional[str] = None) -> list:
    """List journal entries for a date or all dates."""
    root = journal_path or os.path.join(os.getcwd(), ".private-journal")
    
    if not os.path.exists(root):
        return []
    
    entries = []
    
    if date:
        # List specific date
        date_path = os.path.join(root, date)
        if os.path.exists(date_path):
            files = sorted(os.listdir(date_path))
            for f in files:
                if f.endswith('.json'):
                    entries.append(os.path.join(date_path, f))
    else:
        # List all dates
        date_dirs = sorted(os.listdir(root), reverse=True)
        for date_dir in date_dirs:
            date_path = os.path.join(root, date_dir)
            if os.path.isdir(date_path):
                files = sorted(os.listdir(date_path), reverse=True)
                for f in files:
                    if f.endswith('.json'):
                        entries.append(os.path.join(date_path, f))
    
    return entries


def main():
    parser = argparse.ArgumentParser(
        description="Journal CLI - write and read journal entries",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Write command
    write_parser = subparsers.add_parser('write', help='Write a journal entry')
    write_parser.add_argument('entry', help='Journal entry text')
    write_parser.add_argument('--journal-path', help='Custom journal root directory')
    write_parser.add_argument('--remote', help='Remote MCP server URL (e.g., http://localhost:8000)')
    
    # Read command
    read_parser = subparsers.add_parser('read', help='Read journal entries')
    read_parser.add_argument('--last', action='store_true', help='Read most recent entry')
    read_parser.add_argument('--journal-path', help='Custom journal root directory')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List journal entries')
    list_parser.add_argument('--date', help='Filter by date (YYYY-MM-DD)')
    list_parser.add_argument('--journal-path', help='Custom journal root directory')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Execute command
    if args.command == 'write':
        if args.remote:
            result = write_remote(args.entry, args.remote)
        else:
            result = write_local(args.entry, args.journal_path)
        
        if result['status'] == 'success':
            print(f"✓ {result['message']}")
            if 'path' in result:
                print(f"  Path: {result['path']}")
            sys.exit(0)
        else:
            print(f"✗ Error: {result['message']}", file=sys.stderr)
            sys.exit(1)
    
    elif args.command == 'read':
        if args.last:
            entry = read_last(args.journal_path)
            if entry:
                print(json.dumps(entry, indent=2))
            else:
                print("No entries found", file=sys.stderr)
                sys.exit(1)
    
    elif args.command == 'list':
        entries = list_entries(args.date, args.journal_path)
        if entries:
            for path in entries:
                print(path)
        else:
            print("No entries found", file=sys.stderr)
            sys.exit(1)


if __name__ == '__main__':
    main()
