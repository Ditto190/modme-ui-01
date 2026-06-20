#!/usr/bin/env python3
"""
Create a real GenUI collection from the ModMe UI repository.
Scans for actual GenUI-related files.
"""

import re
import sys
from pathlib import Path
from typing import Any, Dict, List

import yaml


# Mock ToolContext for standalone execution
class MockToolContext:
    state = {}

def scan_repository_for_genui_items(repo_root: Path) -> List[Dict[str, Any]]:
    """Scan repository for GenUI-related files."""
    items = []
    
    # Define directories to search
    search_dirs = {
        "prompts": ("prompt", ".prompt.md"),
        "instructions": ("instruction", ".instructions.md"),
        "agents": ("agent", ".agent.md"),
    }
    
    print(f"🔍 Scanning repository: {repo_root}")
    
    for dir_name, (kind, suffix) in search_dirs.items():
        dir_path = repo_root / dir_name
        if not dir_path.exists():
            print(f"   ⚠️  Directory not found: {dir_path}")
            continue
        
        print(f"   📁 Searching {dir_name}/ for *{suffix} files...")
        
        for file_path in dir_path.rglob(f"*{suffix}"):
            # Read file to check for GenUI-related content
            try:
                content = file_path.read_text()
                
                # Check for GenUI-related keywords
                genui_keywords = [
                    "genui", "generative ui", "copilotkit", 
                    "adk", "workbench", "dashboard", "canvas"
                ]
                
                content_lower = content.lower()
                if any(keyword in content_lower for keyword in genui_keywords):
                    relative_path = file_path.relative_to(repo_root)
                    
                    # Extract title/description from content
                    usage = f"GenUI-related {kind}"
                    lines = content.split('\n')
                    for line in lines[:20]:  # Check first 20 lines
                        if line.startswith('#'):
                            usage = line.lstrip('#').strip()
                            break
                    
                    items.append({
                        "path": str(relative_path),
                        "kind": kind,
                        "usage": usage
                    })
                    print(f"      ✓ Found: {relative_path}")
            
            except Exception as e:
                print(f"      ⚠️  Error reading {file_path}: {e}")
    
    return items


def create_genui_collection(items: List[Dict[str, Any]], output_path: str) -> Dict[str, str]:
    """Create GenUI collection from discovered items."""
    
    collection = {
        "id": "genui-production",
        "name": "GenUI Production Collection",
        "description": "Production-ready Generative UI patterns, agents, and instructions for building AI-powered dashboards with CopilotKit and Google ADK",
        "items": items,
        "tags": ["genui", "copilotkit", "adk", "generative-ui", "production"],
        "display": {
            "ordering": "alpha",
            "featured": True,
            "show_badge": True
        }
    }
    
    # Generate YAML
    yaml_content = yaml.dump(
        collection,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True
    )
    
    # Write to file
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(yaml_content)
    
    return {
        "status": "success",
        "message": f"Collection created at {output_path}",
        "yaml_content": yaml_content,
        "file_path": str(output_file.absolute()),
        "item_count": len(items)
    }


def create_copilot_prompts_collection(repo_root: Path) -> Dict[str, str]:
    """Create collection from prompts/copilot/ directory."""
    
    prompts_dir = repo_root / "prompts" / "copilot"
    items = []
    
    print(f"\n🔍 Scanning CopilotKit prompts: {prompts_dir}")
    
    if prompts_dir.exists():
        for file_path in prompts_dir.glob("*.md"):
            relative_path = file_path.relative_to(repo_root)
            
            # Extract title from first line
            try:
                first_line = file_path.read_text().split('\n')[0]
                usage = first_line.lstrip('#').strip()
            except:
                usage = f"CopilotKit prompt: {file_path.stem}"
            
            items.append({
                "path": str(relative_path),
                "kind": "prompt",
                "usage": usage
            })
            print(f"   ✓ Found: {relative_path}")
    
    if not items:
        return {
            "status": "error",
            "message": "No CopilotKit prompts found"
        }
    
    collection = {
        "id": "copilotkit-prompts",
        "name": "CopilotKit Prompts",
        "description": "CopilotKit-specific prompts for molecule definitions, tools, canvas operations, testing, and refactoring",
        "items": items,
        "tags": ["copilotkit", "prompts", "genui"],
        "display": {
            "ordering": "manual",
            "featured": True
        }
    }
    
    output_path = repo_root / "collections" / "copilotkit-prompts.collection.yml"
    yaml_content = yaml.dump(collection, default_flow_style=False, sort_keys=False, allow_unicode=True)
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(yaml_content)
    
    return {
        "status": "success",
        "message": f"Collection created at {output_path}",
        "file_path": str(output_path.absolute()),
        "item_count": len(items)
    }


def main():
    """Create real GenUI collections from repository."""
    
    print("\n" + "="*60)
    print("🎯 CREATING REAL GENUI COLLECTIONS")
    print("="*60)
    
    repo_root = Path(__file__).parent.parent.parent
    print(f"Repository root: {repo_root}\n")
    
    # Create CopilotKit prompts collection
    print("\n📦 Creating CopilotKit Prompts Collection")
    print("-" * 60)
    result = create_copilot_prompts_collection(repo_root)
    
    if result["status"] == "success":
        print(f"\n✅ {result['message']}")
        print(f"📊 Items: {result['item_count']}")
        print(f"📁 File: {result['file_path']}")
    else:
        print(f"\n❌ {result['message']}")
    
    # Scan for GenUI items
    print("\n\n📦 Creating GenUI Production Collection")
    print("-" * 60)
    items = scan_repository_for_genui_items(repo_root)
    
    if items:
        result = create_genui_collection(
            items,
            str(repo_root / "collections" / "genui-production.collection.yml")
        )
        
        print(f"\n✅ {result['message']}")
        print(f"📊 Items found: {result['item_count']}")
        print(f"📁 File: {result['file_path']}")
        
        print("\n📄 Preview of collection items:")
        for i, item in enumerate(items[:5], 1):
            print(f"   {i}. [{item['kind']}] {item['path']}")
        if len(items) > 5:
            print(f"   ... and {len(items) - 5} more items")
    else:
        print("\n⚠️  No GenUI-related items found in repository")
    
    print("\n" + "="*60)
    print("✅ Collection creation completed!")
    print("="*60)
    print("\n📁 Generated collections:")
    print("   - collections/copilotkit-prompts.collection.yml")
    print("   - collections/genui-production.collection.yml")
    print("\n")


if __name__ == "__main__":
    main()
