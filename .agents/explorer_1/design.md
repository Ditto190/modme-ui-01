# Lean-CTX Research and Design

## Overview
This document outlines the architecture and exact configuration values required to optimize `lean-ctx` for the `Monorepo_ModMe` development environment. The design is based on the local `lean-ctx-guide.md` and applies best practices for monorepo context compression, memory & knowledge base architecture, multi-agent workflows, and performance benchmarking.

---

## R1. Configuration for Monorepo & Multi-Agent Workflows

### 1.1 `.lean-ctx.toml` Optimization
To support the sheer size of the monorepo and parallel agent worktrees, the core lean-ctx configuration must maximize compression and enable shared memory.

**Proposed Configuration Update (`.lean-ctx.toml`):**
```toml
# Maximize compression to reduce token bloat on shell commands and file reads
compression_level = "max"

extra_ignore_patterns = [
  "node_modules/**",
  "dist/**",
  ".next/**",
  "coverage/**",
  "target/**",
  "vendor/**",
  "generated/**",
  "UniversalWorkbench-staging/**",
  "UniversalWorkbench-dev/**",
  ".lean-ctx/memory/diary/**" # Ignore noisy agent diaries from raw context
]

graph_index_max_files = 15000 # Increased to accommodate monorepo growth
memory_profile = "adaptive"   # Changed from 'balanced' to leverage adaptive learning
memory_cleanup = "shared"
multi_agent_sync = true       # Enable cross-worktree memory sharing
```

### 1.2 Cursor Hooks (`.cursor/hooks.json`)
Currently empty, the Cursor hooks should be opted into the safe advisory pattern (timeout ≤ 5s, no `failClosed`). 

**Proposed Update (`.cursor/hooks.json`):**
```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      {
        "command": "pwsh.exe -File scripts/lean-ctx-post-edit.ps1",
        "timeoutSec": 5,
        "type": "command"
      }
    ],
    "stop": [
      {
        "command": "pwsh.exe -File scripts/lean-ctx-stop-marker.ps1",
        "timeoutSec": 5,
        "type": "command"
      }
    ]
  }
}
```
*(Note: `.github/hooks/hooks.json` is already appropriately configured with `hook rewrite`, `hook redirect`, and `hook observe`.)*

### 1.3 MDC Rules (`.cursor/rules/lean-ctx.mdc`)
We need to amend the rules to enforce the use of `ctx_agent` for multi-agent workflows.

**Additions to MDC:**
- Enforce `ctx_session load` + `ctx_knowledge wakeup` at the start of tasks.
- Enforce `ctx_agent diary` and `ctx_agent register` for multi-agent handoffs, explicitly separating project facts from session diaries.
- Remind agents that high-confidence facts learned via `ctx_knowledge` must also be persisted in `AGENTS.md`.

---

## R2. Knowledge Base & Adaptive Learning Architecture

### 2.1 File-Based Memory Storage
We will scaffold the local `.lean-ctx/memory/` directory to facilitate the "Three-layer memory model".

**Directory Structure:**
```text
.lean-ctx/
  └── memory/
      ├── knowledge/     # (Project facts) Managed via ctx_knowledge (e.g., Supabase ADRs, worktree policies)
      ├── sessions/      # (Session continuity) Managed via ctx_session (e.g., open decisions, current tasks)
      └── diary/         # (Agent diary) Managed via ctx_agent (e.g., cross-agent handoffs, blockers)
```

### 2.2 Indexing & Maintenance Hooks
To ensure the adaptive learning is effective, we must create a maintenance script that consolidates noisy diary entries into permanent knowledge.

**Proposed Script (`scripts/lean-ctx-index.ps1`):**
- **Action 1:** Aggregates JSON lines from `.lean-ctx/memory/diary/*.md` and `.lean-ctx/memory/sessions/*.md`.
- **Action 2:** Extracts "high-confidence" findings (e.g., `confidence >= 0.9`).
- **Action 3:** Calls `lean-ctx ctx_knowledge consolidate` to merge these findings into the `knowledge/` index.
- **Action 4:** Provides an alert if new architectural decisions were discovered that need manual promotion to `AGENTS.md`.

---

## R3. Performance Benchmarking

### 3.1 Benchmark Script Design
To ensure that `compression_level = "max"` and the memory structures do not degrade context load times, we will implement an automated benchmark script.

**Proposed Script (`scripts/benchmark-lean-ctx.ps1`):**
```powershell
param(
    [switch]$Verbose
)

Write-Host "Starting lean-ctx benchmark for Monorepo_ModMe..."

# 1. Measure Shell Wrapping Overhead
$shellTimer = [System.Diagnostics.Stopwatch]::StartNew()
lean-ctx -c "git status" | Out-Null
$shellTimer.Stop()
Write-Host "Shell wrap overhead: $($shellTimer.ElapsedMilliseconds) ms"

# 2. Measure Context Session Load
$sessionTimer = [System.Diagnostics.Stopwatch]::StartNew()
lean-ctx -c "ctx_session load" | Out-Null
$sessionTimer.Stop()
Write-Host "Context session load time: $($sessionTimer.ElapsedMilliseconds) ms"

# 3. Output Token Savings (Gain)
Write-Host "--- Lean-CTX Gain Report ---"
lean-ctx gain

# 4. Status Check
Write-Host "--- Lean-CTX Diagnostics ---"
lean-ctx status
```

### 3.2 Acceptance Validation
- The script validates that context load times remain under an acceptable threshold (e.g., `< 500ms`).
- Output from `lean-ctx gain` will verify that token savings are active across wrapped commands.
