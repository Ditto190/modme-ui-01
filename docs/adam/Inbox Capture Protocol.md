---
tags:
  - adam
  - inbox
  - research
type: protocol
updated: 2026-07-11
---

# Inbox Capture Protocol

Critical R&D path: links, web clips, and agent drops land in the inbox funnel, then intake embeds them into knowledge (Supabase pgvector).

## Where files go

| Surface       | Path                                                |
| ------------- | --------------------------------------------------- |
| Sidecar vault | `inbox/` (junction)                                 |
| Monorepo SoR  | `GenerativeUI_monorepo/docs/inbox/`                 |
| Web clips     | `inbox/web-clipper/{parent}/{contract-filename}.md` |

New notes default to vault `inbox/` via Obsidian `newFileFolderPath`. Clipper ModMe templates nest under `web-clipper/{repo|obsidian|domain}/`.

## Frontmatter (contract v1)

Required on `.md`: `timestamp`, `agent`, `type`

Optional: `agent_role`, `session_id`, `tags`, `severity`, `related_files`, `branch`, `pr_number`, `title`, `summary`

**Enums**

- `type`: architecture | design | code-review | solution | research | snippet | link | component
- `severity`: low | medium | high | critical
- `agent_role`: frontend | backend | devops | architect | reviewer | researcher

Filename pattern: `YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md`

Contract: `docs/inbox-pipeline/contracts/inbox-contract.v1.json` (ADR-0009).

## Clipper

1. Vault: **ModMe-Vault**
2. Import JSON from vault `clipper/` (junction → `templates/obsidian-clipper/`)
3. Template order: GitHub Issue/PR → Code Snippet → **Obsidian Help** → Repo → Docs → Article → AI Chat → topic templates → Generic Link **last**
4. Clip → confirm file under `inbox/web-clipper/{parent}/`
5. Optional: `yarn clipper:organize` to nest flat leftovers from `source:`
6. From monorepo root:

```powershell
yarn inbox:audit
yarn intake:orchestrate   # audit → ingest → embed → MDA
```

## Agent drops

Agents writing significant decisions/research should drop inbox notes with the same frontmatter (see AGENTS.md Inbox Capture Protocol). Prefer `type` matching the content; use `severity: high` for architecture.

## Do not

- Paste the entire `{inbox}` folder into Copilot system prompts (token blowup)
- Skip audit before orchestrate on dirty funnel files
- Use Defuddle `{{content}}` for GitHub blob source (use code-snippet template)

## Related

- [[ADAM Architecture Map]]
- [[Template Catalog]]
- Manual note template: `tpl-inbox-capture`
