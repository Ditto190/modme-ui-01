# CLAUDE.md - Agent Instructions

## Project Overview
This project uses a **Git worktree-based development workflow**.
Read `docs/GIT_WORKFLOW.md` for full rules.

## Quick Reference

### Feature Creation
**NEVER** create branches manually.
**ALWAYS** use:
```powershell
./scripts/new-feature.ps1 -Name "my-feature" -Owner "agent"
```

### Folder Structure
*   `UniversalWorkbench/` (Main Repo) - **READ ONLY** for agents mostly.
*   `UniversalWorkbench-dev/` (Worktrees) - **YOUR WORKSPACE**.

### Branch Naming
*   `feature/agent/<name>` (Handled by script)

### Commit Format
*   `<type>(<scope>): <short description>`
*   Types: `feat`, `fix`, `chore`, `refactor`, `docs`

## Forbidden Actions
*   Do NOT push directly to `main` or `staging`.
*   Do NOT modify files in `UniversalWorkbench/` root directly if you are supposed to be in a feature.
*   STOP immediately on merge conflicts.

## Repository Operations
*   Use `gh` CLI for all GitHub interactions.
