# MCP Integration Architecture Diagram

## High-Level Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          DITTO WORKSPACE                                     │
│                                                                              │
│  User Request: "Refactor this TypeScript component"                         │
│                          ↓                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ PART 1: MCP REGISTRY INDEXER (agent-generator)                 │        │
│  │                                                                 │        │
│  │  registry-fetcher.ts → Discover available MCP servers          │        │
│  │  schema-crawler.ts → Generate Zod schemas + TypeScript types   │        │
│  │  molecule-generator.ts → Create semantic "Molecules"           │        │
│  │                                                                 │        │
│  │  Output: Type-safe tool definitions + higher-level components  │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                          ↓                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ PART 2: DEVCONTAINER AUTO-PROVISIONING (.devcontainer/)        │        │
│  │                                                                 │        │
│  │  devcontainer.json → Declare MCP servers + environment vars    │        │
│  │  post-create-command.sh → Install all MCP servers on startup  │        │
│  │  mcp-servers/config.json → Server transport configuration     │        │
│  │                                                                 │        │
│  │  When developer opens workspace:                               │        │
│  │  1. Container created → post-create runs                      │        │
│  │  2. MCP servers installed to ~/.mcp-servers                   │        │
│  │  3. claude-prompts configured with workspace paths            │        │
│  │  4. Claude Code Desktop connects → tools available             │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                          ↓                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │ PART 3: SCHEMA REFLECTION & AGENT SPECIALIZATION               │        │
│  │                                                                 │        │
│  │  schema-reflection.ts → Connect to running MCP servers         │        │
│  │  agent-specializer.ts → Task-specific instruction generation   │        │
│  │  instruction-builder.ts → Compose final system prompt          │        │
│  │  copilot-kit-bridge.ts → Integrate with orchestration layer   │        │
│  │                                                                 │        │
│  │  At runtime:                                                   │        │
│  │  1. Parse user task                                            │        │
│  │  2. Reflect available tools from running servers               │        │
│  │  3. Generate specialized agent instructions                    │        │
│  │  4. Select appropriate GenUI tier                              │        │
│  │  5. Execute with safety constraints                            │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                          ↓                                                   │
│  Agent with Dynamic Tool Knowledge                                          │
│  ───────────────────────────────────                                        │
│  You have access to: filesystem, git, sequential-thinking, web,             │
│  and postgres. Use Code Editor molecule to modify TypeScript...             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Registry Indexer (Detailed)

```
┌────────────────────────────────────────────────────────────────────┐
│                  MCP REGISTRY INDEXING FLOW                        │
└────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │  registry-fetcher   │
                    │   - Fetch catalog   │
                    │   - Parse specs     │
                    │   - Validate JSON   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  ServerSpec[]       │
                    │                     │
                    │ ├─ filesystem       │
                    │ ├─ git              │
                    │ ├─ web              │
                    │ ├─ postgres         │
                    │ └─ thinking         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │   schema-crawler.ts         │
                    │                             │
                    │ For each tool:              │
                    │ - JSON Schema → Zod         │
                    │ - Generate TypeScript types │
                    │ - Create validators         │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  Generated Artifacts:       │
                    │                             │
                    │ ├─ filesystem.schema.ts     │
                    │ ├─ git.schema.ts            │
                    │ ├─ web.schema.ts            │
                    │ ├─ postgres.schema.ts       │
                    │ └─ thinking.schema.ts       │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  molecule-generator.ts      │
                    │                             │
                    │ Wrap tools into semantic    │
                    │ components:                 │
                    │                             │
                    │ ├─ code_editor              │
                    │ ├─ file_explorer            │
                    │ ├─ git_committer            │
                    │ ├─ sequential_analyzer      │
                    │ ├─ web_fetcher              │
                    │ └─ db_query_runner          │
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  Molecule Library Ready     │
                    │  (for agent-generator)      │
                    └────────────────────────────┘

Output: Type-safe, semantic tool definitions with examples
        and safety constraints built-in.
```

---

## Part 2: Devcontainer Integration (Detailed)

