#!/usr/bin/env python3
"""
Quick demonstration of agent library generation without Google ADK dependency
"""

import sys
from pathlib import Path

# Add agent directory to path
AGENT_DIR = Path(__file__).parent.parent / "agent"
sys.path.insert(0, str(AGENT_DIR))

# Mock ToolContext for demonstration
class MockToolContext:
    def __init__(self):
        self.state = {}

def demo_agent_generation():
    """Demonstrate agent generation capabilities"""
    print("=" * 70)
    print("AGENT LIBRARY GENERATION DEMO")
    print("=" * 70)
    print()

    # Import after adding to path
    from tools.agent_library_generator import (
        AgentTemplate,
        PromptTemplate,
        SkillTemplate,
    )

    print("📦 Creating Custom ModMe GenUI Agent...")
    print()

    # Create custom agent
    agent = AgentTemplate(
        name="ModMe GenUI Specialist",
        id="modme-genui-specialist",
        description="Expert in ModMe GenUI workbench, dual-runtime architecture, and agent-driven UI generation.",
        agent_type="specialist",
        primary_tools=[
            "upsert_ui_element",
            "remove_ui_element",
            "clear_canvas",
            "setThemeColor"
        ],
        secondary_tools=[
            "analyze_component_props",
            "edit_component",
            "run_build_check"
        ],
        example_prompt="Create a dashboard with StatCard and ChartCard components",
        model="claude-opus-4.5",
        tags=["genui", "ui-generation", "react", "nextjs"]
    )

    agent_md = agent.to_markdown()
    print("✅ Agent Markdown Generated:")
    print("-" * 70)
    print(agent_md[:500] + "...")
    print("-" * 70)
    print()

    print("📝 Creating Custom Code Generation Prompt...")
    print()

    # Create custom prompt
    prompt = PromptTemplate(
        name="GenUI Component Generation",
        id="genui-component-gen",
        description="Guide for generating UI components in ModMe GenUI workbench",
        prompt_type="code-gen",
        agent_targets=["modme-genui-specialist", "copilot-starter"],
        example_usage="Generate a StatCard component with title, value, and trend props",
        tools_required=["upsert_ui_element", "analyze_component_props"],
        tags=["code-gen", "components", "genui"]
    )

    prompt_md = prompt.to_markdown()
    print("✅ Prompt Markdown Generated:")
    print("-" * 70)
    print(prompt_md[:400] + "...")
    print("-" * 70)
    print()

    print("🧩 Creating Custom Canvas Management Skill...")
    print()

    # Create custom skill
    skill = SkillTemplate(
        name="Canvas State Management",
        id="canvas-state-mgmt",
        description="Manage ModMe GenUI canvas state and component lifecycle",
        category="ui",
        instructions="""
1. Understand one-way state flow (Python → React)
2. Use upsert_ui_element to add/update components
3. Validate component types against ALLOWED_TYPES
4. Ensure props are JSON-serializable
5. Use remove_ui_element or clear_canvas to clean up
        """,
        example_code="""
# Add a StatCard to the canvas
upsert_ui_element(
    tool_context,
    id="revenue_stat",
    type="StatCard",
    props={"title": "Revenue", "value": 125000, "trend": "up"}
)
        """,
        dependencies=["ModMe GenUI Runtime", "Python ADK"],
        tags=["canvas", "state", "genui"]
    )

    skill_md = skill.to_skill_md()
    print("✅ Skill Markdown Generated:")
    print("-" * 70)
    print(skill_md[:450] + "...")
    print("-" * 70)
    print()

    # Summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print()
    print("✅ Generated 3 custom items:")
    print("   1. ModMe GenUI Specialist Agent")
    print("   2. GenUI Component Generation Prompt")
    print("   3. Canvas State Management Skill")
    print()
    print("📁 Output locations:")
    print("   Agents  → .github/agents/modme-genui-specialist.agent.md")
    print("   Prompts → .github/prompts/genui-component-gen.prompt.md")
    print("   Skills  → .github/skills/canvas-state-mgmt/SKILL.md")
    print()
    print("🚀 To generate full library:")
    print("   python scripts/generate_agent_library.py --agents 50 --prompts 50 --skills 50")
    print()
    print("🔍 To scan and generate agent prompts:")
    print("   cd agent-generator && npm run generate")
    print()

    # Write demo files
    print("💾 Writing demo files...")

    demo_dir = Path(".github/demo")
    demo_dir.mkdir(parents=True, exist_ok=True)

    (demo_dir / "modme-genui-specialist.agent.md").write_text(agent_md, encoding='utf-8')
    (demo_dir / "genui-component-gen.prompt.md").write_text(prompt_md, encoding='utf-8')

    skill_dir = demo_dir / "canvas-state-mgmt"
    skill_dir.mkdir(exist_ok=True)
    (skill_dir / "SKILL.md").write_text(skill_md, encoding='utf-8')

    print(f"✅ Demo files written to: {demo_dir}")
    print()
    print("=" * 70)
    print("DEMO COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    try:
        demo_agent_generation()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
