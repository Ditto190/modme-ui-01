Perfect! Now I have a complete picture. Let me create a comprehensive flow map.

## Universal Chat Ingestion Pipeline — Complete End-to-End Flow Map

Show less

### 1. ENTRY POINTS

**A. n8n Webhook (Primary Production Entry)**

- **File**: `agent/observability/n8n_workflow_universal_ingestion.json`
- **Webhook URL**: `http://localhost:5678/webhook/universal-chat-ingest`
- **Method**: POST
- **Expected Body**:

  ```json
  {
    "projectName": "chat-traces", // optional
    "sourceLabel": "filename.json", // optional
    "chatData": {
      /* raw chat JSON */
    }
  }
  ```

- **n8n Docker Port**: 5678 (mapped in `docker-compose.n8n.yml`)
  **B. CLI Test Pipeline (Development)**
- **File**: `agent-generator/src/chat-formats/test-pipeline.ts`
- **Command**: `npx tsx src/chat-formats/test-pipeline.ts [path/to/chat.json]`
- **Default Path**: `datasets/chat.json`
- **Purpose**: End-to-end testing of detection + normalization without n8n
  **C. Direct Bridge Upload (Legacy Compatibility)**
- **Endpoint**: `http://localhost:8787/upload` (Copilot-specific)
- **Endpoint**: `http://localhost:8787/upload-file` (Multipart file upload)

---

### 2. TYPESCRIPT NORMALIZATION LAYER

**Location**: `agent-generator/src/chat-formats/`

#### **A. Format Detection (Fingerprinting)**

**File**: `agent-generator/src/chat-formats/fingerprint.ts`
**Key Functions**:

- `detectFormat(data, registry)` — Main entry point, returns `DetectionResult`
- `matchFormat(data, descriptor)` — Tests one format's fingerprint rules
- `evaluateRule(data, rule)` — Tests a single fingerprint rule
- `getByPath(obj, path)` — Path resolver (supports dot notation + array indices)
  **Fingerprint Logic**:

```typescript
// For each format descriptor (sorted by priority):
//   1. Run all fingerprint rules (path + check type)
//   2. ALL rules must pass for exact match
//   3. Return first exact match
//   4. Track best partial match for diagnostics
```

**Copilot Chat Fingerprint** (from `formats/copilot-chat.ts`):

```typescript
[
  { path: "responderUsername", check: "type_string" },
  { path: "requests", check: "type_array" },
  { path: "requests[0].message", check: "type_object" },
  { path: "requests[0].variableData", check: "type_object" },
];
```

#### **B. Registry**

**File**: `agent-generator/src/chat-formats/registry.ts`
**API Functions**:

- `initializeRegistry()` — Registers all custom extractors (MUST call first)
- `detect(data)` — Wrapper for `detectFormat()`
- `ingest(data, projectName, sourceLabel)` — Detect + normalize + discovery
- `diagnose(data)` — Generate diagnostic report for failed detection
- `listFormats()` — List registered formats
  **Current Formats**:
- `copilot-chat` (VS Code Copilot Chat) — priority 100, status: stable

#### **C. Normalization**

**File**: `agent-generator/src/chat-formats/normalizer.ts`
**Key Functions**:

- `normalize(data, descriptor, projectName)` — Main transformation
- `registerResponseAssembler(formatId, fn)` — Register custom response builder
- `registerThinkingExtractor(formatId, fn)` — Register CoT extractor
- `registerToolCallExtractor(formatId, fn)` — Register tool call parser
  **Process**:

```typescript
1. Extract turns array using descriptor.fieldMapping.turns path
2. For each turn:
   - Extract user message (required, skip if empty)
   - Extract assistant response:
     * If requiresResponseAssembly: use custom assembler
     * Else: direct path lookup
   - Extract tool calls:
     * If custom extractor registered: use it
     * Else: generic extraction from fieldMapping paths
   - Extract thinking/CoT (if extractor registered)
   - Extract tokens, model, timestamps
3. Build UniversalTurn objects
4. Validate with Zod schema
5. Return UniversalTurnPayload
```

**Copilot-Specific Extractors** (`formats/copilot-chat.ts`):

