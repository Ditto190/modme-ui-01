"""
vendor_importer.py — Seeds agent_skills table from .vendor/awesome-copilot-main SKILL.md files.

Usage:
    python vendor_importer.py [--dry-run] [--vendor-path PATH]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

# ── Pydantic models ───────────────────────────────────────────────────────────
try:
    from pydantic import BaseModel, Field
except ImportError:
    print("ERROR: pydantic not installed. Run: pip install pydantic", file=sys.stderr)
    sys.exit(1)

# ── Supabase client ───────────────────────────────────────────────────────────
try:
    from supabase import create_client  # type: ignore
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

import urllib.request
import urllib.error


DEFAULT_VENDOR_PATH = Path(__file__).parents[2] / ".vendor" / "awesome-copilot-main" / "skills"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
YAML_FIELD_RE = re.compile(r"^(\w[\w-]*):\s*(.+)$", re.MULTILINE)
TAG_RE = re.compile(r"#(\w+)")

CHUNK_SIZE = 50


class AgentSkillRecord(BaseModel):
    skill_key: str
    name: str
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    version: str = ""
    author: str = ""
    source: str = ""


# ── YAML-lite parser (handles basic scalar values and quoted strings) ─────────
def _parse_frontmatter(text: str) -> dict:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}
    fm_block = match.group(1)
    result: dict = {}
    for m in YAML_FIELD_RE.finditer(fm_block):
        key = m.group(1)
        val = m.group(2).strip().strip("'\"")
        result[key] = val
    return result


def _extract_tags_from_text(text: str, skill_key: str) -> list[str]:
    """Derive tags from skill_key segments + any #hashtags in description."""
    tags = set(skill_key.replace("-", " ").split())
    for tag in TAG_RE.findall(text[:500]):
        tags.add(tag.lower())
    return sorted(tags)[:20]  # cap at 20


def parse_skill_md(skill_dir: Path) -> AgentSkillRecord | None:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return None

    text = skill_md.read_text(encoding="utf-8", errors="replace")
    fm = _parse_frontmatter(text)

    skill_key = skill_dir.name
    name = fm.get("name", skill_key)
    description = fm.get("description", "")
    # Version may be nested under metadata key in multi-line YAML (our parser flattens it)
    raw_version = fm.get("version", "")
    version = raw_version.replace('version: "', "").replace('"', "").strip() if raw_version else ""
    license_val = fm.get("license", "")
    author = fm.get("author", license_val)  # use license as author fallback if no explicit author
    tags = _extract_tags_from_text(description + " " + skill_key, skill_key)

    return AgentSkillRecord(
        skill_key=skill_key,
        name=name,
        description=description[:2000],
        tags=tags,
        version=str(version),
        author=author,
        source=str(skill_md.relative_to(skill_md.parents[3])),
    )


def discover_skills(vendor_path: Path) -> list[AgentSkillRecord]:
    skills = []
    if not vendor_path.exists():
        print(f"WARN: vendor path not found: {vendor_path}", file=sys.stderr)
        return []

    for skill_dir in sorted(vendor_path.iterdir()):
        if not skill_dir.is_dir():
            continue
        rec = parse_skill_md(skill_dir)
        if rec:
            skills.append(rec)

    return skills


# ── Upsert helpers ────────────────────────────────────────────────────────────
def _rest_upsert_skills(rows: list[dict]) -> None:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_KEY", "")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set")

    endpoint = f"{url}/rest/v1/agent_skills"
    payload = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        _ = resp.read()


def upsert_skills(skills: list[AgentSkillRecord], dry_run: bool = True) -> None:
    rows = []
    for s in skills:
        d = s.model_dump()
        rows.append(d)

    if dry_run:
        print(f"[dry-run] Would upsert {len(rows)} skills to agent_skills")
        print(f"  Sample: {rows[0] if rows else '{}'}")
        return

    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_KEY", "")

    if SUPABASE_AVAILABLE and url and key:
        client = create_client(url, key)
        for i in range(0, len(rows), CHUNK_SIZE):
            chunk = rows[i : i + CHUNK_SIZE]
            client.table("agent_skills").upsert(chunk, on_conflict="skill_key").execute()
        print(f"  [supabase] upserted {len(rows)} rows -> agent_skills")
    elif url and key:
        for i in range(0, len(rows), CHUNK_SIZE):
            _rest_upsert_skills(rows[i : i + CHUNK_SIZE])
        print(f"  [rest] upserted {len(rows)} rows -> agent_skills")
    else:
        print("ERROR: Set SUPABASE_URL and SUPABASE_KEY to write to Supabase", file=sys.stderr)
        sys.exit(1)


# ── CLI ───────────────────────────────────────────────────────────────────────
def cli() -> None:
    parser = argparse.ArgumentParser(description="Seed agent_skills from .vendor SKILL.md files")
    parser.add_argument("--vendor-path", default=str(DEFAULT_VENDOR_PATH), help="Path to skills directory")
    parser.add_argument("--dry-run", action="store_true", default=False)
    parser.add_argument("--live", action="store_true", default=False)
    args = parser.parse_args()

    dry_run = not args.live

    vendor_path = Path(args.vendor_path)
    print(f"Scanning: {vendor_path}")
    skills = discover_skills(vendor_path)
    print(f"Found {len(skills)} skills")

    upsert_skills(skills, dry_run=dry_run)

    if dry_run:
        print("\nRe-run with --live to write to Supabase.")


if __name__ == "__main__":
    cli()
