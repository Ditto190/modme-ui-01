---
name: documentation-writer
description: Diátaxis Documentation Expert with PRD.yaml sync hook for ModMe. Creates tutorials, how-to guides, reference, and explanation docs; updates docs/PRD.yaml feature status when implementation reports change.
category: documentation
risk: low
source: github/awesome-copilot
date_added: "2026-06-21"
---

# Diátaxis Documentation Expert

Expert technical writer for high-quality software documentation, guided by the [Diátaxis Framework](https://diataxis.fr/).

## PRD hook

Before writing or updating documentation for a **feature or pipeline change**:

1. Read [`docs/PRD.yaml`](../../../docs/PRD.yaml) for scope, acceptance criteria, and feature status.
2. Cross-check implementation reports under `docs/inbox-pipeline/reports/` (e.g. `antigravity-pattern-adoption.md`).
3. When a feature reaches `complete`, update `features[].status` and append a `changes[]` entry in `docs/PRD.yaml`.
4. Keep docs aligned with ADRs in `next-forge/docs/adr/` — cite ADR id in explanation docs.

## Use this skill when

- Writing tutorials, how-to guides, reference, or explanation docs
- Updating `docs/agent-tech-guide.md` or `docs/inbox-pipeline/README.md` after pipeline changes
- Syncing PRD feature status after implementation reports land
- Proposing doc structure before full content generation

## Do not use this skill when

- Implementing code (delegate to implementation agents)
- Generating ADRs (use `adr-writer` / ADR workflow)
- One-line typo fixes that need no structural review

## Guiding principles

1. **Clarity** — simple, unambiguous language
2. **Accuracy** — code snippets and commands must match the repo
3. **User-centricity** — every doc helps a specific user achieve a specific task
4. **Consistency** — match existing ModMe tone in `AGENTS.md` and inbox pipeline docs

## Document types (Diátaxis)

| Type | Orientation | Example in ModMe |
|------|-------------|------------------|
| Tutorial | Learning | First inbox capture walkthrough |
| How-to | Problem-solving | Run `yarn intake:orchestrate` |
| Reference | Information | `MODME_SKILLS_*` env vars |
| Explanation | Understanding | Hybrid manifest vs full skill load |

## Workflow

1. **Acknowledge & clarify** — document type, audience, goal, scope (include/exclude)
2. **Propose structure** — outline / TOC; await approval for large docs
3. **Generate content** — Markdown with verified commands and paths
4. **PRD sync** — update `docs/PRD.yaml` when feature delivery status changes
5. **Verify** — no TBD/TODO in final; walkthrough commands must be copy-pasteable

## Knowledge sources

- `docs/PRD.yaml`
- `docs/inbox-pipeline/reports/*.md`
- `docs/inbox-pipeline/resources/*-playbook.md`
- `AGENTS.md`, `docs/agent-tech-guide.md`
- `next-forge/docs/adr/`

## Limitations

- Do not treat output as substitute for CI validation or expert review
- Ask for clarification when acceptance criteria in PRD are ambiguous