- `assembleCopilotResponse()` — Filters response[] array by kind, concatenates text
- `extractCopilotThinking()` — Pulls kind='thinking' blocks
- `extractCopilotToolCalls()` — Navigates toolCallRounds[] structure
- `extractRichTextNode()` — Recursively extracts text from {node: {children: []}} structure

#### **D. Discovery (Unknown Format Handling)**

**File**: `agent-generator/src/chat-formats/discovery.ts`
**Key Functions**:

- `generateDiscoverySample(data, diagnosticText, sourceLabel)` — Creates structural sample
- `findCandidateTurnsPath(data)` — Heuristically finds "turns" array
- `mapDeepKeys(obj, prefix, maxDepth)` — Recursively maps all paths
  **Process**:

```typescript
1. Generate top-level schema (key → type description)
2. Find candidate turns array:
   - Look for arrays with objects
   - Score by chat-related field names (message, content, role, etc.)
   - Prefer arrays named messages/requests/turns/conversation
3. Deep-sample first turn
4. Map all nested paths (up to depth 5)
5. Compute content hash for deduplication
6. Generate suggested filename: unknown-{sourceLabel}-{timestamp}-{hash}.json
7. Save to datasets/unknown-formats/
```

#### **E. Types**

**File**: `agent-generator/src/chat-formats/types.ts`
**Critical Types**:

```typescript
UniversalTurnPayload {
  format: string           // "copilot-chat"
  agent: string            // "GitHub Copilot"
  projectName: string      // Phoenix project
  sessionId?: string
  responder?: string
  turns: UniversalTurn[]
}
UniversalTurn {
  index: number
  userMessage: string
  assistantResponse: string
  model: string
  timestampMs?: number
  latencyMs?: number
  tokens?: { prompt, completion, total }
  toolCalls: ToolCall[]
  thinking?: string
  metadata: Record<string, unknown>
}
ToolCall {
  name: string
  input?: string
  output?: string
  round?: number
}
```

---

### 3. N8N WORKFLOW (UNIVERSAL INGESTION)

**File**: `agent/observability/n8n_workflow_universal_ingestion.json`
**Node Flow**:

```
1. Receive Chat JSON (webhook)
   ↓
2. Detect Agent Format (Code node)
   - Mirrors fingerprint.ts logic in JavaScript
   - Inline registry with Copilot fingerprint
   - Returns: { detected: true/false, formatId, chatData, projectName }
   ↓
3. Check Detection (IF node)
   - condition: detected === true
   ↓
4a. [SUCCESS PATH] Normalize Turns (Code node)
    - Mirrors normalizer.ts + copilot-chat.ts
    - Inline implementation of assembleCopilotResponse, extractCopilotToolCalls, etc.
    - Returns: { payload: UniversalTurnPayload, stats }
    ↓
5a. Send to Bridge (HTTP Request)
    - POST http://host.docker.internal:8787/ingest
    - Body: payload (UniversalTurnPayload as JSON)
    ↓
6a. Success Response (Respond to Webhook)
    - Returns bridge response

4b. [FAILURE PATH] Generate Discovery Sample (Code node)
    - Mirrors discovery.ts logic
    - Generates structural sample
    - Returns: { sampled: true, sample, suggestedFilename }
    ↓
5b. Error Response (Respond to Webhook)
    - Status: 422
    - Body: { status: 'unknown_format', discovery: {...} }
```

**Key Details**:

- All TypeScript logic is **mirrored as inline JavaScript** in Code nodes
- No external modules required (self-contained workflow)
- Uses `host.docker.internal:8787` to reach bridge from Docker

---

### 4. PYTHON BRIDGE

**File**: `agent/observability/trace_bridge_api.py`
**Port**: 8787 (configurable via `BRIDGE_PORT` env var)
**Endpoints**:

#### `POST /ingest` (Universal Format — Primary)

- **Input**: `UniversalTurnPayload` (Pydantic validated)
- **Process**:
  1. Validate payload against Pydantic model
  2. Initialize OTLP tracer with project name
  3. For each turn: call `_upload_universal_turn()`
  4. Flush spans to Phoenix
  5. Return stats
