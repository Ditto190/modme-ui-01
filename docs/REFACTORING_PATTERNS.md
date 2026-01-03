# Refactoring Patterns for ModMe GenUI Workbench

> **Project-specific refactoring guides for Python ADK + TypeScript/React GenUI dual-runtime architecture**

**Last Updated**: January 2, 2026  
**Tech Stack**: Python 3.12+ (Google ADK, FastMCP), TypeScript 5, React 19, Next.js 16, CopilotKit 1.50.0

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Python Backend Refactoring](#python-backend-refactoring)
3. [TypeScript/React Frontend Refactoring](#typescriptreact-frontend-refactoring)
4. [State Contract Refactoring](#state-contract-refactoring)
5. [Component Registry Refactoring](#component-registry-refactoring)
6. [Tool Schema Refactoring](#tool-schema-refactoring)
7. [Testing Refactoring](#testing-refactoring)
8. [Performance Optimization](#performance-optimization)
9. [Security Hardening](#security-hardening)
10. [Common Anti-Patterns](#common-anti-patterns)

---

## Architecture Overview

### Dual-Runtime Communication Pattern

```
Python Agent (localhost:8000)          React UI (localhost:3000)
      │                                         │
      │ writes to tool_context.state           │ reads via useCoAgent
      ├─[upsert_ui_element]──────────────────> │
      ├─[remove_ui_element]───────────────────> │
      └─[clear_canvas]────────────────────────> │
                                                 │
                                                 └─> GenerativeCanvas renders
```

**Critical Constraint**: State flows **ONE WAY** (Python → React). React never writes back to agent state.

### Key Files

| Layer | Files | Responsibility |
|-------|-------|----------------|
| **Python Agent** | `agent/main.py` | Tool definitions, state injection, lifecycle hooks |
| **State Contract** | `src/lib/types.ts` | TypeScript interfaces matching Python dict structure |
| **React Frontend** | `src/app/page.tsx` | Component registry, CopilotSidebar, canvas rendering |
| **API Gateway** | `src/app/api/copilotkit/route.ts` | CopilotKit runtime + HttpAgent bridge |
| **Component Registry** | `src/components/registry/*.tsx` | UI molecules (StatCard, DataTable, ChartCard) |

---

## Python Backend Refactoring

### Pattern 1: Tool Function Refactoring

**✅ GOOD: Type-Safe Tool with Context**

```python
# agent/main.py
from google.adk.tools import ToolContext
from typing import Dict, Any

def upsert_ui_element(
    tool_context: ToolContext, 
    id: str, 
    type: str, 
    props: Dict[str, Any]
) -> Dict[str, str]:
    """
    Add or update a UI element in the workbench canvas.
    
    Args:
        id: Unique element identifier (snake_case recommended)
        type: Component type (PascalCase, must match registry)
        props: JSON-serializable properties (camelCase keys)
    
    Returns:
        Success message with element metadata
    """
    # Validate inputs
    if not id or not isinstance(id, str):
        return {"status": "error", "message": "Invalid id"}
    if type not in ALLOWED_TYPES:
        return {"status": "error", "message": f"Unknown type: {type}"}
    
    # Get current state
    elements = tool_context.state.get("elements", [])
    new_element = {"id": id, "type": type, "props": props}
    
    # Upsert logic
    found = False
    for i, el in enumerate(elements):
        if el.get("id") == id:
            elements[i] = new_element
            found = True
            break
    
    if not found:
        elements.append(new_element)
    
    # Write back to state
    tool_context.state["elements"] = elements
    
    return {
        "status": "success", 
        "message": f"Element '{id}' of type '{type}' {'updated' if found else 'added'}."
    }

# Validation constants
ALLOWED_TYPES = {"StatCard", "DataTable", "ChartCard"}
```

**❌ BAD: Unvalidated Tool**

```python
# Missing validation, generic exception handling, no type hints
def upsert_ui_element(tool_context, id, type, props):
    try:
        elements = tool_context.state["elements"]  # KeyError if missing
        elements.append({"id": id, "type": type, "props": props})  # Always appends (duplicates!)
        return {"status": "success"}  # No context in message
    except Exception as e:
        return {"status": "error"}  # Swallows error details
```

**Refactoring Checklist**:
- ✅ Add type hints for all parameters and return values
- ✅ Validate inputs before state mutations
- ✅ Check if element exists before deciding append vs update
- ✅ Use `.get()` with defaults for safe state access
- ✅ Return descriptive success/error messages
- ✅ Document Args/Returns in docstring

---

### Pattern 2: Lifecycle Hook Refactoring

**✅ GOOD: State Injection with Current Elements**

```python
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.genai import types
import json

def before_model_modifier(
    callback_context: CallbackContext, 
    llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """Inject current canvas state into system instructions."""
    
    # Get current state safely
    elements = callback_context.state.get("elements", [])
    elements_json = json.dumps(elements, indent=2)
    
    # Get existing instruction
    original_instruction = llm_request.config.system_instruction or types.Content(
        role="system", 
        parts=[]
    )
    
    # Ensure instruction is Content type
    if not isinstance(original_instruction, types.Content):
        original_instruction = types.Content(
            role="system", 
            parts=[types.Part(text=str(original_instruction))]
        )
    
    # Ensure parts exist
    if not original_instruction.parts:
        original_instruction.parts = [types.Part(text="")]
    
    # Prepend state context
    state_context = f"""Current Canvas Elements:
{elements_json}

Element Count: {len(elements)}
Available Actions: upsert_ui_element, remove_ui_element, clear_canvas
"""
    
    original_instruction.parts[0].text = state_context + (original_instruction.parts[0].text or "")
    llm_request.config.system_instruction = original_instruction
    
    return None  # Continue processing
```

**❌ BAD: Unsafe State Access**

```python
def before_model_modifier(callback_context, llm_request):
    elements = callback_context.state["elements"]  # KeyError if missing
    instruction = llm_request.config.system_instruction
    instruction.parts[0].text = str(elements) + instruction.parts[0].text  # Assumes parts exist
    return None
```

**Refactoring Checklist**:
- ✅ Use `.get()` with defaults for state access
- ✅ Validate instruction structure before mutations
- ✅ Format state for readability (JSON, counts, summaries)
- ✅ Prepend (not append) state to preserve original instructions
- ✅ Return None to continue (or LlmResponse to short-circuit)

---

### Pattern 3: Health Endpoint Refactoring

**✅ GOOD: Comprehensive Readiness Check**

```python
# agent/main.py
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse

app = FastAPI(title="GenUI Workbench Agent")

@app.get("/health")
async def health_check():
    """Liveness probe - basic service availability."""
    return JSONResponse(
        content={
            "status": "healthy",
            "service": "GenUI Workbench Agent",
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat()
        },
        status_code=status.HTTP_200_OK
    )

@app.get("/ready")
async def readiness_check():
    """Readiness probe - all dependencies loaded."""
    try:
        # Check critical dependencies
        from toolset_manager import toolset_manager
        toolsets = toolset_manager.list_available_toolsets()
        
        # Verify model connectivity
        model_status = await check_gemini_connection()
        
        # Verify state manager
        state_healthy = verify_state_manager()
        
        if not all([len(toolsets) > 0, model_status, state_healthy]):
            return JSONResponse(
                content={
                    "status": "not_ready",
                    "dependencies": {
                        "toolsets_loaded": len(toolsets) > 0,
                        "model_connected": model_status,
                        "state_healthy": state_healthy
                    }
                },
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        return JSONResponse(
            content={
                "status": "ready",
                "dependencies": {
                    "toolset_count": len(toolsets),
                    "toolsets": toolsets[:5],  # First 5
                    "model": "gemini-2.5-flash",
                    "state_manager": "in-memory"
                }
            },
            status_code=status.HTTP_200_OK
        )
    
    except Exception as e:
        return JSONResponse(
            content={
                "status": "not_ready",
                "error": str(e),
                "error_type": type(e).__name__
            },
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )
```

**❌ BAD: Minimal Health Check**

```python
@app.get("/health")
async def health_check():
    return {"status": "ok"}  # No version, timestamp, or dependency checks
```

**Refactoring Checklist**:
- ✅ Separate `/health` (liveness) from `/ready` (readiness)
- ✅ Check all critical dependencies in readiness probe
- ✅ Return proper HTTP status codes (200 vs 503)
- ✅ Include version, timestamp, and dependency metadata
- ✅ Use structured error responses with error types

---

## TypeScript/React Frontend Refactoring

### Pattern 4: useCoAgent Hook Refactoring

**✅ GOOD: Type-Safe State Consumption**

```typescript
// src/app/page.tsx
import { AgentState, UIElement } from "@/lib/types";
import { useCoAgent } from "@copilotkit/react-core";

function YourMainContent() {
  const { state, setState } = useCoAgent<AgentState>({
    name: "WorkbenchAgent",
    initialState: {
      elements: [],
    },
  });
  
  // Safe access with fallback
  const elements = state?.elements || [];
  
  // ❌ NEVER mutate state directly
  // setState((prev) => [...prev.elements, newElement]); // DON'T DO THIS
  
  // ✅ CORRECT: State is read-only, only Python agent writes
  
  return (
    <div className="canvas">
      {elements.length === 0 ? (
        <EmptyState />
      ) : (
        elements.map((el) => <ElementRenderer key={el.id} element={el} />)
      )}
    </div>
  );
}
```

**❌ BAD: Direct State Mutation**

```typescript
// ANTI-PATTERN: Trying to write to agent state from React
const { state, setState } = useCoAgent<AgentState>({ name: "WorkbenchAgent" });

function handleAdd() {
  // ❌ This breaks the one-way data flow
  setState((prev) => ({
    elements: [...prev.elements, { id: "new", type: "StatCard", props: {} }],
  }));
}
```

**Refactoring Checklist**:
- ✅ Import `AgentState` type from `src/lib/types.ts`
- ✅ Use `state?.elements || []` for safe access
- ✅ Never call `setState` to mutate agent state
- ✅ Treat state as read-only in React
- ✅ Only Python agent writes to `tool_context.state`

---

### Pattern 5: Component Registry Refactoring

**✅ GOOD: Exhaustive Switch with Error Handling**

```typescript
// src/app/page.tsx
import { StatCard } from "@/components/registry/StatCard";
import { DataTable } from "@/components/registry/DataTable";
import { ChartCard } from "@/components/registry/ChartCard";
import { UIElement } from "@/lib/types";

function renderElement(el: UIElement): JSX.Element {
  switch (el.type) {
    case "StatCard":
      return <StatCard key={el.id} {...el.props} />;
    
    case "DataTable":
      return <DataTable key={el.id} {...el.props} />;
    
    case "ChartCard":
      return <ChartCard key={el.id} {...el.props} />;
    
    default:
      // Log unknown types for debugging
      console.error(`Unknown component type: ${el.type}`, el);
      return (
        <div 
          key={el.id} 
          className="p-4 bg-red-50 text-red-500 rounded border border-red-200"
        >
          <p className="font-semibold">Unknown component type: {el.type}</p>
          <pre className="text-xs mt-2">{JSON.stringify(el, null, 2)}</pre>
        </div>
      );
  }
}

// Usage
<div className="canvas">
  {state.elements.map(renderElement)}
</div>
```

**❌ BAD: Missing Default Case**

```typescript
function renderElement(el: UIElement) {
  switch (el.type) {
    case "StatCard":
      return <StatCard {...el.props} />;
    case "DataTable":
      return <DataTable {...el.props} />;
    // Missing default case = nothing renders for unknown types
  }
}
```

**Refactoring Checklist**:
- ✅ Include `default` case for unknown types
- ✅ Log errors to console for debugging
- ✅ Render fallback UI showing the error
- ✅ Include `key={el.id}` in all rendered elements
- ✅ Spread props with `{...el.props}`
- ✅ Extract to separate function for readability

---

### Pattern 6: Frontend Tool Refactoring

**✅ GOOD: Validated Theme Tool**

```typescript
// src/app/page.tsx
import { useFrontendTool } from "@copilotkit/react-core";
import { useState } from "react";
import { z } from "zod";

const ThemeColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export default function CopilotKitPage() {
  const [themeColor, setThemeColor] = useState("#6366f1");
  
  useFrontendTool({
    name: "setThemeColor",
    parameters: [
      {
        name: "themeColor",
        description: "Hex color code (e.g., #ff6600)",
        required: true,
      },
    ],
    handler({ themeColor }) {
      try {
        // Validate color format
        ThemeColorSchema.parse(themeColor);
        setThemeColor(themeColor);
        console.info(`Theme color updated to ${themeColor}`);
      } catch (error) {
        console.error("Invalid theme color:", themeColor, error);
        // Don't update state if invalid
      }
    },
  });
  
  return (
    <main style={{ "--copilot-kit-primary-color": themeColor } as React.CSSProperties}>
      {/* ... */}
    </main>
  );
}
```

**❌ BAD: Unvalidated Tool**

```typescript
useFrontendTool({
  name: "setThemeColor",
  parameters: [{ name: "themeColor", required: true }],
  handler({ themeColor }) {
    setThemeColor(themeColor);  // No validation, could be malicious/invalid
  },
});
```

**Refactoring Checklist**:
- ✅ Validate all inputs (use Zod schemas)
- ✅ Add error handling in handler
- ✅ Log actions for debugging
- ✅ Don't update state if validation fails
- ✅ Provide clear parameter descriptions
- ✅ Type the handler parameters

---

## State Contract Refactoring

### Pattern 7: Type Definition Alignment

**✅ GOOD: Synchronized Types**

```python
# agent/main.py (Python side)
def upsert_ui_element(tool_context: ToolContext, id: str, type: str, props: Dict[str, Any]):
    tool_context.state["elements"] = [
        {"id": "revenue", "type": "StatCard", "props": {"title": "MRR", "value": 120000}},
        {"id": "users", "type": "DataTable", "props": {"columns": ["Name", "Email"], "data": []}}
    ]
```

```typescript
// src/lib/types.ts (TypeScript side)
export type UIElement = {
  id: string;                // Must match Python "id" key
  type: string;              // Must match Python "type" key
  props: any;                // Must match Python "props" key (JSON-serializable)
};

export type AgentState = {
  elements: UIElement[];     // Must match Python "elements" key
};
```

**❌ BAD: Mismatched Keys**

```python
# Python uses "component_id"
tool_context.state["elements"] = [
    {"component_id": "revenue", "component_type": "StatCard", "data": {...}}
]
```

```typescript
// TypeScript expects "id"
type UIElement = {
  id: string;  // ❌ Mismatch! Python uses "component_id"
  type: string;
  props: any;
};
```

**Refactoring Checklist**:
- ✅ Use identical keys in Python dicts and TypeScript interfaces
- ✅ Document key names in both files
- ✅ Use `snake_case` for Python, `camelCase` for TypeScript (but matching semantics)
- ✅ Ensure props are JSON-serializable (no functions, no circular refs)
- ✅ Add JSDoc comments to TypeScript types referencing Python file

**Best Practice**: Add cross-references in comments

```typescript
// src/lib/types.ts

/**
 * State contract for WorkbenchAgent.
 * 
 * ⚠️ Must match Python dict structure in agent/main.py
 * 
 * Python:
 *   tool_context.state["elements"] = [
 *     {"id": str, "type": str, "props": dict}
 *   ]
 * 
 * TypeScript:
 *   AgentState.elements: UIElement[]
 */
export type AgentState = {
  elements: UIElement[];
};
```

---

## Component Registry Refactoring

### Pattern 8: Component Prop Validation

**✅ GOOD: Type-Safe Component with Defaults**

```typescript
// src/components/registry/StatCard.tsx
import { z } from "zod";

// Define prop schema
const StatCardPropsSchema = z.object({
  title: z.string(),
  value: z.union([z.string(), z.number()]),
  trend: z.string().optional(),
  trendDirection: z.enum(["up", "down"]).optional(),
});

type StatCardProps = z.infer<typeof StatCardPropsSchema>;

export function StatCard(rawProps: unknown) {
  // Validate props at runtime
  const result = StatCardPropsSchema.safeParse(rawProps);
  
  if (!result.success) {
    console.error("StatCard validation failed:", result.error);
    return (
      <div className="p-4 bg-yellow-50 text-yellow-700 rounded">
        Invalid StatCard props
      </div>
    );
  }
  
  const { title, value, trend, trendDirection } = result.data;
  
  // Provide defaults
  const formattedValue = typeof value === "number" 
    ? value.toLocaleString() 
    : value;
  
  return (
    <div className="stat-card bg-white p-6 rounded-lg shadow">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-3xl font-bold mt-2">{formattedValue}</p>
      {trend && (
        <p className={`text-sm mt-2 ${trendDirection === "up" ? "text-green-600" : "text-red-600"}`}>
          {trend}
        </p>
      )}
    </div>
  );
}
```

**❌ BAD: No Validation**

```typescript
export function StatCard({ title, value, trend, trendDirection }: any) {
  return (
    <div className="stat-card">
      <h3>{title}</h3>
      <p>{value}</p>  {/* Could be undefined, null, object, etc. */}
      <p>{trend}</p>   {/* No check if trend exists */}
    </div>
  );
}
```

**Refactoring Checklist**:
- ✅ Define Zod schema for props
- ✅ Validate props at runtime with `.safeParse()`
- ✅ Render fallback UI for invalid props
- ✅ Log validation errors to console
- ✅ Provide defaults for optional props
- ✅ Type props with `z.infer<typeof Schema>`

---

## Tool Schema Refactoring

### Pattern 9: JSON Schema to Zod (Using schema-crawler.ts)

The `schema-crawler.ts` tool automates converting MCP tool JSON Schemas into Zod validation + TypeScript types.

**What schema-crawler.ts does:**

1. **Generates Zod Schemas** from JSON Schema definitions
2. **Creates TypeScript Interfaces** matching the schema
3. **Produces Runtime Validators** for safe parsing
4. **Handles Complex Types**: objects, arrays, enums, nested structures
5. **Adds Constraints**: min/max length, regex patterns, numeric bounds

**Example Usage:**

```typescript
// Given MCP tool JSON Schema:
const mcpToolSchema = {
  type: "object",
  properties: {
    city: { type: "string", minLength: 2, maxLength: 100 },
    units: { type: "string", enum: ["celsius", "fahrenheit"] },
  },
  required: ["city"],
};

// schema-crawler.ts generates:

/**
 * Auto-generated by schema-crawler.ts
 * MCP Tool: getWeather
 */

import { z } from 'zod';

/* ==================== INPUT ==================== */

export interface getWeatherInput {
  city: string;
  units?: "celsius" | "fahrenheit";
}

export const getWeatherInputSchema = z.object({
  city: z.string().min(2).max(100),
  units: z.enum(["celsius", "fahrenheit"]).optional(),
});

export function validategetWeatherInput(input: unknown): getWeatherInput {
  return getWeatherInputSchema.parse(input);
}

export function validategetWeatherInputSafe(input: unknown): Result<getWeatherInput, ZodError> {
  return getWeatherInputSchema.safeParse(input);
}

/* ==================== TOOL DEFINITION ==================== */

export const getWeatherTool = {
  name: 'getWeather',
  inputSchema: getWeatherInputSchema,
  outputSchema: z.unknown(),
} as const;
```

**Refactoring Workflow**:

1. **Extract JSON Schema** from MCP tool definitions
2. **Run schema-crawler** to generate Zod modules
3. **Import Generated Schemas** in your codebase
4. **Use Validators** before passing data to tools

**Benefits**:
- ✅ Type safety for all MCP tool calls
- ✅ Runtime validation prevents bad data
- ✅ Auto-generated code reduces manual errors
- ✅ Consistent schemas across Python↔TypeScript
- ✅ Supports complex nested types

---

## Testing Refactoring

### Pattern 10: Agent Tool Testing

**✅ GOOD: Isolated Tool Test**

```python
# tests/test_agent_tools.py
import pytest
from agent.main import upsert_ui_element
from unittest.mock import MagicMock

def test_upsert_ui_element_creates_new():
    # Arrange
    mock_context = MagicMock()
    mock_context.state = {"elements": []}
    
    # Act
    result = upsert_ui_element(
        mock_context, 
        id="test_card", 
        type="StatCard", 
        props={"title": "Test", "value": 42}
    )
    
    # Assert
    assert result["status"] == "success"
    assert len(mock_context.state["elements"]) == 1
    assert mock_context.state["elements"][0]["id"] == "test_card"
    assert mock_context.state["elements"][0]["type"] == "StatCard"
    assert mock_context.state["elements"][0]["props"]["value"] == 42

def test_upsert_ui_element_updates_existing():
    # Arrange
    mock_context = MagicMock()
    mock_context.state = {
        "elements": [
            {"id": "card1", "type": "StatCard", "props": {"value": 10}}
        ]
    }
    
    # Act
    result = upsert_ui_element(
        mock_context, 
        id="card1", 
        type="StatCard", 
        props={"value": 20}
    )
    
    # Assert
    assert result["status"] == "success"
    assert len(mock_context.state["elements"]) == 1  # Still 1 element
    assert mock_context.state["elements"][0]["props"]["value"] == 20  # Updated

def test_upsert_ui_element_invalid_type():
    # Arrange
    mock_context = MagicMock()
    mock_context.state = {"elements": []}
    
    # Act
    result = upsert_ui_element(
        mock_context, 
        id="bad", 
        type="InvalidType", 
        props={}
    )
    
    # Assert
    assert result["status"] == "error"
    assert "Unknown type" in result["message"]
```

**Refactoring Checklist**:
- ✅ Test each tool function in isolation
- ✅ Mock `ToolContext` to avoid dependencies
- ✅ Test create, update, and error paths
- ✅ Assert both return values and state mutations
- ✅ Use descriptive test names (test_<function>_<scenario>)
- ✅ Follow Arrange-Act-Assert pattern

---

### Pattern 11: React Component Testing

**✅ GOOD: Component Test with React Testing Library**

```typescript
// src/components/registry/StatCard.test.tsx
import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders with valid props", () => {
    render(
      <StatCard 
        title="Revenue" 
        value={120000} 
        trend="+12%" 
        trendDirection="up" 
      />
    );
    
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("120,000")).toBeInTheDocument();
    expect(screen.getByText("+12%")).toBeInTheDocument();
    expect(screen.getByText("+12%")).toHaveClass("text-green-600");
  });
  
  it("renders fallback for invalid props", () => {
    render(<StatCard title={123} value={null} />);
    expect(screen.getByText("Invalid StatCard props")).toBeInTheDocument();
  });
  
  it("handles missing optional props", () => {
    render(<StatCard title="Users" value={1500} />);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();  // No trend
  });
});
```

**Refactoring Checklist**:
- ✅ Test valid prop combinations
- ✅ Test invalid props (validation failures)
- ✅ Test optional props (present vs absent)
- ✅ Use `screen.getByText` for text assertions
- ✅ Use `screen.queryByText` for absence assertions
- ✅ Test CSS classes for styling logic
- ✅ Use descriptive test names

---

## Performance Optimization

### Pattern 12: Memoization Refactoring

**✅ GOOD: Selective Memoization**

```typescript
// src/app/page.tsx
import { memo, useMemo } from "react";
import { UIElement } from "@/lib/types";

// Memoize expensive component
const MemoizedDataTable = memo(DataTable, (prevProps, nextProps) => {
  // Custom equality check for large data arrays
  return (
    prevProps.columns === nextProps.columns &&
    prevProps.data.length === nextProps.data.length &&
    prevProps.data[0]?.id === nextProps.data[0]?.id
  );
});

function YourMainContent() {
  const { state } = useCoAgent<AgentState>({ name: "WorkbenchAgent" });
  
  // Memoize filtered elements (avoid recalculating on every render)
  const visibleElements = useMemo(() => {
    return state.elements.filter((el) => el.props.visible !== false);
  }, [state.elements]);
  
  return (
    <div>
      {visibleElements.map((el) => (
        el.type === "DataTable" ? (
          <MemoizedDataTable key={el.id} {...el.props} />
        ) : (
          <ElementRenderer key={el.id} element={el} />
        )
      ))}
    </div>
  );
}
```

**❌ BAD: Premature Optimization**

```typescript
// Memoizing everything (unnecessary overhead)
const MemoizedStatCard = memo(StatCard);
const MemoizedDataTable = memo(DataTable);
const MemoizedChartCard = memo(ChartCard);

// Memoizing cheap computations
const count = useMemo(() => state.elements.length, [state.elements]);  // Overkill
```

**Refactoring Checklist**:
- ✅ Only memoize expensive components (large lists, heavy renders)
- ✅ Use custom equality checks for complex props
- ✅ Avoid memoizing cheap computations
- ✅ Profile first with React DevTools before optimizing
- ✅ Memoize callbacks passed to child components with `useCallback`

---

## Security Hardening

### Pattern 13: Input Sanitization

**✅ GOOD: Sanitized User Input**

```python
# agent/main.py
import re
from html import escape

def sanitize_id(raw_id: str) -> str:
    """Sanitize element ID to prevent injection attacks."""
    # Allow only alphanumeric, underscore, hyphen
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '', raw_id)
    if not sanitized:
        raise ValueError("Invalid ID after sanitization")
    return sanitized

def sanitize_props(props: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively sanitize string values in props."""
    sanitized = {}
    for key, value in props.items():
        if isinstance(value, str):
            # Escape HTML to prevent XSS
            sanitized[key] = escape(value)
        elif isinstance(value, dict):
            sanitized[key] = sanitize_props(value)
        elif isinstance(value, list):
            sanitized[key] = [escape(v) if isinstance(v, str) else v for v in value]
        else:
            sanitized[key] = value
    return sanitized

def upsert_ui_element(
    tool_context: ToolContext, 
    id: str, 
    type: str, 
    props: Dict[str, Any]
) -> Dict[str, str]:
    # Sanitize inputs
    id = sanitize_id(id)
    props = sanitize_props(props)
    
    # Validate type against whitelist
    if type not in ALLOWED_TYPES:
        return {"status": "error", "message": f"Type '{type}' not allowed"}
    
    # ... rest of function
```

**❌ BAD: No Sanitization**

```python
def upsert_ui_element(tool_context, id, type, props):
    # Directly using user input (XSS vulnerability)
    tool_context.state["elements"].append({
        "id": id,  # Could be malicious
        "type": type,  # Could execute arbitrary components
        "props": props  # Could contain <script> tags
    })
```

**Refactoring Checklist**:
- ✅ Sanitize all string inputs with regex/escape
- ✅ Whitelist allowed component types
- ✅ Validate IDs against safe character sets
- ✅ Escape HTML in props to prevent XSS
- ✅ Recursively sanitize nested objects/arrays
- ✅ Log sanitization events for security audits

---

## Common Anti-Patterns

### ❌ Anti-Pattern 1: Bidirectional State Sync

**Problem**: Trying to write to agent state from React

```typescript
// ❌ DON'T DO THIS
const { state, setState } = useCoAgent<AgentState>({ name: "WorkbenchAgent" });

function handleDelete(id: string) {
  setState((prev) => ({
    elements: prev.elements.filter((el) => el.id !== id),
  }));
}
```

**Solution**: Use agent tools via CopilotKit actions

```typescript
// ✅ CORRECT: Use agent tools
import { useCopilotAction } from "@copilotkit/react-core";

useCopilotAction({
  name: "removeElement",
  parameters: [{ name: "id", type: "string" }],
  handler: async ({ id }) => {
    // Agent will handle removal via remove_ui_element tool
    return `Removed element ${id}`;
  },
});
```

---

### ❌ Anti-Pattern 2: Missing Key Props

**Problem**: Not using unique keys in lists

```typescript
// ❌ Missing keys (React warnings, broken updates)
{elements.map((el) => <StatCard {...el.props} />)}
```

**Solution**: Always use element ID as key

```typescript
// ✅ Unique keys
{elements.map((el) => <StatCard key={el.id} {...el.props} />)}
```

---

### ❌ Anti-Pattern 3: Async Tool Functions Without Await

**Problem**: Not awaiting async operations in tools

```python
# ❌ Missing await (operation won't complete)
def my_tool(tool_context: ToolContext):
    result = fetch_data()  # Async function
    return {"data": result}  # Returns coroutine, not data
```

**Solution**: Declare tool as async and await

```python
# ✅ Proper async handling
async def my_tool(tool_context: ToolContext):
    result = await fetch_data()
    return {"data": result}
```

---

## Additional Resources

- **MCP Collections Loaded**:
  - `frontend-web-dev` - React 19, Next.js, TypeScript patterns
  - `python-mcp-development` - FastMCP server patterns, official SDK
  - `testing-automation` - TDD agents (Red, Green, Refactor), Playwright
  - `software-engineering-team` - Security reviewer, GitOps specialist

- **Instructions Applied**:
  - `reactjs.instructions.md` - React 19+ standards
  - `nextjs.instructions.md` - App Router best practices (2025)
  - `python-mcp-server.instructions.md` - FastMCP patterns

- **Related Documentation**:
  - [.github/copilot-instructions.md](../.github/copilot-instructions.md) - AI agent guide
  - [Project_Overview.md](../Project_Overview.md) - GenUI architecture
  - [TOOLSET_MANAGEMENT.md](./TOOLSET_MANAGEMENT.md) - Toolset lifecycle
  - [docs/toolsets/](./toolsets/) - Individual toolset docs

---

**Last Updated**: January 2, 2026  
**Maintained by**: ModMe GenUI Team  
**Tech Stack**: Python 3.12+, TypeScript 5, React 19, Next.js 16, CopilotKit 1.50.0

