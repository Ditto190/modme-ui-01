# Contracts Checklist: Agent Workflow Gates

**Purpose**: Requirements-quality gate for schema, WS, and molecule contract integration  
**Created**: 2026-07-04  
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [ ] CHK001 Are golden fixture update rules defined when `@repo/schemas` changes? [Gap, Spec §Integration]
- [ ] CHK002 Are WebSocket contract parity requirements specified between agent-server and next-forge? [Completeness, Spec §Integration]
- [ ] CHK003 Does the spec define molecule manifest semver bump criteria? [Gap, Spec §Success Criteria]
- [ ] CHK004 Are `packages/intake-contracts` and forge schemas both in scope for contract-first work? [Completeness, Spec §Integration]
- [ ] CHK005 Are contract test failure modes documented (block merge vs advisory)? [Gap, Spec §Testing Strategy]

## Requirement Clarity

- [ ] CHK006 Is "contract-first integration" defined with ordering (schemas before UI cutover)? [Clarity, Spec §Integration]
- [ ] CHK007 Are branded ID and golden JSON requirements specific enough to write tests from? [Clarity, Spec §Integration]
- [ ] CHK008 Is `yarn molecule-index:verify` described as acceptance gate vs optional check? [Clarity, Spec §Commands]
- [ ] CHK009 Are HTTP proxy vs direct WS paths distinguished for CopilotKit integration? [Ambiguity, Spec §Integration]

## Requirement Consistency

- [ ] CHK010 Do Success Criteria contract bullets match Testing Strategy table rows? [Consistency, Spec §Success Criteria]
- [ ] CHK011 Are pattern `contract-first-integration` paths aligned with spec Integration section? [Consistency, Spec §Integration]
- [ ] CHK012 Does research.md zod v3/v4 note conflict with current schema test commands? [Conflict, research.md]

## Acceptance Criteria Quality

- [ ] CHK013 Can "schema contracts pass" be measured by named commands only (no subjective review)? [Measurability, Spec §Success Criteria]
- [ ] CHK014 Are fixture drift detection requirements tied to CI/pre-push path filters? [Measurability, Spec §Testing Strategy]
- [ ] CHK015 Is molecule index manifest field completeness specified (kind, id, path, semver)? [Completeness, Spec §Success Criteria]

## Scenario Coverage

- [ ] CHK016 Are requirements defined for partial schema migration (forge updated, legacy not yet)? [Gap, Alternate Flow]
- [ ] CHK017 Are breaking WS message shape changes required to bump contract version? [Gap, Exception Flow]
- [ ] CHK018 Are requirements specified when intake-contracts diverge from forge schemas temporarily? [Coverage, Edge Case]

## Dependencies & Assumptions

- [ ] CHK019 Is hosted Supabase contract storage assumed or optional for this feature? [Assumption, Spec §Integration]
- [ ] CHK020 Are external Pact-style tools explicitly out of scope with golden Vitest as substitute? [Traceability, research.md]

## Notes

- Verify commands: `yarn molecule-index:verify`
- Re-run: `/speckit-pattern-checklist contract-first-integration`
