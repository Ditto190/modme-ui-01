# ModMe GenUI Workbench - AI Agent Instructions

> **Generative UI R&D lab**: Python ADK agent generates React components via natural language.

## Architecture (Critical)

**Dual-Runtime + One-Way State Flow**:

```
Python Agent (:8000) ──writes──> tool_context.state["elements"] ──reads──> React UI (:3000)
                                        │
              CopilotKit API Gateway (:3000/api/copilotkit) bridges both runtimes
```

- **State is ONE-WAY**: Python writes → React reads. Never write to state from React.
- **Type sync required**: Python `ALLOWED_TYPES` in `agent/main.py` ↔ `renderElement()` switch in `src/app/page.tsx`
- **State contract**: `src/lib/types.ts` defines `UIElement = { id, type, props }` — Python dicts must match exactly

## Quick Start

```bash
npm run dev          # Starts both runtimes concurrently
npm run dev:agent    # Agent only (port 8000)
npm run dev:ui       # UI only (port 3000)
```

**Prerequisites**: Node.js 22.9.0+, Python 3.12+, `GOOGLE_API_KEY` in `.env`

## Key Files

| Purpose             | File                              | Notes                                        |
| ------------------- | --------------------------------- | -------------------------------------------- |
| Agent tools & state | `agent/main.py`                   | `ALLOWED_TYPES`, lifecycle hooks, tool funcs |
| Component registry  | `src/components/registry/*.tsx`   | StatCard, DataTable, ChartCard               |
| Component renderer  | `src/app/page.tsx`                | `renderElement()` switch, `useCoAgent` hook  |
| State types         | `src/lib/types.ts`                | TypeScript interfaces for state contract     |
| API bridge          | `src/app/api/copilotkit/route.ts` | HttpAgent connects to Python backend         |
| Toolset registry    | `agent/toolsets.json`             | Tool groupings with metadata                 |

## Adding Components (3-Step Sync)

**All three must stay synchronized or components won't render:**

1. **Create component** in `src/components/registry/MyWidget.tsx`:

   ```tsx
   const MyWidgetSchema = z.object({ title: z.string(), value: z.number() });
   export const MyWidget: React.FC<Props> = (rawProps) => {
     const result = MyWidgetSchema.safeParse(rawProps);
     if (!result.success) return <ErrorFallback error={result.error} />;
     return (
       <div>
         {result.data.title}: {result.data.value}
       </div>
     );
   };
   ```

2. **Register in renderer** (`src/app/page.tsx` → `renderElement` switch):

   ```tsx
   case "MyWidget": return <MyWidget key={el.id} {...el.props} />;
   ```

3. **Add to Python whitelist** (`agent/main.py`):
   ```python
   ALLOWED_TYPES = {"StatCard", "DataTable", "ChartCard", "MyWidget"}
   ```

## Agent Tool Pattern

Tools must: (1) validate inputs, (2) return status dict, (3) mutate `tool_context.state`:

```python
def my_tool(tool_context: ToolContext, id: str, type: str, props: Dict) -> Dict[str, str]:
    if type not in ALLOWED_TYPES:
        return {"status": "error", "message": f"Unknown type: {type}"}
    elements = tool_context.state.get("elements", [])
    elements.append({"id": id, "type": type, "props": props})
    tool_context.state["elements"] = elements
    return {"status": "success", "message": f"Added {id}"}
```

## Debugging

```bash
curl localhost:8000/health   # Agent health check
curl localhost:8000/ready    # Toolsets loaded confirmation
```

| Symptom                 | Cause                                  | Fix                                              |
| ----------------------- | -------------------------------------- | ------------------------------------------------ |
| Element not rendering   | Type mismatch between Python and React | Ensure `ALLOWED_TYPES` matches `renderElement()` |
| State not updating      | Tool didn't return success status      | Return `{"status": "success", ...}`              |
| Python import error     | venv not activated                     | Run `agent\.venv\Scripts\activate` (Windows)     |
| Props validation failed | Zod schema mismatch                    | Check component's schema matches agent props     |

## Project Conventions

- **Zod validation**: All components validate props with `safeParse()` and render error fallbacks
- **Lifecycle hooks**: `before_model_modifier()` injects canvas state into prompts, `after_model_modifier()` controls tool chains
- **Toolset management**: Group tools in `agent/toolsets.json`, validate with `npm run validate:toolsets`
- **Linting**: `npm run lint` runs ESLint (TS) + Ruff (Python) + markdownlint

## NPM Scripts

| Script                      | Purpose                      |
| --------------------------- | ---------------------------- |
| `npm run lint`              | ESLint + Ruff + markdownlint |
| `npm run validate:toolsets` | Validate toolset JSON schema |
| `npm run docs:all`          | Regenerate docs + diagrams   |
| `npm run detect:changes`    | Find new/modified toolsets   |

## Extended Documentation

- [../docs/REFACTORING_PATTERNS.md](../docs/REFACTORING_PATTERNS.md) — Dual-runtime refactoring guides
- [../PORTING_GUIDE.md](../PORTING_GUIDE.md) — Component portability patterns
- [../CODEBASE_INDEX.md](../CODEBASE_INDEX.md) — Full file catalog
- [../agent/skills_ref/GITLENS_INTEGRATION.md](../agent/skills_ref/GITLENS_INTEGRATION.md) — GitLens AI custom instructions generator
