# GIT_WORKFLOW.md
**Universal Workbench — Official Git Workflow (HUMANS + AGENTS)**

This workflow is designed for hybrid development, where multiple AI agents and humans work in parallel, each inside isolated Git worktrees.
**Nothing in this file is optional.**

---

# 📁 1. Monorepo Structure (Always)
```
UniversalWorkbench/           ← main branch (production root)
│
├── docs/
│   └── GIT_WORKFLOW.md       ← this file
│
├── scripts/
│   ├── init-worktrees.ps1    ← initialize full workspace & branches
│   └── new-feature.ps1       ← create feature worktree (SAFE way)
│
└── CLAUDE.md                 ← agent instructions
```

**Sibling Directories (Created by init script):**
```
UniversalWorkbench-dev/       ← DEV environment
│   ├── dev/                  ← persistent dev branch checkout
│   ├── dev-agent-featureA/   ← agent feature worktree
│   └── dev-human-featureB/   ← human feature worktree
│
UniversalWorkbench-staging/   ← STAGING environment
```

---

# 🔐 2. GitHub & Repository Rules (MANDATORY)
**ALWAYS use GitHub CLI (`gh`). This is the ONLY approved method.**

### ❌ FORBIDDEN Methods (Agents must NEVER use these)
* SSH key configuration or troubleshooting
* Personal access tokens
* Creating repos via GitHub web UI
* Manual `git remote add` commands (unless fixing broken remotes)

---

# 🧠 3. Feature Creation (Always via Script)
**Agents must NEVER create branches/worktrees manually.**

Run:
```powershell
./scripts/new-feature.ps1 -Name "feature-name" -Owner "agent"
```

This will:
1. create the branch `feature/agent/feature-name`
2. create the worktree `../UniversalWorkbench-dev/dev-agent-feature-name`
3. copy `.env` from main

---

# 🔄 4. Syncing Rules
### MUST sync before first commit of each session:
```bash
cd dev-agent-feature/
git pull origin dev
```

### Agents MAY NOT merge or rebase manually.
They can:
* allow Git to auto-resolve trivial merges
* must stop if merge markers appear (`<<<<<<`)

Humans handle all non-trivial conflicts.

---

# 🧵 5. Pull Request Rules
### Agents must NOT create PRs to main or staging.
Only humans can.

### Agents may open PRs to dev.
Humans review everything.
