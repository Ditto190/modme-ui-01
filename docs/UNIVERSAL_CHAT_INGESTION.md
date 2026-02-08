# Universal Chat Ingestion Pipeline

> **Created:** 2026-02-08
> **Type:** Reference
> **Status:** In Review

## Overview

The Universal Chat Ingestion pipeline detects, normalizes, and uploads AI agent chat exports into Phoenix as OpenTelemetry traces. It handles any JSON chat format (VS Code Copilot, Claude Code, ChatGPT, Cursor, etc.) through a fingerprint-based registry with an automatic discovery fallback for unknown formats.

### Design Principle

**AI builds the tools. Tools run the pipeline.** No LLM calls occur at runtime. Claude Sonnet generates the format descriptors offline; the pipeline executes them deterministically at scale.

## Table of Contents

1. [Architecture](#architecture)
2. [Pipeline Flow](#pipeline-flow)
3. [Format Detection](#format-detection)
4. [Discovery Step](#discovery-step)
5. [Adding New Formats](#adding-new-formats)
6. [n8n Workflow](#n8n-workflow)
7. [Python Bridge](#python-bridge)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Architecture

### Key Concepts

| Concept | Purpose |
|---------|---------|
| **ChatFormatDescriptor** | Declares HOW to detect + extract a specific agent's chat format |
| **UniversalTurnPayload** | The normalized contract between n8n and the Python bridge |
| **FingerprintRule** | Structural checks (path exists, type matches) that identify a format |
| **FieldMapping** | Dot-notation paths from agent format to universal format |
| **DiscoverySample** | Structural snapshot of an unknown format for offline analysis |

### Component Locations

| Component | Location | Technology |
|-----------|----------|------------|
| Type System | `agent-generator/src/chat-formats/types.ts` | TypeScript + Zod v4 |
| Detection Engine | `agent-generator/src/chat-formats/fingerprint.ts` | TypeScript |
| Normalizer | `agent-generator/src/chat-formats/normalizer.ts` | TypeScript |
| Discovery | `agent-generator/src/chat-formats/discovery.ts` | TypeScript |
| Format Registry | `agent-generator/src/chat-formats/registry.ts` | TypeScript |
| Copilot Adapter | `agent-generator/src/chat-formats/formats/copilot-chat.ts` | TypeScript |
| Python Bridge | `agent/observability/trace_bridge_api.py` | Python (FastAPI) |
| n8n Workflow | `agent/observability/n8n_workflow_universal_ingestion.json` | n8n JSON |
| E2E Tests | `agent-generator/src/chat-formats/test-pipeline.ts` | TypeScript |

---

## Pipeline Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Chat JSON File  │───▶│  n8n Webhook     │───▶│  Detect Format  │
│  (any agent)     │    │  POST /ingest    │    │  (fingerprint)  │
└─────────────────┘    └──────────────────┘    └────────┬────────┘
                                                        │
                                               ┌────────┴────────┐
                                               │   Matched?      │
                                        ┌──────┤                 ├──────┐
                                        │ YES  └─────────────────┘  NO  │
                                        ▼                               ▼
                               ┌─────────────────┐          ┌─────────────────┐
                               │  Normalize Turns │          │  Discovery Step │
                               │  (field mapping) │          │  (sample + save)│
                               └────────┬────────┘          └────────┬────────┘
                                        │                            │
                                        ▼                            ▼
                               ┌─────────────────┐          ┌─────────────────┐
                               │  Python Bridge   │          │  422 Response   │
                               │  POST /ingest    │          │  + diagnostic   │
                               └────────┬────────┘          └─────────────────┘
                                        │
                                        ▼
                               ┌─────────────────┐
                               │  Phoenix Traces  │
                               │  (OTLP Protobuf) │
                               └─────────────────┘
```

---

## Format Detection

Detection uses **structural fingerprinting** — a set of rules that check whether specific paths exist with expected types in the JSON, without parsing the entire document.

### Fingerprint Rules

Each rule checks one structural assertion:

```typescript
{ path: 'responderUsername', check: 'type_string' }
{ path: 'requests',         check: 'type_array'  }
{ path: 'requests[0].message', check: 'type_object' }
```

Supported checks: `exists`, `type_string`, `type_number`, `type_array`, `type_object`, `equals`, `matches` (regex), `has_key`.

### Detection Logic

1. Registry sorts descriptors by priority (higher checked first)
2. For each descriptor, ALL fingerprint rules must pass (AND logic)
3. First exact match wins
4. If no match, a `partial` confidence is noted for closest match
5. If zero rules pass on anything, confidence is `none`

### Currently Registered Formats

| Format ID | Agent | Priority | Fingerprint Rules |
|-----------|-------|----------|-------------------|
| `copilot-chat` | GitHub Copilot | 100 | `responderUsername`: string, `requests`: array, `requests[0].message`: object, `requests[0].variableData`: object |

---

## Discovery Step

When format detection **fails**, the pipeline does not simply error. It generates a **StructuralSample** — a deep analysis of the unknown JSON that provides everything the schema-crawler needs to generate a new `ChatFormatDescriptor` offline.

### What Gets Sampled

| Field | Description |
|-------|-------------|
| `topLevelSchema` | Every top-level key mapped to its type description |
| `candidateTurnsPath` | Best guess for which array holds conversation turns |
| `candidateTurnsCount` | Number of items in the candidate array |
| `firstTurnSchema` | Type map of the first element in the candidate array |
| `firstTurnSample` | Actual data from the first turn (strings truncated to 200 chars) |
| `deepKeyMap` | All paths found up to depth 5 with their types and string samples |
| `contentHash` | Stable signature for deduplication |
| `diagnosticText` | Which registered formats were attempted and which rules failed |

### Candidate Turns Heuristic

The pipeline guesses the "turns" array by scoring top-level arrays:

- **+200** if the key name is `messages`, `requests`, `turns`, `conversation`, `exchanges`, or `chat`
- **+100** for each element key matching chat markers (`message`, `content`, `text`, `role`, `response`, `prompt`)
- **+N** for array length (larger arrays score higher)

### Sample Output Location

Discovery samples are saved to `datasets/unknown-formats/` with filenames like:

```
unknown-claude-export-2026-02-08T05-08-23-0060k5.json
```

### Feedback Loop

```
Pipeline fails → Sample saved → AI analyzes sample offline →
New ChatFormatDescriptor committed → Pipeline handles format next time
```

---

## Adding New Formats

### Step 1: Create the Descriptor

Create a new file at `agent-generator/src/chat-formats/formats/<format-id>.ts`:

```typescript
import type { ChatFormatDescriptor } from '../types';

export const myFormatDescriptor: ChatFormatDescriptor = {
  id: 'my-format',
  name: 'My Agent Chat',
  agent: 'My Agent',
  version: '1.0.0',
  priority: 50,
  status: 'beta',
  fingerprint: [
    { path: 'messages', check: 'type_array' },
    { path: 'messages[0].role', check: 'type_string' },
  ],
  fieldMapping: {
    turns: 'messages',
    turn: {
      userMessage: 'content',  // path within each turn
      assistantResponse: 'content',
      model: 'model',
      timestamp: 'timestamp',
      // ... see FieldMappingSchema for all options
    },
    global: { sessionId: null, responder: null, agent: null },
  },
  requiresResponseAssembly: false,
  toolCallsNested: false,
};
```

### Step 2: Register Custom Extractors (if needed)

For formats with complex response structures (like Copilot's `response[]` array), register custom extractors:

```typescript
import { registerResponseAssembler } from '../normalizer';

export function registerMyFormat() {
  registerResponseAssembler('my-format', (responses) => {
    // Custom logic to assemble text from response parts
    return responses.map(r => r.text).join('\n');
  });
}
```

### Step 3: Add to Registry

In `agent-generator/src/chat-formats/registry.ts`, import and register:

```typescript
import { myFormatDescriptor, registerMyFormat } from './formats/my-format';

// In initializeRegistry():
chatFormatRegistry.formats.push(myFormatDescriptor);
registerMyFormat();
```

### Step 4: Update n8n Workflow

Add the fingerprint rules and normalizer `switch` case in the n8n Code nodes.

---

## n8n Workflow

**Workflow ID**: `dfHBSbrEHbUi4H8B`
**Name**: Universal Chat Ingestion → Phoenix Traces
**Webhook**: `POST /webhook/universal-chat-ingest`

### Nodes (8 total)

| Node | Type | Purpose |
|------|------|---------|
| Receive Chat JSON | Webhook | Entry point; accepts JSON POST |
| Detect Agent Format | Code | Fingerprint-based format detection |
| Check Detection | If | Routes to normalize (true) or discovery (false) |
| Normalize Turns | Code | Format-specific extraction to UniversalTurnPayload |
| Send to Bridge | HTTP Request | POST payload to `http://host.docker.internal:8787/ingest` |
| Success Response | Respond | Returns bridge response (200) |
| Generate Discovery Sample | Code | Structural analysis of unknown format |
| Error Response | Respond | Returns discovery sample (422) |

### Request Format

```json
{
  "chatData": { /* raw chat JSON */ },
  "projectName": "my-project",
  "sourceLabel": "claude-export"
}
```

Or send the raw chat JSON directly (auto-detected from body).

---

## Python Bridge

**Location**: `agent/observability/trace_bridge_api.py`
**Port**: 8787

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/ingest` | POST | Universal format ingestion (UniversalTurnPayload) |
| `/upload` | POST | Legacy Copilot-specific format |
| `/upload-file` | POST | File upload for Copilot chat.json |
| `/formats` | GET | Lists supported formats and schema |
| `/health` | GET | Health check (version 2.0.0) |

### Trace Structure

Each conversation turn produces a span hierarchy following OpenInference conventions:

```
AGENT span (turn)
├── LLM span (model call)
│   ├── input: user message
│   └── output: assistant response
├── TOOL span (tool call 1)
├── TOOL span (tool call 2)
└── ...
```

### Running the Bridge

```bash
cd agent/observability
python trace_bridge_api.py
# Starts on http://localhost:8787
```

**Prerequisites**: Phoenix running on port 6006, `opentelemetry` and `openinference` Python packages installed.

---

## Testing

### E2E Pipeline Test

```bash
cd agent-generator
npx tsx src/chat-formats/test-pipeline.ts
```

Tests 6 scenarios:

1. ✅ Registry initialization and format listing
2. ✅ Fingerprint detection against real Copilot `chat.json`
3. ✅ Full ingestion pipeline (detect + normalize + payload shape)
4. ✅ Discovery step for unknown formats (samples saved to disk)
5. ✅ Diagnostic output for failed detection
6. ✅ Bridge payload shape validation

### Custom Chat Files

```bash
npx tsx src/chat-formats/test-pipeline.ts path/to/other-chat.json
```

### Test Results (2026-02-08)

| Metric | Value |
|--------|-------|
| Tests passed | 36/36 |
| Turns extracted | 10 (from 5.4 MB Copilot chat) |
| Tool calls found | 91 |
| Turns with thinking/CoT | 10/10 |
| Payload size | 132.3 KB |
| Discovery samples saved | 1 (fake unknown format test) |

---

## Troubleshooting

### "Unknown chat format" — Detection Fails

1. Check the `datasets/unknown-formats/` directory for the discovery sample
2. The sample's `topLevelSchema` and `deepKeyMap` show the actual structure
3. Use this to create a new `ChatFormatDescriptor` (see [Adding New Formats](#adding-new-formats))

### Bridge Returns 500

1. Verify Phoenix is running: `curl http://localhost:6006/health`
2. Verify bridge is running: `curl http://localhost:8787/health`
3. Check that `openinference` is installed: `pip show openinference-semantic-conventions`

### n8n Workflow Errors

1. Check the webhook URL matches: `POST /webhook/universal-chat-ingest`
2. Verify n8n can reach the bridge: `http://host.docker.internal:8787` (Docker) or `http://localhost:8787` (native)
3. For large chat files (>10 MB), increase the HTTP Request timeout in the Send to Bridge node

### No Tool Calls Extracted

Tool calls in Copilot chats live at `result.metadata.toolCallRounds[].toolCalls[]`. If this path is missing, the turn may have had no tool invocations (model-only response).

---

## Related Notes

- [Copilot Chat Observability Plan](copilotchat_observability_plan.md)
- [n8n Message Ingestion Workflow](n8n-message-ingestion-workflow.json)
- [TOOLSET_MANAGEMENT.md](../TOOLSET_MANAGEMENT.md) — Parallel pattern for lifecycle management

## References

- [OpenInference Semantic Conventions](https://github.com/Arize-ai/openinference)
- [Phoenix AI Observability](https://docs.arize.com/phoenix)
- [Zod v4 Documentation](https://zod.dev)
- [n8n Code Node Docs](https://docs.n8n.io/code/builtin/)

---

**Tags:** #observability #ingestion #phoenix #n8n #chat-formats #opentelemetry
