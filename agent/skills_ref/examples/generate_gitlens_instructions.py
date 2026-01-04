"""Example: Generate GitLens-compatible custom instructions from skills.

This demonstrates how to use the enhanced prompt.py to generate
VSCode settings and GitLens AI custom instructions.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from prompt import to_prompt


def main():
    """Generate GitLens custom instructions for ModMe GenUI Workbench."""
    
    # Define skills directory (adjust to your actual skills location)
    skills_base = Path(__file__).parent.parent.parent.parent / "agent-generator" / "src" / "skills"
    
    # Find all skill directories
    skill_dirs = []
    if skills_base.exists():
        skill_dirs = [d for d in skills_base.iterdir() if d.is_dir() and (d / "SKILL.md").exists()]
    
    print(f"Found {len(skill_dirs)} skills in {skills_base}")
    print()
    
    # Define codebase context for ModMe GenUI Workbench
    codebase_context = {
        "architecture": "dual-runtime",
        "stack": [
            "Python 3.12+ (Google ADK, FastMCP)",
            "TypeScript 5",
            "React 19",
            "Next.js 16",
            "CopilotKit 1.50.0",
        ],
        "patterns": [
            "One-way state flow (Python writes → React reads)",
            "Zod validation with safeParse()",
            "ToolContext pattern for agent tools",
            "Component registry with type sync",
            "Lifecycle hooks (before_model_modifier, after_model_modifier)",
        ],
    }
    
    print("=" * 80)
    print("1. ANTHROPIC XML FORMAT (for Claude models)")
    print("=" * 80)
    xml_output = to_prompt(skill_dirs, format="xml")
    print(xml_output)
    print()
    
    print("=" * 80)
    print("2. VSCODE SETTINGS.JSON (for GitLens AI)")
    print("=" * 80)
    vscode_output = to_prompt(
        skill_dirs,
        format="vscode_json",
        codebase_context=codebase_context,
    )
    print(vscode_output)
    print()
    
    print("=" * 80)
    print("3. MARKDOWN FORMAT (for GitHub Copilot)")
    print("=" * 80)
    markdown_output = to_prompt(
        skill_dirs,
        format="markdown",
        codebase_context=codebase_context,
    )
    print(markdown_output)
    print()
    
    print("=" * 80)
    print("4. GITLENS CUSTOM INSTRUCTIONS (comprehensive)")
    print("=" * 80)
    gitlens_output = to_prompt(
        skill_dirs,
        format="gitlens_instructions",
        codebase_context=codebase_context,
    )
    print(gitlens_output)
    print()
    
    # Write to files
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    
    (output_dir / "anthropic_skills.xml").write_text(xml_output)
    (output_dir / "vscode_settings.json").write_text(vscode_output)
    (output_dir / "copilot_instructions.md").write_text(markdown_output)
    (output_dir / "gitlens_custom_instructions.md").write_text(gitlens_output)
    
    print(f"✅ Outputs written to {output_dir}/")
    print("   - anthropic_skills.xml")
    print("   - vscode_settings.json")
    print("   - copilot_instructions.md")
    print("   - gitlens_custom_instructions.md")


if __name__ == "__main__":
    main()
