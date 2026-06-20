---
description: Design and scaffold new GitHub Agentic Workflows for ModMe using gh-aw best practices
on:
  workflow_dispatch:
    inputs:
      workflow_name:
        description: Workflow name or kebab-case id (e.g. issue-triage)
        required: true
        type: string
      workflow_description:
        description: What should this workflow automate?
        required: true
        type: string
      additional_context:
        description: Optional constraints (triggers, tools, integrations)
        required: false
        type: string
permissions:
  contents: read
  issues: read
  pull-requests: read
engine: copilot
tools:
  cli-proxy: true
  github:
    mode: gh-proxy
    toolsets: [default]
network:
  allowed:
    - defaults
    - node
safe-outputs:
  create-pull-request:
    max: 1
    labels: ["agentic-workflow", "ai-generated"]
  add-comment:
    max: 3
timeout-minutes: 30
---

# Create Agentic Workflow Builder (ModMe)

Read and follow **`.github/aw/create-agentic-workflow.md`** in full before acting. That file is the authoritative gh-aw workflow creator prompt.

## Requirements from dispatch

- **Workflow name**: `${{ inputs.workflow_name }}`
- **Description**: `${{ inputs.workflow_description }}`
- **Additional context**: `${{ inputs.additional_context }}`

Derive a kebab-case workflow id from the name. If `.github/workflows/<id>.md` already exists, append `-v2` or a date suffix.

## Repository context

- Dual monorepo — do not cross-link `next-forge/` and `GenerativeUI_monorepo/` in workflow logic
- Existing agents: `.github/agents/`
- gh-aw reference: `.github/aw/` (syntax, safe-outputs, network, patterns)
- Workflow designer skill: `.github/skills/agentic-workflow-designer/SKILL.md`
- Package managers: Bun in `next-forge/`, Yarn 3 in `GenerativeUI_monorepo/`

## Deliverables

1. Create `.github/workflows/<workflow-id>.md` with complete frontmatter and agent prompt body
2. Compile with `gh aw compile <workflow-id>` and include the generated `.lock.yml` in the PR
3. Keep agent job permissions read-only; use `safe-outputs` for all writes
4. Open one pull request containing both files

If requirements are ambiguous, add a PR comment listing assumptions before finishing.

Call `noop` only if inputs are empty or the request is explicitly out of scope for agentic workflows.
