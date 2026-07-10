# Monorepo Boundaries Checklist: Agent Workflow Gates

**Purpose**: Requirements-quality gate for federated dual-stack boundary rules  
**Created**: 2026-07-04  
**Feature**: [spec.md](../spec.md)

**Note**: Tests whether requirements are well-written — not whether code compiles.

## Requirement Completeness

- [ ] CHK001 Are all forbidden cross-stack import patterns explicitly enumerated? [Completeness, Spec §Boundaries]
- [ ] CHK002 Are allowed integration surfaces (HTTP, WebSocket, published npm) listed separately from forbidden ones? [Completeness, Spec §Integration]
- [ ] CHK003 Does the spec document lockfile isolation rules for Bun vs Yarn stacks? [Gap, Spec §Boundaries]
- [ ] CHK004 Are UniversalWorkbench staging/dev copies called out as read-only unless tasked? [Completeness, Spec §Boundaries]
- [ ] CHK005 Are deprecated root `src/`/`agent/` paths and sunset criteria defined? [Gap, Spec §Boundaries]

## Requirement Clarity

- [ ] CHK006 Is "federated dual-stack" defined with measurable boundary criteria (no `workspace:*`, no relative cross-imports)? [Clarity, Spec §Boundaries]
- [ ] CHK007 Are "HTTP/WS only" integration requirements specific about which apps expose endpoints? [Clarity, Spec §Integration]
- [ ] CHK008 Is the worktree mandate stated as blocking vs advisory for feature work? [Clarity, Spec §Workflow Preferences]
- [ ] CHK009 Are success criteria for boundary enforcement objectively checkable? [Measurability, Spec §Success Criteria]

## Requirement Consistency

- [ ] CHK010 Do Commands section verify gates align with Boundaries never-rules? [Consistency, Spec §Commands]
- [ ] CHK011 Are pattern registry principles consistent with spec Boundaries section? [Consistency, Spec §Boundaries]
- [ ] CHK012 Does ECL structured-change scope conflict with speckit pre-implementation gate ordering? [Conflict, Spec §Boundaries]

## Scenario Coverage

- [ ] CHK013 Are requirements defined when an agent touches orchestration paths affecting both stacks? [Coverage, Spec §Boundaries]
- [ ] CHK014 Are rollback requirements specified if a cross-stack contract change fails mid-migration? [Gap, Exception Flow]
- [ ] CHK015 Are partial-stack-only changes explicitly in scope without triggering full dual-stack verify? [Coverage, Spec §Testing Strategy]

## Dependencies & Assumptions

- [ ] CHK016 Is the assumption that agents run in linked worktrees validated in prerequisites? [Assumption, Spec §Boundaries]
- [ ] CHK017 Are `stack-paths.json` and `monorepo-boundaries.mdc` referenced as authoritative boundary sources? [Traceability, Spec §Boundaries]
- [ ] CHK018 Is dependency-cruiser noted as future enforcement without blocking current gates? [Assumption, research.md]

## Notes

- Re-run after spec edits: `/speckit-pattern-checklist federated-dual-stack`
- Pair with `yarn lint:harness` for executable boundary coverage
