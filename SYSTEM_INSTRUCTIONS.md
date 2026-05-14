# System Instructions — Copilot Jumpstart

> **Audience:** Humans onboarding Copilot (or any LLM agent) to this repository for the first
> time, and agents that need to understand the optional jumpstart flow.
>
> **Related files:** `AGENTS.md` · `CLAUDE.md` · `.github/copilot-instructions.md` ·
> `agents/review/code-review-rubric.md` · `agents/index.json`

---

## What is the Copilot Jumpstart?

The **Copilot jumpstart flow** lets you instruct a Copilot cloud agent (or any compatible LLM
agent) to scaffold starter code, workflows, or configuration files and surface the result as a
pull request — without writing anything manually first.

The generated code is treated identically to human-authored code: it must pass the same CI
checks and the Copilot Pre-Review Gate before it can be merged.

---

## How It Works

```
User prompt
    │
    ▼
Copilot / LLM agent
    │  reads  AGENTS.md, CLAUDE.md, .github/copilot-instructions.md
    │  consults  agents/index.json  (local asset index)
    │  optionally queries  vendor/awesome-copilot-index/  (upstream index)
    │
    ▼
Agent creates a feature branch
    │  scaffolds files (components, workflows, scripts, docs …)
    │  follows all conventions in AGENTS.md
    │
    ▼
Agent opens a Pull Request
    │  fills in the PR template  (.github/pull_request_template.md)
    │  including the "awesome-copilot Reuse" section
    │
    ▼
Automated checks
    ├── CI matrix  (.github/workflows/ci.yml)
    ├── Copilot Pre-Review Gate  (.github/workflows/copilot-pre-review-gate.yml)
    │       validates agent/LLM resources (heading rule, AGENTS.md reference)
    │       uploads artifact  →  pre-review/
    └── Copilot Pre-Review Comment  (.github/workflows/copilot-pre-review-comment.yml)
            posts or updates a structured review comment on the PR
    │
    ▼
Human (+ optional code-review agent) review
    │  applies  agents/review/code-review-rubric.md
    │
    ▼
Merge
```

---

## Rules That Always Apply to Agent-Generated Code

All generated code **must** comply with:

1. **`AGENTS.md`** — single source of truth for repo-level conventions.
2. **`agents/review/code-review-rubric.md`** — correctness, security, maintainability,
   awesome-copilot reuse, and documentation alignment.
3. **CI workflows** — all jobs in `.github/workflows/ci.yml` must pass.
4. **Pre-review gate** — `.github/workflows/copilot-pre-review-gate.yml` must exit `OK`.

---

## Instructing a Copilot Agent (Quick-Start Prompt)

Paste the following into your Copilot chat or agent prompt session to onboard it:

```
Read AGENTS.md, CLAUDE.md, and .github/copilot-instructions.md first.
Consult agents/index.json for locally indexed resources.
If vendor/awesome-copilot-index/ exists, consult it for upstream prompts and skills.

Your task: [DESCRIBE TASK HERE]

Requirements:
- Create a new branch from main.
- Follow all naming conventions in AGENTS.md.
- Fill in .github/pull_request_template.md completely, including the
  "awesome-copilot Reuse" section.
- Ensure scripts/validate_copilot_resources.ts would pass for any
  agent/LLM resource files you add (first non-empty line must be a # heading;
  file should reference AGENTS.md or awesome-copilot).
- Open a PR against main.
```

---

## Discovering Reusable Prompts, Skills & Agents

Before starting a task, agents should check:

| Location | Contents |
|----------|----------|
| `agents/index.json` | Local asset index (rubrics, prompts, skills, subagents, workflows) |
| `.github/agents/` | Specialist subagent instructions (React, security, DevOps, etc.) |
| `.github/prompts/` | Task-specific prompt files |
| `.github/skills/` | Reusable skill definitions |
| `vendor/awesome-copilot-index/` | Cached upstream index from `Ditto190/awesome-copilot` |

If no suitable asset exists, the agent should:

1. Proceed using general best practices.
2. Note "No matching asset found" in the PR's "awesome-copilot Reuse" section.
3. Optionally propose a new asset upstream by opening an issue or PR in
   `Ditto190/awesome-copilot`.

---

## Cross-Provider Compatibility

These instructions are written in plain Markdown and contain no provider-specific syntax.
Any agent that can read files should be able to follow them, including:

- GitHub Copilot (chat, workspace, code agent)
- Claude (Sonnet, Opus, Haiku)
- Cursor / Windsurf
- OpenAI GPT-4o / o-series
- Any MCP-connected agent with file access

**If a provider cannot access secondary repos** (e.g., `awesome-copilot`), it must:
- disclose this limitation in the PR description, and
- fall back to local assets in `agents/` and `.github/`.

---

*For architecture details, see `Project_Overview.md` and `docs/`.  
For contribution workflows, see `CONTRIBUTING.md`.*
