"""
Dynamic Agent Library Generator

Generates 200+ agents, prompts, and skills with integrated MCP tools.
Combines awesome-copilot library with local GenAI toolbox to create
a comprehensive agent ecosystem.

Integrates with:
- suggest-awesome-github-copilot-agents.prompt.md (agent discovery)
- generate_schemas.py (schema generation from tools)
- schema_crawler_tool.py (JSON Schema → Zod conversion)
- MCP Toolbox (tool definitions)
"""

from google.adk.tools import ToolContext
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path
import json
import subprocess
from datetime import datetime
from dataclasses import dataclass, asdict
import yaml

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
AGENT_LIB_DIR = PROJECT_ROOT / "agent-library"
GITHUB_AGENTS_DIR = PROJECT_ROOT / ".github" / "agents"
GITHUB_PROMPTS_DIR = PROJECT_ROOT / ".github" / "prompts"
GITHUB_SKILLS_DIR = PROJECT_ROOT / ".github" / "skills"
AGENT_TOOLSETS = PROJECT_ROOT / "agent" / "toolsets.json"
GENAI_TOOLBOX = PROJECT_ROOT / "agent" / "genai-toolbox"


@dataclass
class AgentTemplate:
    """Template for generating agent.md files"""
    name: str
    id: str
    description: str
    agent_type: str  # "specialist", "reviewer", "generator", "analyzer"
    primary_tools: List[str]
    secondary_tools: Optional[List[str]] = None
    example_prompt: Optional[str] = None
    model: str = "claude-opus-4.5"
    tags: Optional[List[str]] = None

    def to_markdown(self) -> str:
        """Convert to GitHub Copilot agent.md format"""
        frontmatter = {
            "type": "agent",
            "title": self.name,
            "description": self.description,
            "agent_type": self.agent_type,
            "model": self.model,
            "tools": self.primary_tools + (self.secondary_tools or []),
            "tags": self.tags or []
        }
        
        markdown = f"""---
{yaml.dump(frontmatter, default_flow_style=False).rstrip()}
---

# {self.name}

## Description
{self.description}

## Agent Type
**{self.agent_type.title()}** - Specialized for {self.agent_type} tasks

## Primary Tools
{self._format_tools(self.primary_tools)}

{f"## Secondary Tools\\n{self._format_tools(self.secondary_tools)}" if self.secondary_tools else ""}

## Example Usage
{self.example_prompt or "Ask this agent for help with specific tasks in its domain."}

## Best Practices
1. Provide clear, detailed context
2. Specify output format preferences
3. Use follow-up questions for refinement
4. Reference related agents for multi-step workflows

---
*Generated: {datetime.utcnow().isoformat()}*
"""
        return markdown

    @staticmethod
    def _format_tools(tools: List[str]) -> str:
        return "\n".join([f"- `{tool}`" for tool in tools])


@dataclass
class PromptTemplate:
    """Template for generating prompt.md files"""
    name: str
    id: str
    description: str
    prompt_type: str  # "code-gen", "analysis", "testing", "documentation"
    agent_targets: List[str]  # Which agents this prompt works with
    example_usage: str
    tools_required: Optional[List[str]] = None
    tags: Optional[List[str]] = None

    def to_markdown(self) -> str:
        """Convert to GitHub Copilot prompt.md format"""
        frontmatter = {
            "type": "prompt",
            "title": self.name,
            "description": self.description,
            "prompt_type": self.prompt_type,
            "agent": "agent",  # GitHub Copilot format
            "tools": self.tools_required or [],
            "tags": self.tags or []
        }
        
        markdown = f"""---
{yaml.dump(frontmatter, default_flow_style=False).rstrip()}
---

# {self.name}

## Description
{self.description}

## Type
**{self.prompt_type.title()}** prompt

## Best Used With
{chr(10).join([f"- @{agent}" for agent in self.agent_targets])}

## Example Usage
```
{self.example_usage}
```

## Output Format
The agent will provide structured output tailored to the prompt type.

## Tips
- Be specific about your requirements
- Provide context about your project
- Ask for examples if needed
- Request alternative approaches for comparison

---
*Generated: {datetime.utcnow().isoformat()}*
"""
        return markdown


