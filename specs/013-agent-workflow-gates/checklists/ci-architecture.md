# CI Architecture Checklist: Agent Workflow Gates

**Purpose**: Requirements-quality gate for path-filtered verify, hooks, and affected-build equivalence  
**Created**: 2026-07-04  
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [ ] CHK001 Is ModMe's cross-stack `--affected` equivalent documented per stack (forge vs generative)? [Completeness, Spec §Commands]
- [ ] CHK002 Are pre-push hook behaviors enumerated (path-filtered verify, main/master guard)? [Gap, Spec §Commands]
- [ ] CHK003 Does the spec list all verify layers in thermo runbook order (harness → forge → generative)? [Completeness, Spec §Testing Strategy]
- [ ] CHK004 Are git hooks worktree resolution requirements documented? [Completeness, Spec §Success Criteria]
- [ ] CHK005 Is `stack-paths.json` identified as single source of truth for CI globs? [Traceability, Spec §Commands]

## Requirement Clarity

- [ ] CHK006 Is `yarn verify:forge` vs `yarn verify:generative` trigger scope defined by path prefixes? [Clarity, Spec §Testing Strategy]
- [ ] CHK007 Are Turborepo `--affected` and root path filters explicitly equated or differentiated? [Clarity, research.md]
- [ ] CHK008 Is pattern-gate execution order relative to `-VerifyStack` on session finish clear? [Clarity, quickstart.md]
- [ ] CHK009 Are advisory vs blocking CI outcomes defined for generative lint debt? [Ambiguity, Spec §Testing Strategy]

## Requirement Consistency

- [ ] CHK010 Do coverage-map verify commands only reference registered `package.json` scripts? [Consistency, patterns/coverage-map.json]
- [ ] CHK011 Are bounded-parallel-agent wave rules consistent with speckit Wave 0 checklist step? [Consistency, Spec §Workflow Preferences]
- [ ] CHK012 Does `pre-commit:check` scope match path-filtered-ci pattern paths? [Consistency, Spec §Commands]

## Acceptance Criteria Quality

- [ ] CHK013 Can hooks-in-worktree success be verified by a single doctor command output? [Measurability, Spec §Success Criteria]
- [ ] CHK014 Is pattern-coverage test inclusion in pre-commit path filters specified? [Gap, Spec §Testing Strategy]
- [ ] CHK015 Are remote Turbo cache env vars documented as next-forge-only (not root)? [Measurability, research.md]

## Scenario Coverage

- [ ] CHK016 Are requirements defined when only orchestration paths change (scripts, harness, docs)? [Coverage, Spec §Testing Strategy]
- [ ] CHK017 Are requirements specified for CI failure on one stack while the other passes? [Gap, Exception Flow]
- [ ] CHK018 Is fetch-depth/shallow clone impact on affected detection addressed for PR workflows? [Coverage, research.md]

## Non-Functional / Operations

- [ ] CHK019 Are agent session finish verify steps ordered to fail fast on harness before full stack? [Completeness, Spec §Workflow Preferences]
- [ ] CHK020 Is lean-ctx profile `agent-workflow-gates` focus_paths sufficient for gate maintenance tasks? [Gap, Spec §Project Structure]

## Notes

- Re-run: `/speckit-pattern-checklist path-filtered-ci`
- Executable gates: `yarn pre-commit:check`, `yarn lint:harness`, `yarn worktree:doctor`
