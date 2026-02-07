#!/usr/bin/env python3
"""
Phoenix Project Manager
Demonstrates how to manage Phoenix projects using the Python Client SDK.
"""

import os
from phoenix.client import Client


def main():
    # Initialize Phoenix client
    endpoint = os.getenv("PHOENIX_ENDPOINT", "http://localhost:6006")
    client = Client(endpoint=endpoint)
    
    print(f"📡 Connected to Phoenix at {endpoint}\n")
    
    # List all projects
    print("📂 Available Projects:")
    print("-" * 50)
    projects = client.projects.list()
    for project in projects:
        print(f"  • {project['name']:20} (ID: {project['id']})")
        if project.get('description'):
            print(f"    Description: {project['description']}")
    print()
    
    # Create a new project (example - commented out to avoid duplicates)
    # print("➕ Creating new project...")
    # new_project = client.projects.create(
    #     name="vscode-copilot",
    #     description="VSCode GitHub Copilot traces"
    # )
    # print(f"✅ Created project: {new_project['name']} (ID: {new_project['id']})\n")
    
    # Get specific project
    print("🔍 Getting project details:")
    print("-" * 50)
    project = client.projects.get("github-copilot")  # By name or ID
    print(f"  Name: {project['name']}")
    print(f"  ID: {project['id']}")
    print(f"  Description: {project.get('description', 'N/A')}")
    print()


if __name__ == "__main__":
    main()