- **Function**: `upload_universal_turns()` → `_upload_universal_turn()`

#### `POST /upload` (Legacy Copilot Format)

- **Input**: Raw Copilot chat.json OR wrapped `{chatData: {...}}`
- **Function**: `upload_chat_data()`

#### `POST /upload-file` (Multipart File Upload)

- **Input**: Multipart form with file field
- **Function**: Reads file → `upload_chat_data()`

#### `GET /health`

- Returns `{"status": "ok"}`

#### `GET /formats`

- Lists supported formats (documentation endpoint)
  **Span Creation** (`_upload_universal_turn()`):

```python
AGENT span (root)
├─ openinference.span.kind = "AGENT"
├─ input.value = userMessage
├─ output.value = assistantResponse
├─ session.id, metadata.*, etc.
│
└─ LLM span (child)
   ├─ openinference.span.kind = "LLM"
   ├─ llm.model_name = model
   ├─ llm.token_count.* = tokens
   ├─ llm.input_messages / llm.output_messages
   │
   └─ TOOL span × N (children)
      ├─ openinference.span.kind = "TOOL"
      ├─ tool.name = toolCall.name
      ├─ input.value = toolCall.input
      └─ output.value = toolCall.output
```

**Dependencies**:

- `opentelemetry.exporter.otlp.proto.http.trace_exporter.OTLPSpanExporter` — Handles Protobuf serialization
- `openinference.semconv` — OpenInference semantic conventions
- `FastAPI` + `Pydantic` — HTTP server + validation

---

### 5. PHOENIX

**Docker Compose**: `docker-compose.phoenix.yml`
**Ports**:

- **6006**: Phoenix UI + HTTP OTLP endpoint
- **4317**: gRPC OTLP endpoint
  **OTLP Endpoint**:
- **URL**: `http://localhost:6006/v1/traces`
- **Protocol**: HTTP + Protobuf (NOT JSON)
- **Note**: Python `OTLPSpanExporter` handles Protobuf serialization automatically
  **Environment**:

```yaml
PHOENIX_PORT: 6006
PHOENIX_GRPC_PORT: 4317
PHOENIX_SQL_DATABASE_URL: sqlite:////data/phoenix.db
```

---

### 6. INFRASTRUCTURE & PORTS

**Docker Compose Files**:

- `docker-compose.n8n.yml` — n8n server + n8n-mcp
- `docker-compose.phoenix.yml` — Phoenix server
  **Port Map**:

  | Service           | Port | URL                                                   | Purpose                      |
  | ----------------- | ---- | ----------------------------------------------------- | ---------------------------- |
  | n8n               | 5678 | <http://localhost:5678>                               | n8n UI + webhooks            |
  | n8n webhook       | 5678 | <http://localhost:5678/webhook/universal-chat-ingest> | Chat ingestion               |
  | n8n-mcp           | 3000 | <http://localhost:3000>                               | MCP server (connects to n8n) |
  | Trace Bridge      | 8787 | <http://localhost:8787>                               | JSON → Protobuf bridge       |
  | Phoenix UI        | 6006 | <http://localhost:6006>                               | Phoenix web interface        |
  | Phoenix OTLP HTTP | 6006 | <http://localhost:6006/v1/traces>                     | OTLP receiver (Protobuf)     |
  | Phoenix OTLP gRPC | 4317 | grpc://localhost:4317                                 | Alternative OTLP endpoint    |

  **Docker Networking**:

- n8n → Bridge: `http://host.docker.internal:8787`
- Bridge → Phoenix: `http://localhost:6006/v1/traces` (if bridge is on host)
- Bridge → Phoenix: `http://host.docker.internal:6006/v1/traces` (if bridge is in Docker)

---

### 7. ENVIRONMENT CONFIGURATION

**Key Environment Variables**:

```bash
# Bridge (trace_bridge_api.py)
BRIDGE_PORT=8787
# Phoenix endpoints
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_PROJECT_NAME=chat-traces
# n8n
N8N_API_KEY=...  # JWT token
N8N_BLOCK_ENV_ACCESS_IN_NODE=false  # Allow Code nodes to access $env
# n8n inside Docker
PHOENIX_URL=http://host.docker.internal:6006
PHOENIX_COLLECTOR_ENDPOINT=http://host.docker.internal:6006/v1/traces
```

