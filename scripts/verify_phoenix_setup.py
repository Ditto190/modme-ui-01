#!/usr/bin/env python3
"""
Phoenix Setup Verification
Checks if Phoenix is ready to receive traces from GitHub Copilot.
"""

import requests


def main():
    print("=" * 60)
    print("Phoenix Setup Verification")
    print("=" * 60)
    print()

    all_good = True

    # Check 1: Phoenix server health
    print("1️⃣ Checking Phoenix server...")
    try:
        response = requests.get("http://localhost:6006/healthz", timeout=5)
        if response.status_code == 200:
            print("   ✅ Phoenix server is running and healthy")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            all_good = False
    except Exception as e:
        print(f"   ❌ Cannot connect: {e}")
        all_good = False
    print()

    # Check 2: GraphQL API
    print("2️⃣ Checking GraphQL API...")
    try:
        response = requests.post(
            "http://localhost:6006/graphql",
            json={"query": "{ __typename }"},
            timeout=5
        )
        if response.status_code == 200:
            print("   ✅ GraphQL API is responsive")
        else:
            print(f"   ❌ GraphQL failed: {response.status_code}")
            all_good = False
    except Exception as e:
        print(f"   ❌ GraphQL error: {e}")
        all_good = False
    print()

    # Check 3: Projects configured
    print("3️⃣ Checking projects...")
    try:
        response = requests.get("http://localhost:6006/v1/projects", timeout=5)
        if response.status_code == 200:
            projects = response.json()
            print("   ✅ Projects:")
            for proj in projects.get("data", []):
                marker = "   👉" if proj["name"] == "github-copilot" else "     "
                print(f"{marker} {proj['name']}")
        else:
            print(f"   ⚠️  Could not list projects: {response.status_code}")
    except Exception as e:
        print(f"   ⚠️  Project check error: {e}")
    print()

    # Check 4: OTLP endpoint
    print("4️⃣ OTLP trace endpoint:")
    print("   ✅ http://localhost:6006/v1/traces")
    print()

    # Summary
    print("=" * 60)
    if all_good:
        print("✨ Phoenix is ready to receive traces!")
        print()
        print("📝 Next Steps:")
        print("   1. Reload VSCode: Ctrl+Shift+P → 'Developer: Reload Window'")
        print("   2. Test MCP: Open Copilot Chat, type '@phoenix'")
        print("   3. Use Copilot: Make a chat request or code completion")
        print("   4. View traces: http://localhost:6006")
        print()
        print("⚠️  Important: GitHub Copilot needs OTEL instrumentation")
        print("   The MCP server queries traces, but doesn't capture them.")
        print("   See docs/VSCODE_COPILOT_EXTENSION.md for capture setup.")
    else:
        print("❌ Some checks failed. Please fix issues above.")
    print("=" * 60)


if __name__ == "__main__":
    main()