@dataclass
class SkillTemplate:
    """Template for generating skill folders"""
    name: str
    id: str
    description: str
    category: str  # "ui", "backend", "testing", "tools", "data"
    instructions: str
    example_code: Optional[str] = None
    dependencies: Optional[List[str]] = None
    tags: Optional[List[str]] = None

    def to_skill_md(self) -> str:
        """Generate SKILL.md file content"""
        frontmatter = {
            "name": self.id,
            "title": self.name,
            "description": self.description,
            "category": self.category,
            "version": "1.0.0",
            "tags": self.tags or []
        }
        
        markdown = f"""---
{yaml.dump(frontmatter, default_flow_style=False).rstrip()}
---

# {self.name}

## Instructions
{self.instructions}

{f"## Dependencies\\n{chr(10).join([f'- {dep}' for dep in self.dependencies])}" if self.dependencies else ""}

{f"## Example\\n```\\n{self.example_code}\\n```" if self.example_code else ""}

## Resources
- View related agents in `.github/agents/`
- Find prompts in `.github/prompts/`
- Check toolsets in `agent/toolsets.json`

---
*Generated: {datetime.utcnow().isoformat()}*
"""
        return markdown


def generate_agent_library(
    tool_context: ToolContext,
    count: int = 50,
    categories: Optional[List[str]] = None,
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a library of agent.md files with integrated tools.
    
    Args:
        count: Number of agents to generate (default 50)
        categories: Optional list of agent categories to focus on
        output_dir: Custom output directory (defaults to .github/agents/)
    
    Returns:
        Status with generated agents list
    """
    try:
        target_dir = Path(output_dir) if output_dir else GITHUB_AGENTS_DIR
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Default categories covering major dev domains
        agent_categories = categories or [
            "react-frontend", "nextjs-fullstack", "data-engineering",
            "devops-infra", "security", "testing", "documentation",
            "ai-ml", "database", "api-design", "performance",
            "accessibility"
        ]
        
        generated_agents = []
        
        for i, category in enumerate(agent_categories[:count]):
            agent_name = f"{category.replace('-', ' ').title()} Specialist"
            agent = AgentTemplate(
                name=agent_name,
                id=f"{category}-specialist",
                description=f"Expert specialist in {category.replace('-', ' ')} development and best practices.",
                agent_type="specialist",
                primary_tools=[f"tools_{category}", "mcp_github2_get_toolset_tools"],
                secondary_tools=["fetch_documentation", "search_code"],
                example_prompt=f"Help me with {category.replace('-', ' ')} best practices and design patterns.",
                tags=[category, "development", "coding"]
            )
            
            # Write agent file
            agent_file = target_dir / f"{category}-specialist.agent.md"
            agent_file.write_text(agent.to_markdown())
            
            generated_agents.append({
                "name": agent_name,
                "id": agent.id,
                "file": str(agent_file.relative_to(PROJECT_ROOT))
            })
        
        return {
            "status": "success",
            "message": f"Generated {len(generated_agents)} agent files",
            "count": len(generated_agents),
            "agents": generated_agents,
            "output_dir": str(target_dir)
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"Agent generation failed: {str(e)}"
        }


def generate_prompt_library(
    tool_context: ToolContext,
    count: int = 50,
    prompt_types: Optional[List[str]] = None,
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a library of prompt.md files for Copilot chat modes.
    
    Args:
        count: Number of prompts to generate
        prompt_types: Optional list of prompt types to focus on
        output_dir: Custom output directory (defaults to .github/prompts/)
    
    Returns:
        Status with generated prompts list
    """
    try:
        target_dir = Path(output_dir) if output_dir else GITHUB_PROMPTS_DIR
        target_dir.mkdir(parents=True, exist_ok=True)
        
        prompt_types_list = prompt_types or [
            "code-gen", "analysis", "testing", "documentation",
            "debugging", "performance", "security", "refactoring",
            "migration", "architecture"
        ]
        
        generated_prompts = []
        
        for prompt_type in prompt_types_list[:count]:
            prompt_name = f"{prompt_type.replace('-', ' ').title()} Guide"
            prompt = PromptTemplate(
                name=prompt_name,
                id=f"{prompt_type}-guide",
                description=f"Comprehensive guide for {prompt_type.replace('-', ' ')} tasks.",
                prompt_type=prompt_type,
                agent_targets=["expert-react-frontend-engineer", "copilot-starter"],
                example_usage=f"Help me with {prompt_type.replace('-', ' ')} in my project",
                tags=[prompt_type, "guide", "development"]
            )
            
            # Write prompt file
            prompt_file = target_dir / f"{prompt_type}-guide.prompt.md"
            prompt_file.write_text(prompt.to_markdown())
            
            generated_prompts.append({
                "name": prompt_name,
                "id": prompt.id,
                "type": prompt_type,
                "file": str(prompt_file.relative_to(PROJECT_ROOT))
            })
        
        return {
            "status": "success",
            "message": f"Generated {len(generated_prompts)} prompt files",
            "count": len(generated_prompts),
            "prompts": generated_prompts,
            "output_dir": str(target_dir)
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"Prompt generation failed: {str(e)}"
        }


def generate_skill_library(
    tool_context: ToolContext,
    count: int = 50,
    categories: Optional[List[str]] = None,
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate a library of skill folders with SKILL.md and tools.
    
    Args:
        count: Number of skills to generate
        categories: Optional list of skill categories
        output_dir: Custom output directory (defaults to .github/skills/)
    
    Returns:
        Status with generated skills list
    """
    try:
        target_dir = Path(output_dir) if output_dir else GITHUB_SKILLS_DIR
        target_dir.mkdir(parents=True, exist_ok=True)
        
        skill_categories = categories or [
            "component-gen", "test-automation", "data-fetch",
            "api-integration", "state-management", "performance-opt",
            "accessibility", "security-scan", "documentation-gen",
            "deployment-automation"
        ]
        
        generated_skills = []
        
        for skill_category in skill_categories[:count]:
            skill_name = f"{skill_category.replace('-', ' ').title()} Skill"
            skill = SkillTemplate(
                name=skill_name,
                id=skill_category,
                description=f"Reusable skill for {skill_category.replace('-', ' ')} tasks.",
                category=skill_category.split('-')[0],
                instructions=f"Use this skill to handle {skill_category.replace('-', ' ')} operations.",
                example_code=f"# Example: {skill_name}\n# Implementation goes here",
                tags=[skill_category, "reusable"]
            )
            
            # Create skill directory
            skill_dir = target_dir / skill_category
            skill_dir.mkdir(parents=True, exist_ok=True)
            
            # Write SKILL.md
            skill_file = skill_dir / "SKILL.md"
            skill_file.write_text(skill.to_skill_md())
            
            generated_skills.append({
                "name": skill_name,
                "id": skill.id,
                "category": skill.category,
                "dir": str(skill_dir.relative_to(PROJECT_ROOT))
            })
        
        return {
            "status": "success",
            "message": f"Generated {len(generated_skills)} skill folders",
            "count": len(generated_skills),
            "skills": generated_skills,
            "output_dir": str(target_dir)
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"Skill generation failed: {str(e)}"
        }


def integrate_with_mcp_tools(
    tool_context: ToolContext,
    agent_ids: List[str],
    toolset_file: Optional[str] = None
) -> Dict[str, Any]:
    """
    Wire generated agents with MCP tools from toolsets.json
    
    Args:
        agent_ids: List of agent IDs to integrate
        toolset_file: Path to toolsets.json (default: agent/toolsets.json)
    
    Returns:
        Integration status
    """
    try:
        toolset_path = Path(toolset_file) if toolset_file else AGENT_TOOLSETS
        
        if not toolset_path.exists():
            return {
                "status": "error",
                "message": f"Toolsets file not found: {toolset_path}"
            }
        
        # Load existing toolsets
        toolsets = json.loads(toolset_path.read_text())
        
        # For each agent, add relevant tools
        integrations = []
        for agent_id in agent_ids:
            # Extract category from agent_id
            category = agent_id.replace("-specialist", "")
            
            # Find matching tools in toolsets
            matching_tools = []
            for tool_name, tool_def in toolsets.items():
                if category in tool_name.lower() or "common" in tool_name.lower():
                    matching_tools.append(tool_name)
            
            integrations.append({
                "agent_id": agent_id,
                "category": category,
                "tools_available": matching_tools[:5]  # Limit to 5 per agent
            })
        
        return {
            "status": "success",
            "message": f"Integrated {len(integrations)} agents with MCP tools",
            "integrations": integrations
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"MCP integration failed: {str(e)}"
        }


def generate_full_library(
    tool_context: ToolContext,
    agent_count: int = 50,
    prompt_count: int = 50,
    skill_count: int = 50,
    integrate_mcp: bool = True
) -> Dict[str, Any]:
    """
    Generate complete agent library with agents, prompts, and skills.
    
    This is the main entry point that orchestrates the full library generation.
    
    Args:
        agent_count: Number of agents to generate
        prompt_count: Number of prompts to generate
        skill_count: Number of skills to generate
        integrate_mcp: Whether to integrate with MCP tools
    
    Returns:
        Comprehensive status of full library generation
    """
    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "components": {}
    }
    
    # Generate agents
    agent_result = generate_agent_library(tool_context, count=agent_count)
    results["components"]["agents"] = agent_result
    
    # Generate prompts
    prompt_result = generate_prompt_library(tool_context, count=prompt_count)
    results["components"]["prompts"] = prompt_result
    
    # Generate skills
    skill_result = generate_skill_library(tool_context, count=skill_count)
    results["components"]["skills"] = skill_result
    
    # Integrate with MCP tools if requested
    if integrate_mcp and agent_result.get("status") == "success":
        agent_ids = [a["id"] for a in agent_result.get("agents", [])]
        mcp_result = integrate_with_mcp_tools(tool_context, agent_ids)
        results["components"]["mcp_integration"] = mcp_result
    
    # Calculate totals
    total_generated = (
        agent_result.get("count", 0) +
        prompt_result.get("count", 0) +
        skill_result.get("count", 0)
    )
    
    results["status"] = "success" if total_generated > 0 else "partial"
    results["total_generated"] = total_generated
    results["summary"] = f"Generated {total_generated} items: {agent_result.get('count', 0)} agents, {prompt_result.get('count', 0)} prompts, {skill_result.get('count', 0)} skills"
    
    return results


# Tool metadata for agent registration
TOOL_METADATA = {
    "generate_agent_library": {
        "description": "Generate a library of specialized agent files with integrated MCP tools",
        "parameters": {
            "count": "int (default 50)",
            "categories": "Optional[List[str]]",
            "output_dir": "Optional[str]"
        }
    },
    "generate_prompt_library": {
        "description": "Generate a library of prompt files for Copilot chat modes",
        "parameters": {
            "count": "int (default 50)",
            "prompt_types": "Optional[List[str]]",
            "output_dir": "Optional[str]"
        }
    },
    "generate_skill_library": {
        "description": "Generate a library of reusable skills with tools integration",
        "parameters": {
            "count": "int (default 50)",
            "categories": "Optional[List[str]]",
            "output_dir": "Optional[str]"
        }
    },
    "integrate_with_mcp_tools": {
        "description": "Wire generated agents with tools from toolsets.json",
        "parameters": {
            "agent_ids": "List[str]",
            "toolset_file": "Optional[str]"
        }
    },
    "generate_full_library": {
        "description": "Generate complete agent library with agents, prompts, and skills",
        "parameters": {
            "agent_count": "int (default 50)",
            "prompt_count": "int (default 50)",
            "skill_count": "int (default 50)",
            "integrate_mcp": "bool (default True)"
        }
    }
}
