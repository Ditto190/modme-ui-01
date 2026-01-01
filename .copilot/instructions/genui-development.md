# GenUI Development Instructions

## Overview
This is a Generative UI (GenUI) R&D laboratory that combines Next.js frontend with Python ADK backend for creating dynamic, AI-generated interfaces.

## Core Principles

### 1. Local-First Architecture
- All data processing happens locally unless explicitly configured
- Client data in `data/` never leaves the machine
- Privacy is paramount

### 2. GenUI Patterns
We implement three types of GenUI:

1. **Static GenUI**: Agent selects from pre-built components in `src/components/registry/`
2. **Declarative GenUI**: Agent generates JSON schemas rendered by `DashboardRenderer`
3. **Open-Ended GenUI**: Agent creates HTML/JS in sandboxed iframes

### 3. Dual-Runtime System
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend**: Python ADK on localhost:8000
- **Bridge**: `useCoAgent` hooks sync state between TypeScript and Python

## Development Guidelines

### Adding New Components
1. Create component in `src/components/registry/`
2. Export from registry index
3. Update agent instructions in `src/prompts/copilot/`
4. Add TypeScript types in `src/lib/types.ts`

### Python Agent Tools
- Define tools in `agent/main.py`
- Tools MUST allow granular state updates
- Use `tool_context.state` to sync with frontend
- Follow naming convention: `verb_noun` (e.g., `update_kpi`, `set_layout`)

### State Management
- Define interfaces in `src/lib/types.ts`
- Python side: `callback_context.state`
- React side: `useCoAgent` hook
- Always keep state minimal and serializable

### Styling
- Use Tailwind CSS 4 utility classes
- Icons from Lucide React
- Follow existing component patterns
- Maintain responsive design (mobile-first)

## Testing Approach
1. Test UI components in isolation
2. Test agent tools independently
3. Integration tests for full flow
4. Always verify privacy constraints

## Common Tasks

### Creating a New GenUI Component
```typescript
// 1. Define in registry
export function MyComponent({ data }: MyComponentProps) {
  return (
    <div className="...">
      {/* Implementation */}
    </div>
  );
}

// 2. Add to registry index
export { MyComponent } from './MyComponent';

// 3. Update agent prompt to include new component
```

### Adding an Agent Tool
```python
def my_tool(tool_context: ToolContext, param: str) -> Dict[str, str]:
    """Tool description for the agent."""
    tool_context.state["key"] = param
    return {"status": "success"}

# Add to agent tools list
agent = LlmAgent(
    tools=[my_tool, ...],
    ...
)
```

## Security Considerations
- Never commit `.env` files
- Sanitize all user input
- Validate agent-generated HTML before rendering
- Use sandboxed iframes for open-ended GenUI
- Audit all tool executions

## Performance Tips
- Lazy load heavy components
- Optimize agent state size
- Cache agent responses when appropriate
- Use React Server Components where possible

## Debugging
- UI logs: Browser DevTools
- Agent logs: Check terminal running `npm run dev:agent`
- Network: Check localhost:8000/docs for FastAPI docs
- State sync: Add console.logs in `useCoAgent` hook
