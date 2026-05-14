# Architecture Improvements — AGENTS.md Analysis

> **Source**: Analysis of architecture patterns from the AGENTS.md conversation
> exploring dashboard app design (World Monitor reference architecture).  
> **Scope**: Findings applicable to this repo's GenUI dashboard (modme-ui-01).

---

## Summary of changes made in this PR

| Area | Change | File |
|---|---|---|
| Panel registration | Extracted inline `renderElement` switch into `panel-registry.tsx` | `src/lib/panel-registry.tsx` |
| Bootstrap hydration | Added `GET /api/bootstrap` endpoint | `src/app/api/bootstrap/route.ts` |
| Type contracts | Added `PanelDefinition`, `WorkspaceVariant`, `BootstrapResponse` | `src/lib/types.ts` |
| Dependency direction | `page.tsx` now imports only from registry — no direct component imports | `src/app/page.tsx` |
| Central manifest | Added shared element + preset + variant manifest consumed by TS and Python | `src/lib/element-manifest.json`, `src/lib/element-manifest.ts`, `agent/main.py` |
| Contract guardrails | Added architecture sync tests for manifest/renderer/bootstrap/agent alignment | `tests/genui-contract-sync.test.mjs` |

---

## Focus area analysis

### 1. Dependency direction ✅ improved

**Before**: `page.tsx` imported `StatCard`, `DataTable`, and `ChartCard` directly and owned
the rendering switch.

**After**: `page.tsx` → `panel-registry.tsx` → components.  
The page knows *nothing* about individual component types; the registry owns that mapping.
Adding a new component requires one entry in `panel-registry.tsx` — the page doesn't change.

**Recommended next step**: apply the same pattern to the Python agent's `ALLOWED_TYPES` by
reading `GET /api/bootstrap` at agent startup so the two never diverge.

---

### 2. Bootstrap hydration endpoint ✅ added

**`GET /api/bootstrap`** (`src/app/api/bootstrap/route.ts`)

Returns:
- `panelConfig` — enabled panels with metadata (size, refresh interval)
- `activeVariant` — which layout preset is active
- `featureFlags` — per-panel and per-feature toggles
- `allowedTypes` — mirrors Python `ALLOWED_TYPES` for quick sync-check

**Recommended next step**: extend the payload to include first-screen summary metrics
(empty KPI values from a fast cache) so the canvas can render placeholders immediately
rather than waiting for the agent to populate them.

---

### 3. Panel registration / orchestration ✅ improved

**`PANEL_DEFINITIONS`** in `src/lib/panel-registry.tsx` is the single source of truth for:
- which panels exist
- their grid footprint (`defaultSize`)
- their refresh cadence (`refreshIntervalMs`)
- capability gates (`requiredCapabilities`)

**`renderPanel(el)`** replaces the inline switch.  Adding a new panel type:
1. Create component in `src/components/registry/`
2. Add one entry to `PANEL_RENDERER_MAP` and `PANEL_DEFINITIONS`
3. Add the same string to Python `ALLOWED_TYPES`

No other file changes required.

---

### 4. Variant system ⚠️ types added, not yet wired

The `DashboardVariant` type and `activeVariant` field in `BootstrapResponse` are defined.
The bootstrap endpoint returns `"default"` for now.

**Recommended next step**:
```typescript
// src/lib/variants.ts
export const DASHBOARD_VARIANTS: DashboardVariant[] = [
  { id: "default",  label: "General",  panels: ["StatCard", "DataTable", "ChartCard"] },
  { id: "kpi-only", label: "Executive", panels: ["StatCard"] },
  { id: "analyst",  label: "Analyst",  panels: ["DataTable", "ChartCard"] },
];
```
The active variant would then filter `PANEL_DEFINITIONS` before returning from bootstrap,
giving role-based layouts without touching any component code.

---

### 5. Cache tiers ⚠️ not yet implemented

The bootstrap endpoint sets a short HTTP cache header (`max-age=60, stale-while-revalidate=300`).
True cache tiers would require a Redis layer:

| Data tier | Refresh | Mechanism |
|---|---|---|
| Hot (live alerts) | 15–30 s | polling / SSE |
| Warm (aggregate KPIs) | 5 min | Redis with TTL |
| Cold (reference config) | 24 h | Redis / static JSON |

**Recommended next step**: add a Redis cache in the Python agent for expensive Gemini
calls. Wrap `upsert_ui_element` with a debounce so rapid re-renders don't bypass the cache.

