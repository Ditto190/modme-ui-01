"""
CLI for managing the Skill Library from Ai-Agent-Skills repository.

Usage examples:
    python -m agent.skills_ref.skill_library list [--category CATEGORY] [--format table|json]
    python -m agent.skills_ref.skill_library search QUERY
    python -m agent.skills_ref.skill_library install SKILL_NAME [--no-validate] [--overwrite]
    python -m agent.skills_ref.skill_library install-recommended
    python -m agent.skills_ref.skill_library uninstall SKILL_NAME
    python -m agent.skills_ref.skill_library installed [--format table|json]
    python -m agent.skills_ref.skill_library generate-prompt [--output FILE]
    python -m agent.skills_ref.skill_library update-repo [--force]
    python -m agent.skills_ref.skill_library categories
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

from .skill_library_manager import SkillLibraryManager, install_recommended_skills


def cmd_list(args: argparse.Namespace):
    manager = SkillLibraryManager()
    try:
        skills = manager.list_available_skills(category=args.category)
        if args.format == "json":
            print(json.dumps([
                {
                    "name": s.name,
                    "description": s.description,
                    "category": s.category,
                    "author": s.author,
                    "featured": s.featured,
                    "verified": s.verified,
                }
                for s in skills
            ], indent=2))
            return

        # Table format
        print(f"\n📚 Available Skills{' in ' + args.category if args.category else ''}\n")
        print(f"{'Name':<30} {'Category':<15} {'Featured':<10} {'Verified':<10}")
        print("-" * 70)
        for skill in skills:
            featured = "✨ Yes" if skill.featured else "No"
            verified = "✓ Yes" if skill.verified else "No"
            print(f"{skill.name:<30} {skill.category:<15} {featured:<10} {verified:<10}")
        print(f"\n📊 Total: {len(skills)} skills")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_search(args: argparse.Namespace):
    manager = SkillLibraryManager()
    try:
        skills = manager.search_skills(args.query)
        if not skills:
            print(f"❌ No skills found matching '{args.query}'")
            return

        print(f"\n🔍 Search results for '{args.query}'\n")
        print(f"{'Name':<30} {'Category':<15} {'Description':<50}")
        print("-" * 100)
        for skill in skills:
            desc = skill.description[:47] + "..." if len(skill.description) > 50 else skill.description
            print(f"{skill.name:<30} {skill.category:<15} {desc:<50}")
        print(f"\n📊 Found: {len(skills)} skills")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_install(args: argparse.Namespace):
    manager = SkillLibraryManager()
    print(f"📦 Installing skill: {args.skill_name}")
    try:
        result = manager.install_skill(
            args.skill_name,
            validate_first=not args.no_validate,
            overwrite=args.overwrite,
        )
        if result.get("status") == "success":
            print(f"✅ {result.get('message')}")
            if result.get("path"):
                print(f"📁 Path: {result.get('path')}")
        else:
            print(f"❌ {result.get('message')}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_install_recommended(_: argparse.Namespace):
    print("📦 Installing recommended skills for GenUI workbench...")
    print("Skills: theme-factory, mcp-builder, code-review, frontend-design, artifacts-builder\n")
    try:
        results = install_recommended_skills()
        success_count = sum(1 for r in results.values() if r.get("status") == "success")
        fail_count = len(results) - success_count
        for skill_name, result in results.items():
            if result.get("status") == "success":
                print(f"✅ {skill_name}: {result.get('message')}")
            else:
                print(f"❌ {skill_name}: {result.get('message')}")
        print(f"\n📊 Results: {success_count} installed, {fail_count} failed")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_uninstall(args: argparse.Namespace):
    manager = SkillLibraryManager()
    print(f"🗑️  Uninstalling skill: {args.skill_name}")
    try:
        result = manager.uninstall_skill(args.skill_name)
        if result.get("status") == "success":
            print(f"✅ {result.get('message')}")
        else:
            print(f"❌ {result.get('message')}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_installed(args: argparse.Namespace):
    manager = SkillLibraryManager()
    try:
        skills = manager.list_installed_skills()
        if not skills:
            print("❌ No skills installed")
            return
        if args.format == "json":
            print(json.dumps(skills, indent=2))
            return

        print(f"\n📚 Installed Skills\n")
        print(f"{'Name':<30} {'Description':<50}")
        print("-" * 85)
        for skill in skills:
            props = skill.get("properties", {})
            desc = props.get("description", "No description")[:47]
            if len(desc) >= 47:
                desc += "..."
            print(f"{skill['name']:<30} {desc:<50}")
        print(f"\n📊 Total: {len(skills)} skills installed")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_generate_prompt(args: argparse.Namespace):
    manager = SkillLibraryManager()
    try:
        prompt = manager.generate_installed_skills_prompt()
        if args.output:
            Path(args.output).write_text(prompt)
            print(f"✅ Prompt written to {args.output}")
        else:
            print(prompt)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_update_repo(args: argparse.Namespace):
    manager = SkillLibraryManager()
    try:
        repo_path = manager.clone_or_update_repo(force=args.force)
        print(f"✅ Repository updated at {repo_path}")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_categories(_: argparse.Namespace):
    manager = SkillLibraryManager()
    try:
        cats = manager.get_categories()
        print("\n📂 Skill Categories\n")
        print(f"{'Category':<20} {'Count':<10} {'Description':<50}")
        print("-" * 85)
        for cat in cats:
            print(f"{cat['name']:<20} {cat['count']:<10} {cat['description']:<50}")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage Agent Skills from the Ai-Agent-Skills repository")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_list = subparsers.add_parser("list", help="List all available skills")
    p_list.add_argument("--category", type=str, help="Filter by category (development, document, creative, business, productivity)")
    p_list.add_argument("--format", choices=["table", "json"], default="table", help="Output format")
    p_list.set_defaults(func=cmd_list)

    p_search = subparsers.add_parser("search", help="Search for skills by name, description, or tags")
    p_search.add_argument("query", type=str)
    p_search.set_defaults(func=cmd_search)

    p_install = subparsers.add_parser("install", help="Install a skill from the repository")
    p_install.add_argument("skill_name", type=str)
    p_install.add_argument("--no-validate", action="store_true", help="Skip validation before installing")
    p_install.add_argument("--overwrite", action="store_true", help="Overwrite if already installed")
    p_install.set_defaults(func=cmd_install)

    p_install_rec = subparsers.add_parser("install-recommended", help="Install recommended skills for GenUI workbench")
    p_install_rec.set_defaults(func=cmd_install_recommended)

    p_uninstall = subparsers.add_parser("uninstall", help="Uninstall a skill")
    p_uninstall.add_argument("skill_name", type=str)
    p_uninstall.set_defaults(func=cmd_uninstall)

    p_installed = subparsers.add_parser("installed", help="List installed skills")
    p_installed.add_argument("--format", choices=["table", "json"], default="table", help="Output format")
    p_installed.set_defaults(func=cmd_installed)

    p_generate = subparsers.add_parser("generate-prompt", help="Generate agent prompt with installed skills")
    p_generate.add_argument("--output", type=str, help="Write to file instead of stdout")
    p_generate.set_defaults(func=cmd_generate_prompt)

    p_update = subparsers.add_parser("update-repo", help="Update the cached Ai-Agent-Skills repository")
    p_update.add_argument("--force", action="store_true", help="Force re-clone the repository")
    p_update.set_defaults(func=cmd_update_repo)

    p_cats = subparsers.add_parser("categories", help="List all skill categories")
    p_cats.set_defaults(func=cmd_categories)

    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    if not hasattr(args, "func"):
        parser.print_help()
        return 0
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
