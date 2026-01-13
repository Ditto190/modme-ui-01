# AGENTS.md - Agent Development Guide

**Purpose**: Guidelines for agentic coding assistants working in this GenUI workspace.

## Essential Commands

### Development
```bash
npm run dev              # Start both UI (3000) and agent (8000)
npm run dev:ui           # Frontend only
npm run dev:agent        # Python agent only
npm run dev:debug        # With LOG_LEVEL=debug
```

### Build & Quality
```bash
npm run build            # Build Next.js for production
npm run lint             # ESLint (TS) + Ruff (Python)
npm run lint:fix         # Auto-fix lint issues
npm run format           # Prettier + Ruff format
npx tsc --noEmit         # TypeScript type checking
```

### Testing
```bash
# Python (pytest)
pytest tests/                    # Run all tests
pytest tests/test_file.py       # Run single test file
pytest tests/test_file.py::test_function_name  # Run specific test
pytest -v                        # Verbose output
pytest --cov                    # Coverage report

# TypeScript/React (check for test files - none configured yet)
```

### Documentation & Validation
```bash
npm run validate:toolsets    # Validate toolset JSON schemas
npm run docs:all             # Generate all docs + diagrams
npm run docs:sync            # Sync JSON ↔ Markdown
```

## Code Style Guidelines

### Imports
- Group: external libs → internal modules → relative imports
- Use `@/*` alias for src imports: `import { UIElement } from "@/lib/types"`
- No default exports for components (named exports preferred)

### Formatting
- **TypeScript/React**: Prettier (auto-run via `npm run format`)
- **Python**: Ruff format (auto-run via `npm run format`)
- **Line length**: No strict limit, keep readable

### TypeScript Rules
- **Strict mode enabled**: `strict: true` in tsconfig.json
- Use `type` for type-only imports: `import type { Metadata } from "next"`
- No `any`: Use `unknown` or proper types
- Props interfaces should be inferred from Zod schemas

### Python Rules
- **Type hints required**: All functions must have type annotations
- Use `Dict[str, Any]` for JSON props, not generic `dict`
- Docstrings follow Google style (triple quotes)
- `from __future__ import annotations` at top of files

### Naming Conventions
- **Files**: PascalCase for components (`StatCard.tsx`), snake_case for modules
- **React components**: PascalCase, named export (`export const StatCard: React.FC<Props>`)
- **Element IDs**: snake_case (`revenue_stat`)
- **Component types**: PascalCase strings (`"StatCard"`)
- **Props**: camelCase (`trendDirection`)
- **Functions/variables**: snake_case in Python, camelCase in TypeScript

### Error Handling
- **Components**: Use Zod `safeParse()` with fallback UI
- **Agent tools**: Return `{"status": "error"|"success", "message": "..."}`
- **API routes**: Proper FastAPI/Next.js error responses
- **Always validate props before use** (see StatCard.tsx)

### Component Pattern
```typescript
// 1. Define Zod schema for validation
const PropsSchema = z.object({ title: z.string(), value: z.number() });

// 2. Infer type from schema
type Props = z.infer<typeof PropsSchema>;

// 3. Validate and render
export const MyComponent: React.FC<Props> = (rawProps) => {
  const result = PropsSchema.safeParse(rawProps);
  if (!result.success) return <ErrorFallback />;
  const props = result.data;
  return <div>{props.title}</div>;
};
```

### Agent Tool Pattern
```python
def my_tool(tool_context: ToolContext, param: str) -> Dict[str, str]:
    if not param or not isinstance(param, str):
        return {"status": "error", "message": "Invalid param"}
    
    elements = tool_context.state.get("elements", [])
    # ... operation ...
    
    tool_context.state["elements"] = elements
    return {"status": "success", "message": "Done"}
}
```

### Critical Conventions (Do Not Break)
- **State is ONE-WAY**: Python writes → React reads. Never mutate from React.
- **ALLOWED_TYPES whitelist**: Must match switch cases in `src/app/page.tsx`
- **Props must be JSON-serializable**: No functions, no circular refs
- **Key prop required**: Always use `key={el.id}` when rendering lists

### File Locations
| Purpose | Path |
|---------|------|
| Components | `src/components/registry/` |
| Types | `src/lib/types.ts` |
| Page renderer | `src/app/page.tsx` |
| Agent tools | `agent/main.py` |
| Tests | `tests/*.py` |

### Environment
- Node.js: 22.9.0+ (use nvm)
- Python: 3.12+ (with uv or pip)
- Required: `GOOGLE_API_KEY` in `.env`

### Debugging
```bash
curl http://localhost:8000/health  # Agent health
curl http://localhost:8000/ready   # Agent readiness + toolset info
```

See `.github/copilot-instructions.md` for detailed architecture and patterns.
