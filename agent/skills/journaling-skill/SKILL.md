---
name: Journaling Skill
description: Semantic search and storage for personal or project journals.
id: journaling-skill
version: 1.0.0
license: MIT
---

# Journaling Skill

This skill provides semantic search and persistent storage for journal entries.

## Tools

### `journal_add`
Adds a new entry to the journal.
- **text**: The entry content.
- **tags**: (Optional) Comma-separated tags.

### `journal_list`
Lists recent journal entries.
- **limit**: Maximum entries to return.

### `journal_search`
Searches entries using semantic similarity.
- **query**: The search query.

## Implementation Notes
- Uses `gemma3n` for embeddings.
- Data is stored in `agent_data/journal.jsonl`.
