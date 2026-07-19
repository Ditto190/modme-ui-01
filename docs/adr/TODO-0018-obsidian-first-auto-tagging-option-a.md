---
title: "TODO-ADR-0018: Obsidian-first auto-tagging (Option A) — deferred"
status: "TODO / Deferred"
date: "2026-07-12"
authors: "Cursor agent"
tags: ["architecture", "decision", "todo", "obsidian", "inbox"]
supersedes: ""
superseded_by: ""
related:
  - "docs/adr/0017-label-studio-ai-annotation-loop.md"
  - "templates/obsidian-clipper/modme-inbox-interpreter-ollama.json"
---

## Status

**TODO / Deferred** — recorded so Option A is not lost while Option C (ADR-0017) is primary.

## Context

Option A = Obsidian Web Clipper Interpreter templates + `mda-categorize.mjs` auto-tags **without** Label Studio runtime. Significant Option A surface area already landed on `feature/cursor/obsidian-unique-note-pack` (clipper templates, sidecar vault docs, interpreter-ollama template).

Product direction prioritizes Label Studio full loop (Option C). Option A remains a viable fallback / offline path.

## Decision (deferred)

When revisited, Option A should:

1. Point Interpreter model URL at Agent Gateway `local-llm` (not raw Ollama-only).
2. Keep inbox frontmatter as seed for MDA taxonomy.
3. Skip LS sync/promote scripts.
4. Remain compatible with ADR-0015 (inbox MDA SoR).

## TODO checklist

- [x] Beads issue opened: `modme-55b`
- [ ] Document Interpreter → gateway base URL in clipper README
- [ ] Smoke: clip → inbox → `mda-categorize --dry-run` without LS up
- [ ] Decision: accept Option A as production fallback **or** supersede this TODO when Option C is stable

## Consequences

- Avoids re-doing Obsidian pack work.
- Prevents agents from treating Option A as abandoned tribal knowledge.

## References

- [`templates/obsidian-clipper/README.md`](../../templates/obsidian-clipper/README.md)
- [`docs/obsidian/unique-notes.md`](../obsidian/unique-notes.md)
- ADR-0017 (primary path)
