---
tags:
  - adam
  - templates
  - catalog
type: catalog
updated: 2026-07-12
---

# Template Catalog

Full inventory of template types for Project A.D.A.M / ModMe. Prefer existing packs before inventing new ones.

## A. Obsidian note templates

Folder: `templates/obsidian-note-templates/` (vault: `Templates/` via sidecar junction).

| #   | Type                         | File / status                     | Purpose                                  |
| --- | ---------------------------- | --------------------------------- | ---------------------------------------- |
| 1   | Daily note                   | planned                           | Journal + focus beads                    |
| 2   | Weekly review                | planned                           | Sphere progress, EI/mission reflection   |
| 3   | Meeting                      | planned                           | Agenda, decisions, follow-ups            |
| 4   | Literature / Zettel          | `tpl-unique-note.md`              | Unique note creator UID + claim/evidence |
| 5   | MOC / Index                  | `tpl-moc.md` + [[ADAM Index]]     | Hub maps + Bases embed                   |
| 6   | Person / Stakeholder         | planned                           | People context                           |
| 7   | Concept                      | planned                           | Domain term                              |
| 8   | Experiment log               | planned                           | Hypothesis / result                      |
| 9   | Session handoff              | `tpl-session-handoff.md`          | Agent/session continuity                 |
| 10  | Runbook                      | planned                           | Ops procedures                           |
| 11  | ADR                          | `tpl-adr.md`                      | Architecture decisions                   |
| 12  | Bead / issue                 | `tpl-bead.md`                     | Vault mirror of `modme-*`                |
| 13  | Inbox capture (manual)       | `tpl-inbox-capture.md`            | Contract-valid funnel note + `uid`       |
| 14  | Agent brief                  | `tpl-agent-brief.md`              | Scoped agent task                        |
| 15  | Architecture sketch          | planned                           | Pre-ADR diagram + options                |
| 16  | Decision log (light)         | planned                           | Sub-ADR choice                           |
| 17  | Retrospective                | planned                           | What worked / next                       |
| 18  | Prompt / system-prompt draft | [[copilot-project-system-prompt]] | Copilot instructions                     |
| 19  | Clipper QA / Defuddle probe  | planned note + clipper JSON       | Extraction diagnostics                   |
| 20  | Conductor-style              | planned                           | product / tech-stack / workflow / track  |
| 21  | Code sandbox                 | `tpl-code-sandbox.md`             | Code Emitter local py/ts/js              |

## B. Web Clipper JSON templates

SoR: `templates/obsidian-clipper/` (vault `clipper/`). See `templates/obsidian-clipper/README.md`.

| Template                       | `type`       | Role                    |
| ------------------------------ | ------------ | ----------------------- |
| modme-inbox-github-issue-pr    | research     | Issues/PRs              |
| modme-inbox-code-snippet       | snippet      | Blob/raw/gist           |
| modme-inbox-obsidian-help      | research     | Obsidian Help / Publish |
| modme-inbox-github-repo        | research     | Repo home               |
| modme-inbox-docs-site          | research     | Docs / TechArticle      |
| modme-inbox-article-landing    | research     | Articles                |
| chatgpt-clipper                | research     | Multi-agent AI chats    |
| modme-inbox-generic-link       | link         | Fallback (last)         |
| modme-inbox-defuddle-probe     | research     | Manual Defuddle QA      |
| modme-inbox-interpreter-ollama | research     | Ollama interpret        |
| multi-agent-orchestration-adr  | architecture | Orchestration/ADR clips |
| agent-gateway-research         | research     | Topic                   |
| expo-cng-research              | research     | Topic                   |
| dolt-cms-catalog-research      | research     | Topic                   |
| copilot-workspace-config       | research     | Topic                   |
| kepano/\*                      | varies       | Community site pack     |

All ModMe Clipper templates use `path: inbox` and frontmatter `uid` (YYYYMMDDHHmm). See [`docs/obsidian/clipper-source-matching.md`](../obsidian/clipper-source-matching.md).

## C. GitHub issue templates

`.github/ISSUE_TEMPLATE/` — beads-handoff, triage, bug, feature, cicd-failure, devops-autofix, toolset-management, question.

## D. Conductor / context-driven artifacts

Align with context-driven-development: `product.md`, `product-guidelines.md`, `tech-stack.md`, `workflow.md`, `tracks.md` (+ per-track spec/plan). ADAM vault notes cover the Obsidian-facing subset; repo `AGENTS.md` / `docs/*` remain coding SoR.

## E. Inbox pipeline contract types

From `docs/inbox-pipeline/contracts/inbox-contract.v1.json`:

`architecture` | `design` | `code-review` | `solution` | `research` | `snippet` | `link` | `component`

## Related

- [[Inbox Capture Protocol]]
- [[ADR Digest]]
- [[Beads Board]]
- [Obsidian pack](../obsidian/README.md)
