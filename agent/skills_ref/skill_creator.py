"""Skill creator helper that scaffolds a skill module and a workflow note.

This generator writes a small skill Python file under `agent/skills_ref` and
prints next-step instructions for registering it in toolsets.json or creating
MCP tool wrappers.
"""

from pathlib import Path

TEMPLATE = '''"""Example skill: {name}
"""

def run(params: dict) -> dict:
    """Run the skill with params and return a result dict."""
    # Implement skill logic here
    return {"status": "success", "name": "{name}", "params": params}
'''


def create(name: str, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    target = out_dir / f"{name}.py"
    if target.exists():
        print(f"Skill {target} already exists")
        return target
    target.write_text(TEMPLATE.format(name=name))
    print(f"Wrote skill: {target}")
    return target


if __name__ == "__main__":
    import sys
    name = sys.argv[1] if len(sys.argv) > 1 else "example_skill"
    out = create(name, Path(__file__).parent)
    print("Next steps:")
    print(" - Add a tool wrapper in agent/main.py to call this skill")
    print(" - Add to agent/toolsets.json under an appropriate toolset")
