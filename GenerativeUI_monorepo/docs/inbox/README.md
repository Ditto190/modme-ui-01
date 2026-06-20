# Inbox — Multi-Format Knowledge Funnel

This folder is the **capture-first** entry point for all knowledge, decisions, research, links, components, and assets.

Everything dropped here is automatically ingested by the MDA Pipeline → persisted to Supabase → reconstructed into output materials.

---

## What Goes Here

| Format | Examples |
|--------|---------|
| `.md` | Agent decisions, ADR candidates, research notes, session summaries |
| `.txt` | Quick notes, shopping lists, `llms.txt` exports |
| `.csv` | Data exports, link lists, inventory sheets |
| `.pdf` | Whitepapers, specs, reference documents |
| `.url` / `.txt` with URLs | Links for web scraper to fetch and summarize |
| `.html` | Saved pages, documentation |
| `.jsx` / `.tsx` | React components found online |
| code snippets | Any `.ts`, `.py`, `.sh`, etc. worth keeping |

**Don't overthink it.** Drop it in. The pipeline handles the rest.

---

## Filename Convention

For structured captures (agent decisions, ADRs, research):

```
YYYY-MM-DDTHH-MM-SS_{type}_{agent-role}_{summary-slug}.md
```

Examples:
```
2026-06-20T13-08-00_architecture_architect_supabase-hybrid-cloud.md
2026-06-20T14-30-00_code-review_frontend_tanstack-query-patterns.md
2026-06-20T15-00-00_snippet_backend_fastapi-websocket-handler.py
```

For raw drops (links, PDFs, components), any filename is fine — the ingestor reads the content.

---

## Frontmatter Schema (for `.md` files)

```yaml
---
timestamp: 2026-06-20T13:08:52Z        # ISO 8601 UTC
agent: copilot                          # Agent or human name
agent_role: architect                   # frontend|backend|devops|architect|reviewer|researcher
session_id: a22af2b0-...               # Optional: Copilot session ID
tags:
  - decision                            # Free-form tags
  - supabase
  - infrastructure
type: architecture                      # architecture|design|code-review|solution|research|snippet|link|component
severity: high                          # low|medium|high|critical
related_files:                          # Optional: paths to related files in the repo
  - next-forge/docs/adr/0001-supabase.md
branch: chore/agent-tooling-and-ci      # Current git branch
pr_number: null                         # Optional: PR number if related
---
```

Minimum required for `.md` files: `timestamp`, `agent`, `type`. Everything else is optional and will be inferred by the pipeline.

**Data contract v1:** [`docs/inbox-pipeline/contracts/inbox-contract.v1.json`](../../../docs/inbox-pipeline/contracts/inbox-contract.v1.json)

Validate before commit:

```powershell
yarn inbox:audit:funnel       # funnel-only audit
yarn inbox:fix                # preview safe frontmatter fixes
```

---

## What the Pipeline Does

1. **Ingest** — Detects format, extracts text, computes SHA-256 hash (dedup), uploads binary to Supabase Storage
2. **Embed** — Runs `google/embeddinggemma-300m` (256-dim, local) to generate semantic vectors
3. **Categorize** — MDA team tags, classifies, finds bidirectional relations between entries
4. **Persist** — All metadata + embeddings stored in Supabase `inbox_entries` table
5. **Reconstruct** — On demand: skills catalogue, Storybook stories, documentation, UI components

---

## Querying

Once ingested, entries are queryable at:
- **Admin UI**: `http://localhost:3100/knowledge` (next-forge app)
- **API**: `http://localhost:3102/api/inbox` (next-forge API)
- **Direct**: Supabase dashboard → `inbox_entries` table

---

## Inbox Capture Protocol for Agents

When making significant decisions, append a note:

```bash
# Quick capture (any agent)
cat > GenerativeUI_monorepo/docs/inbox/$(date -u +%Y-%m-%dT%H-%M-%S)_${TYPE}_${AGENT_ROLE}_${SLUG}.md << 'EOF'
---
timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)
agent: copilot
agent_role: architect
type: architecture
severity: high
tags: [decision, supabase]
branch: $(git branch --show-current)
---

# Your decision title here

Your content here.
EOF
```
The `EOF` here is used as a delimiter for the [heredoc](https://en.wikipedia.org/wiki/Here_document) in bash. It marks the end of the multiline input that is redirected into your new markdown inbox entry file. Everything typed or pasted before `EOF` becomes the file content.

**Example:**
Suppose you run:
```bash
cat > GenerativeUI_monorepo/docs/inbox/2024-06-08T12-00-00_architecture_copilot_decision-foo.md << 'EOF'
---
timestamp: 2024-06-08T12:00:00Z
agent: copilot
agent_role: architect
type: architecture
severity: high
tags: [decision, supabase]
branch: main
---

# Chose Supabase for project DB

Discussed options and decided to use Supabase because of X, Y, and Z.
EOF
```
This will create a new markdown file with all the above content. The `EOF` at the end closes the input for the file.
```

---

*Managed by the MDA Pipeline. See `scripts/inbox-ingest.mjs` and `.github/workflows/inbox-ingest.yml`.*
