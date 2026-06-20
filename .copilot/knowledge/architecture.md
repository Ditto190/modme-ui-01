# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User's Browser                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Next.js Frontend (localhost:3000)             │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │  │
│  │  │   Canvas    │  │  Components  │  │  CopilotKit │  │  │
│  │  │   (GenUI)   │  │   Registry   │  │     SDK     │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  │  │
│  │         │                 │                  │         │  │
│  │         └─────────────────┴──────────────────┘         │  │
│  │                           │                            │  │
│  └───────────────────────────┼────────────────────────────┘  │
└────────────────────────────────┼──────────────────────────────┘
                                 │ HTTP/WebSocket
                                 │
                    ┌────────────▼──────────────┐
                    │  Python ADK Agent         │
                    │  (localhost:8000)         │
                    │  ┌─────────────────────┐  │
                    │  │   FastAPI Server    │  │
                    │  └──────────┬──────────┘  │
                    │  ┌──────────▼──────────┐  │
                    │  │   Google ADK        │  │
                    │  │   (Gemini AI)       │  │
                    │  └──────────┬──────────┘  │
                    │  ┌──────────▼──────────┐  │
                    │  │   Agent Tools       │  │
                    │  └─────────────────────┘  │
                    └───────────────────────────┘
                                 │
                    ┌────────────▼──────────────┐
                    │    Local Data Store       │
                    │       (data/)             │
                    └───────────────────────────┘
```

## Component Layers

### 1. Presentation Layer (Next.js)

- **Location**: `src/`
- **Responsibility**: UI rendering, user interaction, state display
- **Technologies**: React 19, Next.js 16, Tailwind CSS 4
- **Key Files**:
  - `src/app/canvas/`: Main GenUI interface
  - `src/components/registry/`: Reusable UI components
  - `src/lib/types.ts`: TypeScript definitions

### 2. Orchestration Layer (CopilotKit)

- **Responsibility**: State synchronization, agent communication
- **Key Hooks**:
  - `useCoAgent`: Syncs state with Python backend
  - `useCopilotAction`: Defines frontend actions
  - `useCopilotReadable`: Exposes context to agent

### 3. Agent Layer (Python ADK)

- **Location**: `agent/`
- **Responsibility**: AI reasoning, tool execution, state management
- **Technologies**: Google ADK, FastAPI, Gemini AI
- **Key Files**:
  - `agent/main.py`: Agent definition and tools
  - `agent/pyproject.toml`: Python dependencies

### 4. Data Layer

- **Location**: `data/`
- **Responsibility**: Local-first data storage
- **Privacy**: Git-ignored, never synced to cloud

## Data Flow

### Request Flow

1. User interacts with UI (Canvas)
2. Action sent to CopilotKit
3. CopilotKit forwards to Python ADK Agent
4. Agent processes with Gemini AI
5. Agent executes tools, updates state
6. State synced back to frontend via WebSocket
7. UI re-renders with new state

### State Synchronization

- **Frontend State**: React hooks (useState, useCoAgent)
- **Backend State**: `callback_context.state` (Python dict)
- **Sync Mechanism**: WebSocket (CopilotKit bridge)
- **Persistence**: Session-based (in-memory)

## GenUI Rendering Pipeline

### Static GenUI

1. Agent selects component from registry
2. Returns component name + props
3. Frontend looks up component
4. Renders with provided props

### Declarative GenUI

1. Agent generates JSON schema
2. Schema sent to DashboardRenderer
3. Renderer creates layout dynamically
4. Components instantiated from schema

### Open-Ended GenUI

1. Agent generates HTML/JS/CSS
2. Code sent to SandboxedHTML component
3. Rendered in isolated iframe
4. Security constraints enforced

## Security Boundaries

1. **Agent Sandboxing**: Agent cannot access filesystem outside `data/`
2. **HTML Sandboxing**: User-generated HTML runs in sandboxed iframe
3. **API Key Protection**: Keys stored in `.env`, never exposed to client
4. **CORS Protection**: Agent API only accessible from localhost

## Performance Considerations

- **Lazy Loading**: Components loaded on-demand
- **State Minimization**: Only essential data in sync state
- **Caching**: Agent responses cached when appropriate
- **Connection Pooling**: WebSocket keeps connection alive

## Extension Points

1. **New Components**: Add to `src/components/registry/`
2. **New Tools**: Add to `agent/main.py` tools list
3. **New Prompts**: Update `src/prompts/copilot/`
4. **MCP Servers**: Configure in `.copilot/mcp-servers/`
