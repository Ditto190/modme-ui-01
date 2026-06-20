---
name: dag-task-runner
description: Decompose a user's task into a DAG of subtasks and execute them with Cursor SDK local subagents in topological order, rendering live streaming status to a canvas. Each task has a complexity (HIGH/MED/LOW) that maps to a model. Use when the user asks to fan out work, decompose a task into a DAG, run subagents in parallel, or break a large task into a dependency graph.
---

# DAG Task Runner

Decomposes a user-described task into a JSON DAG, then runs each node as a Cursor SDK local subagent (with parents' outputs stitched into the child's prompt). Live DAG state — including each running subagent's streaming output — is rendered into a `.canvas.tsx` that the runner rewrites on every status transition; the IDE hot-recompiles so the user sees subagents move through `PENDING -> RUNNING -> FINISHED/ERROR` in real time.

This skill can run from either a project skill (`.cursor/skills/dag-task-runner`) or a personal skill (`~/.cursor/skills/dag-task-runner`). The installed runner entry point is `scripts/run_dag.ts` inside the skill directory. Set `DAG_RUNNER_DIR` to override the auto-detected `scripts` directory.

## When to use

Trigger when the user says any of:

- "decompose this task", "break this into a DAG", "fan out subagents"
- "run this as a graph of subtasks"
- a multi-step request where some steps clearly depend on others and others can run in parallel

Skip when the task is a single-shot edit, a quick question, or already linear enough that one agent turn would handle it.

## Auth

The runner reads `CURSOR_API_KEY` from the environment. Set it however you usually manage secrets:

```bash
export CURSOR_API_KEY=crsr_...
```

## Reference

- DAG schema example: `examples/example_dag.json` (sibling of this skill after install)
- Runner entry point after install: `run_dag.ts` inside `$RUNNER_DIR`
- Cursor SDK docs: https://cursor.com/docs/api/sdk/typescript