---

### 6. Circuit breakers ⚠️ not yet implemented

The Python agent currently has no fallback if Gemini API calls fail — the user sees a
spinning loader indefinitely.

**Recommended pattern**:
```python
# agent/tools/circuit_breaker.py
class CircuitBreaker:
    def __init__(self, failure_threshold=3, recovery_timeout=30):
        ...
    def call(self, fn, *args, **kwargs):
        if self.state == "open":
            raise CircuitOpenError("Service temporarily unavailable")
        ...
```
Apply to the `upsert_ui_element` tool so the frontend receives a structured error element
instead of a timeout.

---

### 7. Background workers ⚠️ not yet implemented

The current architecture is fully request-driven: the agent generates UI only in response
to user messages. For a production dashboard, a background worker would:

- pre-warm the canvas with cached KPI values on session start
- refresh `ChartCard` data on `refreshIntervalMs` intervals
- run expensive aggregations out-of-band

**Recommended next step**: add a FastAPI background task triggered by session creation
that calls `upsert_ui_element` with cached summary metrics.  The user sees populated
panels immediately; the agent then refines them.

---

### 8. Testing guardrails ⚠️ minimal coverage

Current coverage: no tests for `panel-registry.tsx`, `bootstrap/route.ts`, or component
prop-validation paths.

**Recommended additions** (following the pattern in `docs/REFACTORING_PATTERNS.md`):

```typescript
// src/lib/__tests__/panel-registry.test.tsx
import { renderPanel } from "@/lib/panel-registry";

test("renderPanel returns error card for unknown type", () => {
  const el = { id: "x", type: "NonExistent", props: {} };
  const node = renderPanel(el);
  expect(node.props.className).toMatch(/red/);
});

test("renderPanel renders StatCard for known type", () => {
  const el = { id: "s1", type: "StatCard", props: { title: "T", value: 1 } };
  expect(() => renderPanel(el)).not.toThrow();
});
```

```typescript
// src/app/api/bootstrap/__tests__/route.test.ts
import { GET } from "@/app/api/bootstrap/route";

test("GET /api/bootstrap returns 200 with allowedTypes", async () => {
  const res = await GET();
  const body = await res.json();
  expect(body.allowedTypes).toContain("StatCard");
  expect(body.panelConfig.length).toBeGreaterThan(0);
});
```

---

### 9. API contract discipline ✅ types added

`BootstrapResponse` in `src/lib/types.ts` is the typed contract between the bootstrap
endpoint and any consumer (frontend hook, agent startup check, tests).

**Recommended next step**: generate a JSON Schema from `BootstrapResponse` (using the
existing `agent-generator` tooling) and validate the agent's `ALLOWED_TYPES` against it
at startup to prevent silent mismatches.

---

## Applying the ideas to a project-management dashboard

The conversation's "World Monitor"-inspired architecture maps cleanly to a PM dashboard:

| PM entity | Panel type | Refresh tier |
|---|---|---|
| Sprint KPIs (velocity, burn-down) | `StatCard` | warm (5 min) |
| Active issues / blockers | `DataTable` | warm (5 min) |
| Trend charts (cycle time, throughput) | `ChartCard` | cold (15 min) |
| Risk score | Future `RiskCard` | hot (1 min) |

Suggested panel variants:
- `executive` → StatCard only
- `engineering` → DataTable + ChartCard
- `full` → all panels

The bootstrap endpoint would pre-populate the first three panels from a Redis cache
before the agent refines them with live data — exactly the bootstrap-then-lazy-hydrate
pattern described in the architecture conversation.

---

## Post-merge execution checklist (actionable order)

1. **Ship variant wiring first**  
   Implement `DASHBOARD_VARIANTS` and filter `PANEL_DEFINITIONS` in `GET /api/bootstrap` by `activeVariant`.

2. **Tighten contract guardrails**  
   Add unit tests for `renderPanel` and bootstrap response shape, then keep `tests/genui-contract-sync.test.mjs` as the cross-artifact alignment gate.

3. **Add bootstrap placeholder hydration**  
   Return fast placeholder KPI payloads in bootstrap so the canvas renders immediately before agent refinement.

4. **Introduce cache tiering for expensive agent paths**  
   Add Redis-backed warm/cold caches around costly agent data generation before adding new panel types.

5. **Add resilience before scale-out**  
   Implement a circuit breaker/fallback error element path for agent-side generation failures, then add background refresh workers for interval-driven panels.