```
┌────────────────────────────────────────────────────────────────────┐
│         DEVCONTAINER AUTO-PROVISIONING FLOW                        │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ Developer opens      │
│ .devcontainer/       │
└──────────────┬───────┘
               │
┌──────────────▼────────────────────────┐
│ devcontainer.json reads:              │
│ - Image (Node.js 22, Python 3.11)    │
│ - Features (git, python)              │
│ - postCreateCommand (install script)  │
│ - remoteEnv (workspace paths)         │
└──────────────┬────────────────────────┘
               │
┌──────────────▼────────────────────────┐
│ Container created                      │
│ - Node.js 22 installed                 │
│ - Python 3.11 installed                │
│ - Git configured                       │
└──────────────┬────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│ post-create-command.sh runs:                            │
│                                                         │
│ 1. npm install (all workspaces)                        │
│ 2. npm run build (agent-generator)                     │
│ 3. mkdir -p ~/.mcp-servers                             │
│ 4. cd ~/.mcp-servers && npm install:                  │
│    ├─ @modelcontextprotocol/server-filesystem         │
│    ├─ @modelcontextprotocol/server-git                │
│    ├─ @modelcontextprotocol/server-web                │
│    ├─ @modelcontextprotocol/server-postgres           │
│    └─ @modelcontextprotocol/server-sequential-thinking│
│ 5. npm install -g claude-prompts                       │
│ 6. mkdir -p ~/.claude-prompts/{gates,styles,prompts}  │
│ 7. Copy workspace templates                            │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────▼────────────────────────┐
│ Environment Variables Set:             │
│ - MCP_WORKSPACE                        │
│ - MCP_PROMPTS_PATH                     │
│ - MCP_GATES_PATH                       │
│ - MCP_STYLES_PATH                      │
└──────────────┬────────────────────────┘
               │
┌──────────────▼────────────────────────────────────────┐
│ mcp-servers/config.json loaded:                       │
│                                                      │
│ {                                                    │
│   "mcpServers": {                                    │
│     "filesystem": { command, args },                 │
│     "git": { command, args },                        │
│     "web": { command, args },                        │
│     "sequential-thinking": { command, args },        │
│     "postgres": { command, args },                   │
│     "claude-prompts": { command, args }              │
│   },                                                 │
│   "transport": "stdio"                               │
│ }                                                    │
└──────────────┬────────────────────────────────────────┘
               │
┌──────────────▼────────────────────────┐
│ Claude Code Desktop/VSCode launches    │
│ - Reads mcp-servers/config.json        │
│ - Connects to all 6 MCP servers        │
│ - Tools available to agent             │
└────────────────────────────────────────┘

Result: Zero-config for developers. Everything works out of box.
```

---

## Part 3: Schema Reflection & Specialization (Detailed)

```
┌────────────────────────────────────────────────────────────────────┐
│     RUNTIME SCHEMA REFLECTION & AGENT SPECIALIZATION               │
└────────────────────────────────────────────────────────────────────┘

User Task: "Refactor this TypeScript component"
                          │
          ┌───────────────▼────────────────┐
          │ Parse Task Semantics           │
          │ - Detect: code generation      │
          │ - Detect: refactoring          │
          │ - Detect: testing need         │
          └───────────────┬────────────────┘
                          │
      ┌───────────────────▼────────────────────────┐
      │ schema-reflection.ts                       │
      │                                            │
      │ For each running MCP server:               │
      │ 1. Connect to server                       │
      │ 2. Call tools.list() or equivalent         │
      │ 3. Extract tool schemas + docs             │
      │ 4. Return AvailableTools[]                 │
      └───────────────┬────────────────────────────┘
                      │
      ┌───────────────▼────────────────────────┐
      │ AvailableTools (Runtime):              │
      │                                        │
      │ ├─ filesystem: [read, write, list]    │
      │ ├─ git: [status, commit, push]        │
      │ ├─ sequential-thinking: [plan, step]  │
      │ ├─ web: [fetch]                       │
      │ └─ (others discovered dynamically)    │
      └───────────────┬────────────────────────┘
                      │
      ┌───────────────▼────────────────────────────────┐
      │ agent-specializer.ts                          │
      │                                                │
      │ Input: task + availableTools + constraints    │
      │                                                │
      │ 1. Load base agent prompt (agent-base.md)     │
      │ 2. Load specialized template                  │
      │    (code-generation.md for refactoring)       │
      │ 3. Filter tools relevant to task              │
      │    - refactoring needs: filesystem, git       │
      │ 4. Merge tool availability info               │
      │ 5. Inject safety constraints                  │
      │ 6. Return specialized instructions            │
      └───────────────┬────────────────────────────────┘
                      │
      ┌───────────────▼────────────────────────────────────┐
      │ Specialized Agent Instructions (Generated):        │
      │                                                    │
      │ # Code Refactoring Agent                          │
      │ You are an expert TypeScript refactorer.          │
      │                                                   │
      │ Available Tools:                                  │
      │ - Code Editor (filesystem.read/write)            │
      │ - Git Workspace (git.status/diff)                │
      │ - Sequential Analyzer (thinking)                 │
      │                                                   │
      │ Constraints:                                      │
      │ - Always show diffs before changes               │
      │ - Run tests after each step                      │
      │ - Create feature branch                          │
      │ - Commit with meaningful messages                │
      └───────────────┬────────────────────────────────────┘
                      │
      ┌───────────────▼────────────────────────────────┐
      │ instruction-builder.ts                         │
      │                                                │
      │ 1. Compile final system prompt                 │
      │ 2. Generate tool reference with examples       │
      │ 3. Inject GenUI tier selection logic           │
      │ 4. Add recovery strategies                     │
      │ 5. Return AgentInstructions object             │
      └───────────────┬────────────────────────────────┘
                      │
      ┌───────────────▼────────────────────────────────────┐
      │ GenUI Tier Selection (Automatic)                  │
      │                                                   │
      │ Task analysis:                                    │
      │ - Code editing → Static GenUI (MUI components)   │
      │ - Config changes → Declarative GenUI (JSON)      │
      │ - Complex analysis → Open-Ended GenUI (HTML)     │
      │ - Multiple skills → Route to appropriate tier    │
      └───────────────┬────────────────────────────────────┘
                      │
      ┌───────────────▼────────────────────────────────────┐
      │ CopilotKit Orchestration                          │
      │                                                   │
      │ Route to:                                         │
      │ - Static: render_code_editor component           │
      │ - Declarative: load git_status schema            │
      │ - Open-Ended: create refactoring_workspace.html  │
      └───────────────┬────────────────────────────────────┘
                      │
      ┌───────────────▼────────────────────────────────────┐
      │ Execute with Full Context                        │
      │                                                   │
      │ ✓ Dynamic tool knowledge                         │
      │ ✓ Type-safe calls (Zod validated)                │
      │ ✓ Task-specific guidance                         │
      │ ✓ Safety constraints enforced                    │
      │ ✓ Appropriate UI for task                        │
      └──────────────────────────────────────────────────┘

Result: Agent knows exactly what tools exist, exactly how to use them,
        and exactly what safety constraints apply.
```

