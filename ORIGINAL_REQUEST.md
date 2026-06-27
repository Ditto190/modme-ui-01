# Original User Request

## Initial Request — 2026-06-27T08:26:12+10:00

Configure `lean-ctx` initialization and profile settings, and add a pre-commit step to automate the `lean-ctx` knowledge base updates similarly to existing Supabase intake methods. After implementing the configurations, lint, test, and commit the changes using the repository's standard scripts to close out the worktree.

Working directory: c:\Users\dylan\Monorepo_ModMe
Integrity mode: development

## Requirements

### R1. Configure Pre-commit & Initialization
Update the project's pre-commit configuration (e.g., `.pre-commit-config.yaml` or `.githooks`) and any initialization scripts to include a dedicated step for updating and managing the `lean-ctx` knowledge base.

### R2. Supabase Data Handling Parity
Inspect the repository's existing Supabase scripts (e.g., `scripts/run-intake.mjs`, `yarn intake:orchestrate`) and hooks. Apply the same automated data handling architecture to the `lean-ctx` knowledge base updates.

### R3. Quality Assurance
Ensure the new changes do not break the build. You must run `yarn worktree:doctor` and `yarn verify:forge` to lint, test, and guarantee CI parity before finishing.

### R4. Finalize Worktree
Stage the changes, commit them, and close out the Git worktree using the repository's standard script (`.\scripts\vibe-session-finish.ps1`). *Hint: You may need to pass arguments like `-Yes -CommitMessage "..."` to run it headlessly without interactive prompts.*

## Acceptance Criteria

### Configuration
- [ ] The pre-commit hooks correctly include the new `lean-ctx` step.
- [ ] The knowledge base update mechanism shares architectural parity with the Supabase intake scripts.

### Verification & Delivery
- [ ] `yarn verify:forge` completes successfully with a clean exit code.
- [ ] The `vibe-session-finish.ps1` script executes successfully and closes the worktree.
