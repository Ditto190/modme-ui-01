#!/usr/bin/env python3
"""
Quick Phoenix Health Check

Tests that Phoenix is running and accessible.
"""

import sys

try:
    import requests
except ImportError:
    print("❌ requests library not found. Install with: pip install requests")
    sys.exit(1)


def check_phoenix():
    """Check if Phoenix is running and accessible."""
    print("🔍 Checking Phoenix server...")

    try:
        # Check health endpoint
        response = requests.get("http://localhost:6006/healthz", timeout=5)
        if response.status_code == 200:
            print("✅ Phoenix is running at http://localhost:6006")
            print(f"   Status: {response.text}")

            # Try to query GraphQL
            print("\n🔍 Testing GraphQL API...")
            graphql_response = requests.post(
                "http://localhost:6006/graphql",
                json={
                    "query": "{ __typename }"
                },
                timeout=5
            )

            if graphql_response.status_code == 200:
                print("✅ GraphQL API is responsive")
            else:
                print(f"⚠️  GraphQL returned {graphql_response.status_code}")

            print("\n✨ Phoenix is ready!")
            print("\n📊 Next steps:")
            print("   1. Open Phoenix UI: http://localhost:6006")
            print("   2. Restart VSCode to load MCP config")
            print("   3. Test MCP tools: Type @phoenix in Copilot Chat")
            return True

        else:
            print(f"❌ Phoenix returned status {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Phoenix at http://localhost:6006")
        print("\n💡 To start Phoenix:")
        print("   Option 1 (Python): python -m phoenix.server.main serve")
        print("   Option 2 (Docker): docker run -p 6006:6006 -p 4317:4317 arizephoenix/phoenix:latest")
        return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    success = check_phoenix()
    sys.exit(0 if success else 1)
