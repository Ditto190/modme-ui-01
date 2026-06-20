# @generative-ui/shared-schemas

Shared Zod schemas for type-safe contracts between the Next.js frontend and Python FastAPI backend.

## Schemas

### AgentAction
Represents an action taken by an AI agent that should be reflected in the UI state.

### AgentState
Represents the current state of the AI agent system.

### WebSocketMessage
Schema for WebSocket messages used for real-time communication.

## Usage

```typescript
import { AgentActionSchema, type AgentAction } from '@generative-ui/shared-schemas';

// Validate data
const action = AgentActionSchema.parse(data);
```
