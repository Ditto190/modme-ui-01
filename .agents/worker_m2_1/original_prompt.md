## 2026-06-27T07:57:16+10:00
**Role**: M2 Implementer
**Objective**: Implement Milestone 2 (Knowledge/Memory Scaffold).
**Instructions**:
1. Read `c:\Users\dylan\Monorepo_ModMe\PROJECT.md` for scope.
2. Read the M2 Explorer handoff report at `c:\Users\dylan\Monorepo_ModMe\.agents\m2_explorer_1\handoff.md`.
3. **CRITICAL INSTRUCTION**: The explorer recommends modifying `.lean-ctx.toml` in Step 1 of its plan to add `graph_index_max_files`, `memory_profile`, `memory_cleanup`, and `multi_agent_sync`. **DO NOT DO THIS**. Those keys are hallucinated and invalid for lean-ctx 3.7.5. They will cause a Forensic Audit Failure. Do not touch `.lean-ctx.toml` at all.
4. Create the three directories: `.lean-ctx/memory/knowledge`, `.lean-ctx/memory/sessions`, `.lean-ctx/memory/diary` in the workspace root.
5. Implement `scripts/lean-ctx-index.ps1` exactly as described in Step 3 of the explorer's plan.
6. Verify your implementation by running the script on a dummy file as suggested in the explorer's verification method.
7. Write your handoff report to `handoff.md` in your working directory.
8. Update `progress.md` in your working directory periodically.
9. **MANDATORY INTEGRITY WARNING**:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.
10. Send a completion message to your parent when done.
