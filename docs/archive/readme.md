# Documentation Archive

**Last Updated:** 2026-02-08

This directory contains historical documentation that has been archived for reference.
Documentation is organized by:

- **Date**: Major archive events are grouped by year-month (e.g., `2026-02/`)
- **Category**: By functional area (e.g., `observability/`, `build-tools/`)
- **Purpose**: Implementation, testing, and temporal documentation

## Archive Structure

```
archive/
├── observability/
│   ├── 2026-02-phoenix/       # Phoenix implementation docs (Feb 2026)
│   ├── 2026-02-copilot/       # Copilot observability docs (Feb 2026)
│   └── 2026-02-implementation/ # General implementation status
├── build-tools/
├── architecture/
└── sessions/                  # Historical session summaries
```

## Using Archived Documentation

Archived documentation remains searchable and accessible via:

1. **Knowledge Library**: See [knowledge-library.json](../knowledge-library.json)
2. **Foam Search**: Use `[[wiki-links]]` to reference archived notes
3. **Full-text Search**: `npm run search:toolset "pattern"`
4. **Git History**: Full commit history preserved

## Accessing Archive Topics

Query the knowledge library for archived topics:

```bash
# List all archived topics
node -e "const lib = require('./knowledge-library.json'); console.log(lib.topics.filter(t => t.status === 'archived').map(t => t.name));"

# Search archived content
npm run search:toolset "phoenix implementation"

# Count archived documentation
node -e "const lib = require('./knowledge-library.json'); console.log('Archived topics:', lib.topics.filter(t => t.status === 'archived').length);"
```

## Current Archive Statistics

**Observability Archive (Feb 2026)**:

- Phoenix: 6 files (~55KB)
- Copilot: 2 files (~16KB)
- Implementation: 5 files (~52KB)
- **Total: 13 files (~123KB)**

## Why Archive?

Documentation is archived when:

- **Temporal**: Implementation/test docs superseded by consolidated guides
- **Historical**: Snapshots of decision-making processes
- **Superseded**: Replaced by newer, consolidated documentation
- **Reference**: Useful for context but not current operational docs

## Automated Management

Archives are automatically tracked via:

- **GitHub Actions**: [.github/workflows/update-knowledge-library.yml](../../.github/workflows/update-knowledge-library.yml)
- **Update Script**: [scripts/knowledge-management/update-knowledge-library.mjs](../../scripts/knowledge-management/update-knowledge-library.mjs)

When documentation is moved to `docs/archive/**/*.md`, the workflow:

1. Detects archived files
2. Extracts metadata (title, summary, keywords)
3. Updates knowledge-library.json
4. Regenerates this README
5. Commits changes automatically

---

**Note**: Archived documentation is never deleted - it provides historical context and audit trails for the Universal Chat Ingestion Pipeline (ADR-006) and Phoenix observability workflows.
