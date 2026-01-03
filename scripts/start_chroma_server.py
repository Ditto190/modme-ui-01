#!/usr/bin/env python3
"""
start_chroma_server.py - ChromaDB HTTP Server Launcher

Launches a ChromaDB HTTP server for MCP integration. This server enables
multiple clients (agents, MCP tools, frontend) to connect and share
the same vector database.

Part A of the dual ChromaDB architecture:
- Provides HTTP API for ChromaDB operations
- Enables MCP chroma-core tools integration
- Session-scoped persistence (terminates with codespace)

Usage:
    # Start with default settings
    python start_chroma_server.py

    # Start with custom port and persistence
    python start_chroma_server.py --port 8001 --persist-dir ./chroma_session

    # Start in-memory only (no persistence)
    python start_chroma_server.py --ephemeral
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path


# Default configuration
DEFAULT_PORT = 8001
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PERSIST_DIR = "./.chroma_server"


def check_chroma_installed() -> bool:
    """Check if chromadb is installed."""
    try:
        import chromadb  # noqa: E402
        return True
    except ImportError:
        return False


def wait_for_server(host: str, port: int, timeout: int = 30) -> bool:
    """Wait for ChromaDB server to become available."""
    import urllib.request  # noqa: E402
    import urllib.error  # noqa: E402
    
    url = f"http://{host}:{port}/api/v2/heartbeat"
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    return True
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError):
            pass
        time.sleep(1)
    
    return False


def start_server_subprocess(
    host: str,
    port: int,
    persist_dir: str | None,
    log_file: str | None = None,
) -> subprocess.Popen:
    """Start ChromaDB server as a subprocess."""
    cmd = [
        sys.executable, "-m", "chromadb.cli",
        "run",
        "--host", host,
        "--port", str(port),
    ]
    
    if persist_dir:
        cmd.extend(["--path", persist_dir])
    
    # Set environment
    env = os.environ.copy()
    env["ANONYMIZED_TELEMETRY"] = "False"
    
    # Output handling
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        stdout = open(log_path, "w")
        stderr = subprocess.STDOUT
    else:
        stdout = None
        stderr = None
    
    process = subprocess.Popen(
        cmd,
        env=env,
        stdout=stdout,
        stderr=stderr,
        start_new_session=True,
    )
    
    return process


def start_server_embedded(
    host: str,
    port: int,
    persist_dir: str | None,
) -> None:
    """Start ChromaDB server in the current process."""
    try:
        import chromadb  # noqa: E402
        from chromadb.config import Settings  # noqa: E402
    except ImportError:
        print("❌ chromadb not installed. Run: pip install chromadb")
        sys.exit(1)
    
    try:
        import uvicorn  # noqa: E402
        from chromadb.server import create_app  # noqa: E402
    except ImportError:
        print("❌ uvicorn not installed. Run: pip install uvicorn")
        sys.exit(1)
    
    # Configure settings
    settings = Settings(
        chroma_api_impl="chromadb.api.fastapi.FastAPI",
        chroma_server_host=host,
        chroma_server_http_port=port,
        anonymized_telemetry=False,
        allow_reset=True,
    )
    
    if persist_dir:
        settings.persist_directory = persist_dir
        settings.is_persistent = True
    
    # Create and run app
    print(f"🚀 Starting ChromaDB server on {host}:{port}")
    if persist_dir:
        print(f"💾 Persistence directory: {persist_dir}")
    else:
        print("🧪 Running in ephemeral mode (no persistence)")
    
    uvicorn.run(
        "chromadb.server:create_app",
        host=host,
        port=port,
        factory=True,
        log_level="info",
    )


def create_mcp_config(host: str, port: int) -> dict:
    """Generate MCP configuration for ChromaDB server."""
    return {
        "chroma-core": {
            "command": "uvx",
            "args": [
                "chroma-mcp",
                "--client-type", "http",
                "--host", host,
                "--port", str(port),
            ],
            "env": {
                "CHROMA_HOST": host,
                "CHROMA_PORT": str(port),
            }
        }
    }


def print_connection_info(host: str, port: int, persist_dir: str | None):
    """Print connection information for various clients."""
    print("\n" + "=" * 60)
    print("🔗 ChromaDB Server Connection Information")
    print("=" * 60)
    
    # HTTP endpoint
    endpoint = f"http://{host}:{port}"
    print(f"\n📡 HTTP Endpoint: {endpoint}")
    print(f"   Heartbeat: {endpoint}/api/v2/heartbeat")
    print(f"   Collections: {endpoint}/api/v2/collections")
    
    # Python client
    print("\n🐍 Python Client:")
    print("   import chromadb")
    print(f"   client = chromadb.HttpClient(host='{host}', port={port})")
    
    # MCP configuration
    print("\n🔧 MCP Configuration (add to mcp.json):")
    mcp_config = create_mcp_config(host, port)
    import json
    print(f"   {json.dumps(mcp_config, indent=4)}")
    
    # Environment variables
    print("\n🌍 Environment Variables:")
    print(f"   CHROMA_HOST={host}")
    print(f"   CHROMA_PORT={port}")
    
    if persist_dir:
        print(f"\n💾 Data Directory: {Path(persist_dir).absolute()}")
    
    print("\n" + "=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Start ChromaDB HTTP server for MCP integration"
    )
    
    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help=f"Server host (default: {DEFAULT_HOST})"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help=f"Server port (default: {DEFAULT_PORT})"
    )
    parser.add_argument(
        "--persist-dir",
        default=DEFAULT_PERSIST_DIR,
        help=f"Persistence directory (default: {DEFAULT_PERSIST_DIR})"
    )
    parser.add_argument(
        "--ephemeral",
        action="store_true",
        help="Run in ephemeral mode (no persistence)"
    )
    parser.add_argument(
        "--background",
        action="store_true",
        help="Run as background process"
    )
    parser.add_argument(
        "--log-file",
        help="Log file path (background mode only)"
    )
    parser.add_argument(
        "--show-config",
        action="store_true",
        help="Show connection info and exit"
    )
    
    args = parser.parse_args()
    
    # Check installation
    if not check_chroma_installed():
        print("❌ chromadb not installed. Run: pip install chromadb")
        sys.exit(1)
    
    # Determine persistence directory
    persist_dir = None if args.ephemeral else args.persist_dir
    
    # Show config only
    if args.show_config:
        print_connection_info(args.host, args.port, persist_dir)
        return
    
    # Create persistence directory if needed
    if persist_dir:
        Path(persist_dir).mkdir(parents=True, exist_ok=True)
    
    if args.background:
        # Start as background process
        print("🚀 Starting ChromaDB server in background...")
        
        process = start_server_subprocess(
            host=args.host,
            port=args.port,
            persist_dir=persist_dir,
            log_file=args.log_file,
        )
        
        print(f"⏳ Waiting for server to start (PID: {process.pid})...")
        
        if wait_for_server("127.0.0.1", args.port):
            print("✅ ChromaDB server started successfully")
            print_connection_info(args.host, args.port, persist_dir)
            
            # Save PID file
            pid_file = Path(persist_dir or ".") / "chroma_server.pid"
            pid_file.write_text(str(process.pid))
            print(f"\n📝 PID file: {pid_file}")
        else:
            print("❌ Server failed to start")
            process.terminate()
            sys.exit(1)
    else:
        # Start in foreground
        print_connection_info(args.host, args.port, persist_dir)
        print("\n⏳ Starting server (Ctrl+C to stop)...\n")
        
        try:
            start_server_embedded(
                host=args.host,
                port=args.port,
                persist_dir=persist_dir,
            )
        except KeyboardInterrupt:
            print("\n\n🛑 Server stopped")


if __name__ == "__main__":
    main()
