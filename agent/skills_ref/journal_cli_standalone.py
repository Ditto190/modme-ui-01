"""Standalone journal CLI - no package dependencies.

Usage:
  python journal_cli_standalone.py add "My note" --tags tag1,tag2
  python journal_cli_standalone.py list
  python journal_cli_standalone.py search "keyword"
"""

import argparse
import hashlib
import json
import uuid
from datetime import datetime
from pathlib import Path


def embed_text_sha256(text: str) -> str:
    """Simple SHA256-based embedding for testing."""
    return hashlib.sha256(text.encode()).hexdigest()


class Journal:
    """Minimal journal implementation."""
    
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text("")

    def add(self, text: str, tags=None):
        tags = tags or []
        entry = {
            "id": str(uuid.uuid4()),
            "ts": datetime.utcnow().isoformat(),
            "text": text,
            "tags": tags,
            "embedding": embed_text_sha256(text)
        }
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        return entry

    def list(self):
        for line in self.path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            yield json.loads(line)

    def search(self, query: str, top_k=10):
        qvec = embed_text_sha256(query)
        
        def score(e):
            a = int(e.get("embedding", "0"), 16)
            b = int(qvec, 16)
            return -(a ^ b)

        items = list(self.list())
        items.sort(key=score, reverse=True)
        return items[:top_k]


def main(argv=None):
    parser = argparse.ArgumentParser(prog="journal-cli-standalone")
    sub = parser.add_subparsers(dest="cmd")

    add = sub.add_parser("add")
    add.add_argument("text", help="Entry text")
    add.add_argument("--tags", default="", help="Comma-separated tags")

    sub.add_parser("list")

    search = sub.add_parser("search")
    search.add_argument("query", help="Search query")

    args = parser.parse_args(argv)

    data_dir = Path.cwd() / "agent_data"
    data_dir.mkdir(parents=True, exist_ok=True)
    journal = Journal(data_dir / "journal.jsonl")

    if args.cmd == "add":
        tags = [t.strip() for t in args.tags.split(",") if t.strip()]
        entry = journal.add(args.text, tags=tags)
        print(f"✅ Added entry id={entry['id']}")
    elif args.cmd == "list":
        entries = list(journal.list())
        if not entries:
            print("📝 No entries yet")
        else:
            for e in entries:
                print(f"\n🔖 {e['id']}")
                print(f"   📅 {e['ts']}")
                if e.get('tags'):
                    print(f"   🏷️  {', '.join(e['tags'])}")
                print(f"   📄 {e['text']}")
    elif args.cmd == "search":
        results = journal.search(args.query)
        if not results:
            print(f"🔍 No results for '{args.query}'")
        else:
            print(f"🔍 Search results for '{args.query}':\n")
            for e in results:
                print(f"🔖 {e['id']}")
                print(f"   📅 {e['ts']}")
                if e.get('tags'):
                    print(f"   🏷️  {', '.join(e['tags'])}")
                print(f"   📄 {e['text']}\n")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