---

## How The Three Parts Work Together

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE INTEGRATION                               │
└────────────────────────────────────────────────────────────────────────────┘

                            Part 1: Registry Indexer
                            (Build time)
                                    ↓
        ┌─────────────────────────────────────────────────┐
        │ Generate:                                       │
        │ - Zod schemas for all MCP tools                │
        │ - TypeScript interfaces                        │
        │ - Semantic "Molecules"                         │
        │ - Agent instruction templates                  │
        └─────────────────────────────────────────────────┘
                                    ↓
                    Part 2: Devcontainer Setup
                    (At container start)
                                    ↓
        ┌─────────────────────────────────────────────────┐
        │ Auto-provision:                                 │
        │ - Install all MCP servers                       │
        │ - Configure workspace paths                     │
        │ - Set environment variables                     │
        │ - Connect to Claude Code Desktop                │
        └─────────────────────────────────────────────────┘
                                    ↓
                Part 3: Schema Reflection & Specialization
                (At runtime, when user submits task)
                                    ↓
        ┌─────────────────────────────────────────────────┐
        │ Dynamic:                                        │
        │ - Discover running tools (reflection)           │
        │ - Analyze task semantics                        │
        │ - Generate specialized instructions             │
        │ - Select GenUI tier                             │
        │ - Execute with full context                     │
        └─────────────────────────────────────────────────┘

Final Result:
- Agents know all available tools
- Tools are always up-to-date (no hardcoding)
- Instructions match the task exactly
- UI is appropriate for the job
- Everything type-safe and validated
```

---

## Data Flow: End-to-End

```
Developer                                   System
────────                                   ──────

Opens .devcontainer/
    ↓
                        Devcontainer created
                        post-create runs
                        MCP servers installed
                        ↓
                        
Claude Code Desktop launches
    ↓
                        Reads mcp-servers/config.json
                        Connects to all 6 servers
                        ↓
                        
Enters task: "Refactor component"
    ↓
                        schema-reflection.ts connects
                        to running servers
                        Lists available tools
                        ↓
                        agent-specializer.ts runs
                        Generates task-specific prompt
                        ↓
                        
Sees specialized agent
with dynamic tool knowledge
    ↓
                        CopilotKit executes
                        Route to GenUI tier
                        ↓
                        
Agent reads code, commits changes,
runs tests - all with validated tools
    ↓
                        ✓ Success
```

---

## Key Architectural Principles

| Principle | Implementation |
|-----------|-----------------|
| **Type Safety** | Zod schemas from JSON Schemas ensure validated tool calls |
| **No Hallucination** | Schema reflection discovers only tools that actually exist |
| **Semantic Clarity** | Molecules hide complexity, expose intent ("edit code" not "read/write") |
| **Zero Config** | Devcontainer auto-provisions everything |
| **Dynamic** | Agent instructions generated per-task based on available tools |
| **Safe** | Constraints injected, diffs shown, confirmations required |
| **Scalable** | New MCP servers auto-indexed, no code changes needed |

---

## Deployment Scenarios

### Scenario 1: Local Development
```
Developer opens .devcontainer/ in VS Code
→ Container starts
→ post-create installs MCP servers
→ Claude Code Desktop connects
→ Tools available locally
```

### Scenario 2: GitHub Codespaces
```
Create Codespace from repo
→ devcontainer.json applied
→ post-create runs
→ MCP servers in cloud container
→ Claude Code Desktop connects via SSH
→ Tools available in cloud
```

### Scenario 3: CI/CD Pipeline
```
CI job spins up container
→ MCP servers auto-installed
→ Agent runs batch tasks
→ Changes validated
→ Commits pushed
```

All scenarios: same code, same configuration, same tools.

---

This architecture ensures that your workspace becomes **tool-aware, self-discovering, and context-sensitive** — exactly what you need for vibe coding with AI agents.