---

### 8. DATA FLOW EXAMPLES

#### **Example 1: Copilot Chat Upload via n8n**

```
1. User posts to webhook:
   curl -X POST http://localhost:5678/webhook/universal-chat-ingest \
     -H "Content-Type: application/json" \
     -d '{"chatData": <copilot-chat.json>, "projectName": "my-project"}'
2. n8n "Detect Agent Format" runs fingerprint:
   - Checks responderUsername, requests[], message, variableData
   - Match found: formatId = "copilot-chat"
3. n8n "Normalize Turns" extracts:
   - 5 turns from requests[] array
   - Tool calls from toolCallRounds[]
   - Thinking blocks from response[kind='thinking']
   - Assembles response[] into text
   - Produces UniversalTurnPayload
4. n8n "Send to Bridge" POSTs to:
   http://host.docker.internal:8787/ingest

5. Bridge validates payload with Pydantic
6. Bridge creates OTLP spans:
   - 5 AGENT spans (one per turn)
   - 5 LLM spans (nested)
   - 12 TOOL spans (from tool calls)
7. Bridge POSTs Protobuf to:
   http://localhost:6006/v1/traces
8. Phoenix ingests traces, stores in phoenix.db
9. User views in Phoenix UI:
   http://localhost:6006
```

#### **Example 2: Unknown Format Discovery**

```
1. User posts unknown agent format to webhook
2. n8n "Detect Agent Format" runs:
   - No fingerprint match
   - Returns: { detected: false, confidence: 'partial' }
3. n8n "Generate Discovery Sample" runs:
   - Analyzes top-level structure
   - Finds candidate turns array (e.g., "messages")
   - Deep-samples first turn
   - Maps all nested paths
   - Generates: unknown-my-agent-2026-02-08-a3f9e2.json
4. n8n "Error Response" returns 422:
   {
     "status": "unknown_format",
     "discovery": {
       "sampled": true,
       "suggestedFilename": "...",
       "sample": { /* structural analysis */ }
     }
   }
5. Developer saves sample to datasets/unknown-formats/
6. AI analyzes sample offline, generates new ChatFormatDescriptor
7. Developer adds descriptor to registry.ts + formats/my-agent.ts
8. Next upload auto-detects new format
```

---

### 9. KEY FILES REFERENCE

| File                                                        | Purpose                          |
| ----------------------------------------------------------- | -------------------------------- |
| **TypeScript**                                              |                                  |
| `agent-generator/src/chat-formats/index.ts`                 | Public API exports               |
| `agent-generator/src/chat-formats/registry.ts`              | Format registry + high-level API |
| `agent-generator/src/chat-formats/fingerprint.ts`           | Detection engine                 |
| `agent-generator/src/chat-formats/normalizer.ts`            | Extraction engine                |
| `agent-generator/src/chat-formats/discovery.ts`             | Unknown format sampling          |
| `agent-generator/src/chat-formats/types.ts`                 | Type definitions + Zod schemas   |
| `agent-generator/src/chat-formats/formats/copilot-chat.ts`  | Copilot descriptor + extractors  |
| `agent-generator/src/chat-formats/test-pipeline.ts`         | CLI test harness                 |
| **Python**                                                  |                                  |
| `agent/observability/trace_bridge_api.py`                   | FastAPI bridge server            |
| `agent/observability/upload_chat_traces.py`                 | CLI uploader (Copilot-specific)  |
| `agent/observability/models.py`                             | Pydantic models                  |
| **n8n**                                                     |                                  |
| `agent/observability/n8n_workflow_universal_ingestion.json` | Universal pipeline workflow      |
| `agent/observability/n8n_workflow_chat_to_phoenix.json`     | Legacy Copilot workflow          |
| **Docker**                                                  |                                  |
| `docker-compose.n8n.yml`                                    | n8n + n8n-mcp services           |
| `docker-compose.phoenix.yml`                                | Phoenix server                   |
| **Config**                                                  |                                  |
| `.env.example`                                              | Environment variable template    |

