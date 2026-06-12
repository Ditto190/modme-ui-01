# Agent Server

Python FastAPI + AG2 (AutoGen) backend for the Generative UI system.

## Features

- **WebSocket Server**: Real-time communication with frontend clients
- **AG2 GroupChat**: Multi-agent conversation system using AutoGen
- **State Streaming**: Broadcasts agent state updates to all connected clients
- **Type-Safe**: Uses Pydantic models that mirror the Zod schemas

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Poetry (Python package manager) **OR** pip + venv

### Installation

**Option A: Using Poetry (recommended):**

1. Install dependencies:
   ```bash
   poetry install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and add your OpenAI API key:
   ```bash
   OPENAI_API_KEY=your_actual_api_key_here
   ```

**Option B: Using pip + venv:**

1. Create virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your OpenAI API key:
   ```bash
   OPENAI_API_KEY=your_actual_api_key_here
   ```

### Running the Server

**Using Poetry:**

Development mode with auto-reload:
```bash
poetry run python -m src.main
```

Or using uvicorn directly:
```bash
poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

**Using pip + venv:**

Development mode with auto-reload:
```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m src.main
```

Or using uvicorn directly:
```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

The server will be available at:
- API: http://localhost:8000
- WebSocket: ws://localhost:8000/ws/agent
- API Docs: http://localhost:8000/docs

## Architecture

### Components

- **main.py**: FastAPI application setup and configuration
- **routes/websocket.py**: WebSocket endpoint for real-time communication
- **agents/groupchat.py**: AG2 GroupChat implementation
- **models/schemas.py**: Pydantic models (mirroring Zod schemas)

### WebSocket Protocol

The WebSocket endpoint accepts and sends JSON messages with the following structure:

```json
{
  "type": "state_update" | "action" | "error" | "ping" | "pong",
  "payload": {},
  "timestamp": 1234567890.123
}
```

### Message Types

- **ping/pong**: Keep-alive mechanism
- **action**: Client sends action to process
- **state_update**: Server broadcasts updated agent state
- **error**: Error messages

## Development

### Code Quality

Run linters:
```bash
poetry run black src/
poetry run flake8 src/
poetry run mypy src/
```

### Testing

Run tests:
```bash
poetry run pytest
```

## Environment Variables

- `PORT`: Server port (default: 8000)
- `HOST`: Server host (default: 0.0.0.0)
- `CORS_ORIGINS`: Allowed CORS origins (comma-separated)
- `OPENAI_API_KEY`: OpenAI API key for AG2/AutoGen
- `OPENAI_MODEL`: OpenAI model to use (default: gpt-4)

## Notes

- If AG2/AutoGen is not installed or API keys are not configured, the server will run in mock mode with simulated responses
- The GroupChat implementation can be extended with custom agents and behaviors
