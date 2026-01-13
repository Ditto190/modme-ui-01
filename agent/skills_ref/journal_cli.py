"""Simple journal CLI for indexing and searching entries.

Usage:
  python -m agent.skills_ref.journal_cli add "My note" --tags tag1,tag2
  python -m agent.skills_ref.journal_cli list
  python -m agent.skills_ref.journal_cli search "keyword"
  
  Or as standalone:
  python agent/skills_ref/journal_cli.py add "My note"
"""

import argparse
import sys
from pathlib import Path

# Support both module and standalone execution
if __name__ == "__main__" and __package__ is None:
    # Running as standalone script - import directly without package
    import importlib.util
    
    # Load journal module directly
    journal_path = Path(__file__).parent / "journal.py"
    spec = importlib.util.spec_from_file_location("journal", journal_path)
    journal_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(journal_module)
    Journal = journal_module.Journal
else:
    # Running as module
    from .journal import Journal


def main(argv=None):
    parser = argparse.ArgumentParser(prog="journal-cli")
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
        print(f"Added entry id={entry['id']}")
    elif args.cmd == "list":
        for e in journal.list():
            print(f"{e['id']} {e['ts']} {', '.join(e.get('tags',[]))}\n  {e['text']}\n")
    elif args.cmd == "search":
        results = journal.search(args.query)
        for e in results:
            print(f"{e['id']} {e['ts']} {', '.join(e.get('tags',[]))}\n  {e['text']}\n")
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
