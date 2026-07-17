---
title: "ADR-0013: Observability Pipeline Entry Points and Session Trace Config"
status: "Proposed"
date: "2026-07-11"
authors: "GitLab Duo"
tags: ["architecture", "decision", "observability"]
supersedes: ""
superseded_by: ""
---

## Status

**Proposed**

## Context

ModMe observability is split across session logging, lean-ctx capture, telemetry promotion, and optional Greptime OTel span export. The current repo has multiple entry points that must stay aligned:

- `scripts/telemetry/telemetry-cli.mjs` collects JSONL logs, lean-ctx journals, tee failures, markers, archive refs, and test results.
- `scripts/telemetry/otel-session-start.mjs` creates the root `agent.session` span and writes the trace reference row.
- `.github/hooks/session-logger/session-logger.ps1` writes Copilot/Cursor session logs.
- `.github/hooks/hooks.json` wires session lifecycle and lean-ctx hook execution.
- `scripts/telemetry/lib/telemetry-bridge.mjs` normalizes, validates, and dual-writes telemetry into Supabase and Greptime.
- `next-forge/packages/schemas/observability.ts` defines the canonical schemas and enums.

The pipeline currently depends on environment variables being present at the right lifecycle phase, otherwise one store is written without the correlation keys needed by the others.

## Decision

Use the existing telemetry CLI, session-start bridge, and hook wiring as the single supported observability pipeline, and standardize the required session environment variables and collection paths around that flow.

Required runtime inputs:

- `AGENT_SESSION_ID`
- `OTEL_SERVICE_NAME`
- `OTEL_RESOURCE_ATTRIBUTES`
- `DEV_TENANT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GREPTIME_PSQL_URL`
- `GREPTIME_OTEL_ENABLED=1` when Greptime export is enabled

Required lifecycle calls:

- session start → `scripts/telemetry/otel-session-start.mjs`
- session end → `yarn telemetry:sync`
- hook capture → `.github/hooks/session-logger/session-logger.ps1`

## Consequences

### Positive

- **POS-001**: Session logs, lean-ctx artifacts, Supabase rows, and Greptime spans share the same correlation keys.
- **POS-002**: The pipeline stays inspectable because collection, normalization, and promotion are separate scripts.
- **POS-003**: Schema validation happens before promotion through the shared Zod contracts.
- **POS-004**: Agent platform coverage can expand without changing the promotion layer.

### Negative

- **NEG-001**: Missing env vars can still break a stage even when earlier stages succeeded.
- **NEG-002**: The flow depends on several files staying in sync across hooks, scripts, and schemas.
- **NEG-003**: Greptime export remains optional and can fail independently of Supabase writes.

## Alternatives Considered

### Ad hoc per-tool logging

- **ALT-001**: **Description**: Let each agent or hook write directly to its own store without a shared bridge.
- **ALT-002**: **Rejection Reason**: Correlation breaks across stores and trace reuse becomes unreliable.

### Supabase-only telemetry

- **ALT-003**: **Description**: Store all observability data only in Supabase tables.
- **ALT-004**: **Rejection Reason**: This loses the Greptime span path and weakens time-series trace analysis.

### Greptime-only tracing

- **ALT-005**: **Description**: Export only OTel spans to Greptime and skip JSONL/session promotion.
- **ALT-006**: **Rejection Reason**: This drops session logs, lean-ctx capture, and promotion metadata used by the UI and audits.

## Implementation Notes

- **IMP-001**: Keep `scripts/telemetry/telemetry-cli.mjs` as the promotion entry point for all collected artifacts.
- **IMP-002**: Keep `scripts/telemetry/otel-session-start.mjs` responsible for root span creation and trace reference writes.
- **IMP-003**: Keep `.github/hooks/hooks.json` and `session-logger.ps1` aligned with the session lifecycle.
- **IMP-004**: Validate `next-forge/packages/schemas/observability.ts` and `docs/inbox-pipeline/contracts/observability-contract.v1.json` together.
- **IMP-005**: Treat `GREPTIME_OTEL_ENABLED` as an explicit opt-in so Supabase promotion still works when Greptime is unavailable.

## References

- **REF-001**: `docs/observability/README.md`
- **REF-002**: `scripts/telemetry/telemetry-cli.mjs`
- **REF-003**: `scripts/telemetry/otel-session-start.mjs`
- **REF-004**: `scripts/telemetry/lib/telemetry-bridge.mjs`
- **REF-005**: `next-forge/packages/schemas/observability.ts`
- **REF-006**: `docs/adr/0012-advisory-lean-ctx-session-config-workflow.md`
