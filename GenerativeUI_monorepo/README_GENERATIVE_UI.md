# Generative UI Monorepo

A Turborepo-powered monorepo for building AI-driven generative UI applications with Next.js and Python.

## Project Structure

```
├── apps/
│   ├── web-dashboard/         # Next.js 14 + CopilotKit frontend
│   └── agent-server/          # Python FastAPI + AG2 (AutoGen) backend
├── packages/
│   ├── shared-schemas/        # Shared Zod/Pydantic schemas
│   └── ...                    # Other existing packages
└── turbo.json                 # Turborepo configuration
```

## Features

### Frontend (apps/web-dashboard)
- **Next.js 14** with App Router
- **CopilotKit** integration for AI-powered chat interface
- **GenerativeCanvas** component that renders UI based on AI agent state
- **WebSocket** connection for real-time updates
- **Type-safe** communication using shared Zod schemas

### Backend (apps/agent-server)
- **FastAPI** web server with WebSocket support
- **AG2 (AutoGen)** for multi-agent conversations
- **GroupChat** implementation for agent orchestration
- **State streaming** to connected clients
- **Pydantic models** mirroring frontend Zod schemas

### Shared Schemas (packages/shared-schemas)
- **Zod schemas** for TypeScript type safety
- **Pydantic models** for Python validation
- **AgentAction** schema for UI state updates
- **AgentState** schema for system state
- **WebSocketMessage** schema for real-time communication

## Getting Started

### Prerequisites

- Node.js 18+ (for frontend)
- Python 3.10+ (for backend)
- Poetry (Python package manager) **OR** pip + venv
- Yarn 3.3+ (already configured via Yarn Berry)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd GenerativeUI_monorepo
   ```

2. **Install Node dependencies:**
   ```bash
   yarn install
   ```

3. **Build shared packages:**
   ```bash
   yarn build
   ```

4. **Install LeanCTX for AI-assisted development (optional but recommended):**
   ```bash
   npm install -g lean-ctx-bin
   lean-ctx setup --project
   lean-ctx init --agent vscode
   lean-ctx init --agent cursor
   lean-ctx doctor
   ```

5. **Setup backend (Python):**
   
   **Option A: Using Poetry (recommended):**
   ```bash
   cd apps/agent-server
   poetry install
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```
   
   **Option B: Using pip + venv:**
   ```bash
   cd apps/agent-server
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

### Development

**Start all services with Turborepo:**
```bash
yarn dev
```

This will start:
- Frontend at http://localhost:3000
- Backend at http://localhost:8000

**Or start services individually:**

Frontend:
```bash
cd apps/web-dashboard
yarn dev
```

Backend:
```bash
cd apps/agent-server

# If using Poetry:
poetry run python -m src.main

# If using pip + venv:
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m src.main
```

### Building

Build all packages:
```bash
yarn build
```

Build specific package:
```bash
yarn workspace @generative-ui/web-dashboard build
yarn workspace @generative-ui/shared-schemas build
```

### Linting

```bash
yarn lint
```

## Architecture

### Communication Flow

1. **Frontend** connects to backend via WebSocket (`ws://localhost:8000/ws/agent`)
2. **User** interacts with CopilotKit chat interface
3. **Backend** processes messages through AG2 GroupChat
4. **Agents** generate actions (create/update/render UI components)
5. **Backend** streams state updates via WebSocket
6. **Frontend** receives updates and renders UI components dynamically

### Type Safety

The monorepo uses shared schemas to ensure type safety across the stack:

**TypeScript (Frontend & Shared):**
```typescript
import { AgentActionSchema, type AgentAction } from '@generative-ui/shared-schemas';

const action = AgentActionSchema.parse(data);
```

**Python (Backend):**
```python
from src.models.schemas import AgentAction

action = AgentAction(**data)
```

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_AGENT_SERVER_WS_URL=ws://localhost:8000/ws/agent
```

### Backend (.env)
```bash
PORT=8000
CORS_ORIGINS=http://localhost:3000
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4
```

## Components

### GenerativeCanvas
A React component that renders UI dynamically based on AI agent actions. Supports:
- Text components
- Card components
- List components
- Custom components (extensible)

### AgentGroupChat
Python class managing AG2 multi-agent conversations. Features:
- Configurable agents
- Message processing
- State management
- Action generation

## Tech Stack

- **Frontend:** Next.js 14, React 18, CopilotKit, TypeScript
- **Backend:** FastAPI, AG2 (AutoGen), Python 3.10+
- **Monorepo:** Turborepo, Yarn Workspaces
- **Validation:** Zod (TypeScript), Pydantic (Python)
- **Communication:** WebSockets

## Scripts

- `yarn dev` - Start all apps in development mode
- `yarn build` - Build all packages and apps
- `yarn lint` - Lint all packages
- `yarn workspace <name> <command>` - Run command in specific workspace

## Contributing

1. Create a new branch
2. Make your changes
3. Run linting and tests
4. Submit a pull request

## License

MIT

## Documentation

- [Web Dashboard README](./apps/web-dashboard/README.md)
- [Agent Server README](./apps/agent-server/README.md)
- [Shared Schemas README](./packages/shared-schemas/README.md)
