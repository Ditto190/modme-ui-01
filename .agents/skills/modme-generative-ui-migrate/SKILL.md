---
name: modme-generative-ui-migrate
description: Framework migration playbook for moving GenerativeUI (CopilotKit + agent-server) into next-forge without breaking the legacy stack. Use when porting web-dashboard, GenerativeCanvas, shared-schemas, or planning Phase 4 migration.
---

# ModMe GenerativeUI → next-forge Migration

Document-first migration. **Do not** cross-import monorepos. GenerativeUI stays runnable until parity checklist passes.

## Boundaries

| Source | Target | Integration |
|--------|--------|-------------|
| `GenerativeUI_monorepo/apps/web-dashboard` | `next-forge/apps/app` | Strangler route group |
| `GenerativeCanvas` + hooks | Client leaf in `apps/app` | `'use client'` + dynamic import |
| `@generative-ui/shared-schemas` | `@repo/schemas` (new) | Zod only; Python stays in agent-server |
| `apps/agent-server` | Unchanged satellite | WebSocket / HTTP only |

## Migration phases

### Phase 1 — Workshop (current)

- Mirror UI patterns in Storybook `ModMe/Workshop` before production code.
- Use `@repo/design-system` direct imports (no barrel files).
- Composition: `CanvasShell`, `AgentStatus`, `StreamingPanel`, `CanvasActions`.

### Phase 2 — Schemas

1. Create `next-forge/packages/schemas` with `@repo/schemas` name.
2. Copy Zod definitions from `GenerativeUI_monorepo/packages/shared-schemas`.
3. Keep agent-server Pydantic models in sync manually until shared codegen exists.

### Phase 3 — Client island

1. Add route group e.g. `apps/app/app/(authenticated)/generative-ui/`.
2. Port `useAgentState` as client hook; env `NEXT_PUBLIC_AGENT_SERVER_WS_URL` points to port 8000 (GenerativeUI).
3. Dynamic-import CopilotKit / heavy bundles (`next/dynamic`, `ssr: false` only inside client boundary).

### Phase 4 — Cutover

1. Feature-flag new routes via `@repo/feature-flags`.
2. Deprecate `web-dashboard` when checklist passes.
3. Never delete GenerativeUI lockfiles until cutover is complete.

## React rules (ModMe)

- **Server components first:** `page.tsx` / `layout.tsx` stay server; agent UI is a client leaf.
- **Error boundary:** wrap agent UI before WebSocket integration (`error.tsx` or class boundary in workshop).
- **No cross-workspace imports:** use HTTP/WS or published packages only.
- **Bundle dynamic imports:** use `next/dynamic` inside client boundaries for CopilotKit and heavy agent bundles (`ssr: false` only within `'use client'` modules).
- **No barrel imports:** import from `@repo/design-system/components/ui/button` (not `@repo/design-system` index re-exports) to keep Storybook and app bundles tree-shakeable.

## Rollback

- `yarn dev:generative` restores full legacy stack.
- Disable feature flags in next-forge to hide new routes.
- No shared lockfiles between monorepos.

## Verification checklist

- [ ] Storybook stories match GenerativeCanvas UX
- [ ] WebSocket connects to agent-server on worktree port
- [x] `@repo/schemas` types match shared-schemas
- [ ] `yarn dev:generative` and `yarn dev:forge` run concurrently without port clash
- [ ] `bun run build` passes in next-forge
- [x] Client island at `apps/app/(authenticated)/generative-ui/`

## References

- [`.agents/skills/next-forge/SKILL.md`](../next-forge/SKILL.md)
- [`docs/codebase/STACK.md`](../../../docs/codebase/STACK.md)
- [`docs/codebase/ARCHITECTURE.md`](../../../docs/codebase/ARCHITECTURE.md)
- [`docs/codebase/STRUCTURE.md`](../../../docs/codebase/STRUCTURE.md)
- Source: `GenerativeUI_monorepo/apps/web-dashboard/src/components/GenerativeCanvas.tsx`