---

### 10. TESTING & VERIFICATION

**Test Pipeline (Local)**:

```bash
# 1. Test detection + normalization
npx tsx agent-generator/src/chat-formats/test-pipeline.ts datasets/chat.json
# 2. Start bridge
python -m agent.observability.trace_bridge_api
# 3. Test bridge directly
curl -X POST http://localhost:8787/ingest \
  -H "Content-Type: application/json" \
  -d @normalized-payload.json
# 4. Start Phoenix
docker-compose -f docker-compose.phoenix.yml up -d
# 5. View traces
open http://localhost:6006
```

**n8n Workflow Test**:

```bash
# 1. Start services
docker-compose -f docker-compose.n8n.yml up -d
docker-compose -f docker-compose.phoenix.yml up -d
python -m agent.observability.trace_bridge_api
# 2. Trigger webhook
curl -X POST http://localhost:5678/webhook/universal-chat-ingest \
  -H "Content-Type: application/json" \
  -d '{"chatData": {...}, "projectName": "test"}'
# 3. Check n8n executions
open http://localhost:5678
# 4. Check Phoenix traces
open http://localhost:6006
```

---

This is the complete end-to-end map of the Universal Chat Ingestion Pipeline. The system is designed for extensibility: AI analyzes unknown chat formats offline, generates new descriptors, and the pipeline automatically handles new formats with zero runtime LLM calls.
agentId: a17fcd3 (for resuming to continue this agent's work if needed)
<usage>total_tokens: 125403
tool_uses: 21
duration_ms: 212304</usage>
Task
Find n8n workflow and docker configs
Perfect! Now I have a complete picture. Let me compile the comprehensive report.

## Search Results: n8n Workflow Pipeline & Observability Infrastructure

Show less

### 1. n8n Workflow JSON Files

**Location: `agent/observability/`**

1. **`agent/observability/n8n_workflow_chat_to_phoenix.json`**
   - Legacy workflow (simpler, Copilot-specific)
   - Webhook path: `/copilot-chat-upload`
   - Bridge endpoint: `http://host.docker.internal:8787/upload`
   - Flow: Webhook → Prepare Payload → Send to Bridge → Respond
2. **`agent/observability/n8n_workflow_universal_ingestion.json`**
   - Universal workflow (format-agnostic, production-ready)
   - Workflow ID: `dfHBSbrEHbUi4H8B`
   - Webhook path: `/universal-chat-ingest`
   - Bridge endpoint: `http://host.docker.internal:8787/ingest`
   - Features: Format detection, normalization, discovery sampling for unknown formats
   - Supports: VS Code Copilot Chat (extensible registry)
   - Flow: Webhook → Detect Format → Check → Normalize → Bridge → Success OR Discovery Sample → Error
3. **`docs/n8n-message-ingestion-workflow.json`**
   - AI message ingestion workflow (different purpose)
   - Webhook path: `/ingest-messages`
   - Python agent endpoint: `http://localhost:8000/mcp/call`
   - For multi-provider AI responses

---

### 2. Docker Compose Files

**`docker-compose.n8n.yml`**

- **n8n service:**
  - Port: `5678` (UI + webhooks)
  - Container: `n8n-local`
  - Network: `n8n_network`
  - Credentials: `admin` / `admin123`
  - Environment:
    - `PHOENIX_URL=${N8N_PHOENIX_URL:-http://host.docker.internal:6006}`
    - `PHOENIX_COLLECTOR_ENDPOINT=${N8N_PHOENIX_COLLECTOR_ENDPOINT:-http://host.docker.internal:6006/v1/traces}`
    - `N8N_BLOCK_ENV_ACCESS_IN_NODE=${N8N_BLOCK_ENV_ACCESS_IN_NODE:-false}`
  - Health check: `http://localhost:5678/healthz`
- **n8n-mcp service:**
  - Port: `3000` (MCP HTTP server)
  - Container: `n8n-mcp-local`
  - Image: `ghcr.io/czlonkowski/n8n-mcp:latest`
  - Depends on: n8n
  - Environment: - `N8N_API_URL=http://n8n:5678` - `N8N_API_KEY=${N8N_API_KEY:-}` - `AUTH_TOKEN=${N8N_MCP_AUTH_TOKEN:-}`
    **`docker-compose.phoenix.yml`**
- **phoenix service:**
  - Port: `6006` (Phoenix UI)
  - Port: `4317` (OTLP gRPC collector)
  - Container: `phoenix-server`
  - Image: `arizephoenix/phoenix:latest`
  - Network: `observability`
  - Database: SQLite at `/data/phoenix.db`
  - Health check: Python urllib test on `http://localhost:6006`
- **copilot-proxy service:**
  - Port: `8080` (Telemetry endpoint)
  - Container: `copilot-telemetry-proxy`
  - Environment:
    - `PHOENIX_COLLECTOR_ENDPOINT=http://phoenix:6006/v1/traces`
    - `PHOENIX_PROJECT_NAME=copilot-research`
  - Depends on: Phoenix
  - Volumes: `./agent:/app/agent:ro`, `./datasets:/app/datasets`

---

### 3. Environment Configuration

**`.env` (actual values):**

```bash
PHOENIX_ENDPOINT=http://localhost:6006
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_PROJECT=copilot-research
ENABLE_PHOENIX=true
N8N_PHOENIX_URL=http://host.docker.internal:6006
N8N_PHOENIX_COLLECTOR_ENDPOINT=http://host.docker.internal:6006/v1/traces
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
N8N_MCP_AUTH_TOKEN=lKOrvDReZzpcNUkeB9RnbApRGexdVcKaDQt9edc90cc=
N8N_API_KEY=[long JWT token]
```

**`.env.example` (root):**

- No Phoenix/n8n-specific variables in template
- Primarily for Google API, CopilotKit, etc.
  **`agent/.env.example`:**
- No observability variables included
- Only Google API, agent settings, VTCODE MCP

---

### 4. Port Mapping Summary

| Service           | Port | Purpose            | Access From                       |
| ----------------- | ---- | ------------------ | --------------------------------- |
| **Phoenix UI**    | 6006 | Web interface      | `http://localhost:6006`           |
| **Phoenix gRPC**  | 4317 | OTLP collector     | `localhost:4317`                  |
| **n8n UI**        | 5678 | Workflow editor    | `http://localhost:5678`           |
| **n8n MCP**       | 3000 | MCP HTTP server    | `http://localhost:3000`           |
| **Copilot Proxy** | 8080 | Telemetry endpoint | `http://localhost:8080/telemetry` |
| **Trace Bridge**  | 8787 | JSON→Protobuf      | `http://localhost:8787/ingest`    |
| **Agent Server**  | 8000 | Python ADK         | `http://localhost:8000`           |

---

### 5. Webhook URLs

**n8n Workflows (when n8n is running on localhost:5678):**

1. **Legacy Copilot Upload:**
   - `http://localhost:5678/webhook/copilot-chat-upload`
   - Method: POST
   - Body: `{"projectName": "...", "chatData": {...}}`
2. **Universal Chat Ingestion:**
   - `http://localhost:5678/webhook/universal-chat-ingest`
   - Method: POST
   - Body: `{"sourceLabel": "...", "chatData": {...}}`
   - Returns: Success response OR discovery sample (422)
3. **AI Message Ingestion:**
   - `http://localhost:5678/webhook/ingest-messages`
   - Method: POST
   - Body: `{"messages": [...], "validation_mode": "strict"}`
     **Bridge API (when running on localhost:8787):**
4. **Universal Ingest:**
   - `http://localhost:8787/ingest`
   - Accepts: UniversalTurnPayload
5. **Legacy Upload:**
   - `http://localhost:8787/upload`
   - Accepts: Raw Copilot chat.json
6. **File Upload:**
   - `http://localhost:8787/upload-file`
   - Accepts: Multipart file
7. **Health Check:**
   - `http://localhost:8787/health`

---

### 6. Orchestration Scripts

**Bash/PowerShell Scripts:**

| Script                                        | Purpose                         |
| --------------------------------------------- | ------------------------------- |
| `scripts/setup-phoenix.sh/.ps1`               | Install Phoenix + dependencies  |
| `scripts/start-copilot-observability.sh/.ps1` | Start Phoenix + Telemetry Proxy |
| `agent/observability/trace_bridge_api.py`     | Trace bridge server (port 8787) |

**npm Scripts (from package.json):**

```bash
# Phoenix management
npm run phoenix:setup       # Install Phoenix
npm run phoenix:start       # Start Phoenix container
npm run phoenix:stop        # Stop Phoenix
npm run phoenix:logs        # View Phoenix logs
npm run phoenix:ui          # Open UI in browser
# Copilot observability
npm run copilot:start       # Start Phoenix stack
npm run copilot:export      # Export datasets (all formats)
npm run copilot:export:finetune  # Export JSONL for fine-tuning
npm run copilot:batch-upload     # Upload chat.json to Phoenix
# Aliases
npm run observability:start # Same as copilot:start
npm run observability:stop  # Same as copilot:stop
```

---

### 7. Sample Datasets

**`datasets/` directory:**

1. **`datasets/chat.json`** (5.4 MB)
   - VS Code Copilot Chat export
   - Primary test dataset
2. **`datasets/chat_phoenix.csv`** (147 KB)
   - Processed/flattened chat data
3. **`datasets/demo_output.csv`** (155 KB)
   - Demo pipeline output
4. **`datasets/unknown-formats/`**
   - Discovery samples from failed format detection
   - Files: `unknown-fake-agent-export-*.json` (4 files)
   - Used for offline schema analysis

---

### 8. Python Observability Modules

**Core Files (`agent/observability/`):**

| File                       | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| `trace_bridge_api.py`      | FastAPI bridge (JSON→OTLP protobuf)          |
| `upload_chat_traces.py`    | CLI batch uploader                           |
| `copilot_phoenix_proxy.py` | Live telemetry proxy (port 8080)             |
| `copilot_chat_parser.py`   | Flat CSV parser for chat.json                |
| `process_chat_json.py`     | Full chat.json processor                     |
| `phoenix_config.py`        | Phoenix client configuration                 |
| `models.py`                | Pydantic models (UniversalTurnPayload, etc.) |
| `README.md`                | Complete documentation                       |

---

### 9. Complete Pipeline Flow

```
VS Code Copilot Chat
    ↓ (export chat.json)
datasets/chat.json
    ↓ (webhook POST)
n8n (localhost:5678)
    ↓ /webhook/universal-chat-ingest
Universal Workflow
    ├─ Format Detection (registry matching)
    ├─ Normalization (UniversalTurnPayload)
    └─ POST to Bridge
         ↓
Trace Bridge API (localhost:8787)
    ├─ /ingest endpoint
    ├─ Python OTel SDK
    └─ Protobuf serialization
         ↓
Phoenix (localhost:6006)
    ├─ /v1/traces (OTLP protobuf)
    ├─ SQLite storage
    └─ Web UI
```

---

### 10. Key Architectural Notes

1. **Docker→Host Communication:**
   - n8n uses `host.docker.internal` to reach host services (bridge, Phoenix)
   - Bridge uses `localhost` to reach Phoenix on host
2. **Format Detection:**
   - Universal workflow has extensible registry (mirrors TypeScript `registry.ts`)
   - Supports discovery sampling for unknown formats (422 response with diagnostic)
3. **Python Environment:**
   - Correct Python: `C:\Users\dylan\AppData\Local\Programs\Python\Python312\python.exe`
   - Has OTel packages installed
   - Bridge runs as: `python -m agent.observability.trace_bridge_api`
4. **n8n Security:**
   - Code nodes can access `$env` (N8N_BLOCK_ENV_ACCESS_IN_NODE=false)
   - Basic auth: admin/admin123
   - API key required for REST API
   - MCP auth token for MCP server
     All file paths, ports, URLs, and service configurations have been verified and documented above.
     agentId: a6ce866 (for resuming to continue this agent's work if needed)
     <usage>total_tokens: 107659
     tool_uses: 27
