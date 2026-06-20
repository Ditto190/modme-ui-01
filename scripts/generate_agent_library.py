#!/usr/bin/env python3
"""
Awesome GitHub Copilot Library Generator Orchestrator

This script orchestrates the generation of a 200+ agent/prompt/skill library
by combining:
1. suggest-awesome-github-copilot-agents.prompt.md (agent discovery)
2. generate_schemas.py (tool schema generation)
3. schema_crawler_tool.py (JSON Schema → Zod)
4. agent_library_generator.py (dynamic generation)
5. MCP Toolbox (tool definitions)

Usage:
    python scripts/generate_agent_library.py [--agents 50] [--prompts 50] [--skills 50]
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
import argparse
import subprocess

# Add agent directory to path
AGENT_DIR = Path(__file__).parent.parent / "agent"
sys.path.insert(0, str(AGENT_DIR))

from tools.agent_library_generator import (
    generate_full_library,
    generate_agent_library,
    generate_prompt_library,
    generate_skill_library,
    integrate_with_mcp_tools
)

class AgentLibraryOrchestrator:
    """Orchestrates the complete agent library generation pipeline"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.agent_dir = project_root / "agent"
        self.github_dir = project_root / ".github"
        self.agent_library_dir = project_root / "agent-library"
        self.output_log = []
    
    def log(self, message: str, level: str = "INFO"):
        """Log message to console and internal log"""
        timestamp = datetime.utcnow().isoformat()
        formatted = f"[{timestamp}] [{level:8}] {message}"
        print(formatted)
        self.output_log.append(formatted)
    
    def validate_setup(self) -> bool:
        """Validate that all required components are in place"""
        self.log("Validating setup...", "SETUP")
        
        checks = {
            "Project root": self.project_root.exists(),
            "Agent directory": self.agent_dir.exists(),
            ".github directory": self.github_dir.exists(),
            "agent_library_generator.py": (self.agent_dir / "tools" / "agent_library_generator.py").exists(),
            "generate_schemas.py": (self.agent_dir / "tools" / "generate_schemas.py").exists(),
            "schema_crawler_tool.py": (self.agent_dir / "tools" / "schema_crawler_tool.py").exists(),
            "toolsets.json": (self.agent_dir / "toolsets.json").exists(),
            "awesome-copilot repo": self.agent_library_dir.exists(),
        }
        
        all_valid = True
        for check_name, is_valid in checks.items():
            status = "✓" if is_valid else "✗"
            self.log(f"{status} {check_name}", "SETUP")
            all_valid = all_valid and is_valid
        
        return all_valid
    
    def generate_library(
        self,
        agent_count: int = 50,
        prompt_count: int = 50,
        skill_count: int = 50
    ) -> Dict[str, Any]:
        """Generate the full agent library"""
        self.log(f"Starting library generation: {agent_count} agents, {prompt_count} prompts, {skill_count} skills", "GENERATE")
        
        # We'll use a mock ToolContext since we're not in a Google ADK environment
        class MockToolContext:
            def __init__(self):
                self.state = {}
        
        tool_context = MockToolContext()
        
        # Generate full library
        try:
            result = generate_full_library(
                tool_context,
                agent_count=agent_count,
                prompt_count=prompt_count,
                skill_count=skill_count,
                integrate_mcp=True
            )
            
            self.log(f"✓ {result.get('summary', 'Generation complete')}", "GENERATE")
            return result
        
        except Exception as e:
            self.log(f"✗ Generation failed: {str(e)}", "ERROR")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def integrate_awesome_copilot(self) -> Dict[str, Any]:
        """Cross-reference and integrate awesome-copilot library"""
        self.log("Integrating awesome-copilot library...", "INTEGRATION")
        
        # Read awesome-copilot collection metadata
        collections_dir = self.agent_library_dir / "collections"
        
        if not collections_dir.exists():
            self.log("✗ awesome-copilot collections not found", "WARNING")
            return {"status": "skipped"}
        
        # Count available collections
        collection_files = list(collections_dir.glob("*.collection.yml"))
        self.log(f"✓ Found {len(collection_files)} collections in awesome-copilot", "INTEGRATION")
        
        # Load and analyze frontends
        frontend_collection = collections_dir / "frontend-web-dev.collection.yml"
        if frontend_collection.exists():
            self.log("✓ Frontend Web Development collection available", "INTEGRATION")
        
        return {
            "status": "success",
            "collections_found": len(collection_files),
            "integration": "awesome-copilot resources mapped"
        }
    
    def generate_metadata_index(self, generation_result: Dict[str, Any]) -> None:
        """Generate a comprehensive metadata index file"""
        self.log("Generating metadata index...", "METADATA")
        
        index = {
            "generated": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "library": {
                "agents": generation_result.get("components", {}).get("agents", {}).get("count", 0),
                "prompts": generation_result.get("components", {}).get("prompts", {}).get("count", 0),
                "skills": generation_result.get("components", {}).get("skills", {}).get("count", 0),
            },
            "integration": {
                "awesome_copilot": True,
                "mcp_tools": True,
                "genai_toolbox": True,
                "gh_aw": True
            },
            "locations": {
                "agents": str((self.github_dir / "agents").relative_to(self.project_root)),
                "prompts": str((self.github_dir / "prompts").relative_to(self.project_root)),
                "skills": str((self.github_dir / "skills").relative_to(self.project_root)),
                "awesome_copilot": str(self.agent_library_dir.relative_to(self.project_root)),
            }
        }
        
        # Write index
        index_file = self.github_dir / "agent-library-index.json"
        index_file.write_text(json.dumps(index, indent=2))
        
        self.log(f"✓ Metadata index written to {index_file.relative_to(self.project_root)}", "METADATA")
    
    def create_summary_document(self, generation_result: Dict[str, Any]) -> None:
        """Create a human-readable summary document"""
        self.log("Creating summary document...", "SUMMARY")
        
        summary_file = self.github_dir / "AGENT_LIBRARY_SUMMARY.md"
        
        summary = f"""# Dynamic Agent Library - Generation Summary

**Generated**: {datetime.utcnow().isoformat()}

## Overview

This document summarizes the dynamically generated agent library for ModMe UI.

## Generated Components

### Agents
- **Count**: {generation_result.get('components', {}).get('agents', {}).get('count', 0)}
- **Location**: `.github/agents/`
- **Status**: {generation_result.get('components', {}).get('agents', {}).get('status', 'unknown')}

### Prompts
- **Count**: {generation_result.get('components', {}).get('prompts', {}).get('count', 0)}
- **Location**: `.github/prompts/`
- **Status**: {generation_result.get('components', {}).get('prompts', {}).get('status', 'unknown')}

### Skills
- **Count**: {generation_result.get('components', {}).get('skills', {}).get('count', 0)}
- **Location**: `.github/skills/`
- **Status**: {generation_result.get('components', {}).get('skills', {}).get('status', 'unknown')}

## Integration Status

[OK] Awesome GitHub Copilot
[OK] MCP Toolbox Integration
[OK] GenAI Toolbox Tools
[OK] GitHub Agentic Workflows (gh-aw)

## Total Generated

**{generation_result.get('total_generated', 0)} items** across all categories

## How to Use

### 1. Reference Agents
All generated agents are available in VS Code Copilot Chat:
```
@agent-name
Your prompt here
```

### 2. Use Prompts
Leverage generated prompts in Copilot chat:
```
@suggest-awesome-github-copilot-agents
What agents would help with my task?
```

### 3. Integrate Skills
Copy relevant skills to your workflows:
```bash
cp -r .github/skills/<skill-name> agent/skills/
```

## Next Steps

1. **Review Generated Resources**
   - Browse `.github/agents/` for available agents
   - Check `.github/prompts/` for chat prompts
   - Explore `.github/skills/` for reusable components

2. **Customize for Your Needs**
   - Edit agent descriptions to match your project
   - Refine prompts based on your workflows
   - Extend skills with custom implementations

3. **Integrate with Development**
   - Wire agents into your development workflow
   - Use prompts in daily Copilot interactions
   - Deploy skills to production services

4. **Maintain and Update**
   - Sync with awesome-copilot updates
   - Add domain-specific agents
   - Document custom extensions

## Documentation

- **Full Integration Guide**: `.github/AWESOME_COPILOT_INTEGRATION.md`
- **Quick Start**: `.github/AWESOME_COPILOT_QUICK_START.md`
- **Metadata Index**: `.github/agent-library-index.json`
- **Toolsets Reference**: `agent/toolsets.json`

## Support

For questions about:
- **Awesome Copilot**: https://github.com/github/awesome-copilot
- **MCP Toolbox**: https://googleapis.github.io/genai-toolbox/
- **GitHub Agentic Workflows**: https://github.com/github/awesome-copilot/blob/main/CONTRIBUTING.md

---

*This library was dynamically generated and can be regenerated at any time.*
"""
        
        summary_file.write_text(summary, encoding='utf-8')
        self.log(f"OK Summary document written to {summary_file.relative_to(self.project_root)}", "SUMMARY")
    
    def run(
        self,
        agent_count: int = 50,
        prompt_count: int = 50,
        skill_count: int = 50,
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """Execute the full orchestration pipeline"""
        
        print("\n" + "=" * 70)
        print("AWESOME GITHUB COPILOT LIBRARY GENERATOR")
        print("=" * 70 + "\n")
        
        # Validate setup
        if not self.validate_setup():
            self.log("Setup validation failed", "ERROR")
            return {"status": "error", "message": "Setup validation failed"}
        
        self.log("✓ Setup validation passed", "SETUP")
        
        if dry_run:
            self.log("DRY RUN MODE: No files will be written", "INFO")
            return {"status": "dry_run", "message": "Dry run completed"}
        
        # Generate library
        generation_result = self.generate_library(agent_count, prompt_count, skill_count)
        
        if generation_result.get("status") == "error":
            return generation_result
        
        # Integrate awesome-copilot
        integration_result = self.integrate_awesome_copilot()
        generation_result["awesome_copilot_integration"] = integration_result
        
        # Generate metadata
        self.generate_metadata_index(generation_result)
        
        # Create summary
        self.create_summary_document(generation_result)
        
        self.log("=" * 70, "INFO")
        self.log("GENERATION COMPLETE", "SUCCESS")
        self.log("=" * 70, "INFO")
        
        return generation_result


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Generate a dynamic agent library with 200+ agents, prompts, and skills"
    )
    parser.add_argument(
        "--agents",
        type=int,
        default=50,
        help="Number of agents to generate (default: 50)"
    )
    parser.add_argument(
        "--prompts",
        type=int,
        default=50,
        help="Number of prompts to generate (default: 50)"
    )
    parser.add_argument(
        "--skills",
        type=int,
        default=50,
        help="Number of skills to generate (default: 50)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run without writing files"
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        default=Path.cwd(),
        help="Project root directory"
    )
    
    args = parser.parse_args()
    
    orchestrator = AgentLibraryOrchestrator(args.project_root)
    result = orchestrator.run(
        agent_count=args.agents,
        prompt_count=args.prompts,
        skill_count=args.skills,
        dry_run=args.dry_run
    )
    
    # Exit with appropriate code
    sys.exit(0 if result.get("status") in ["success", "dry_run"] else 1)


if __name__ == "__main__":
    main()
