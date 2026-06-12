# MCP Registry Integration Plan

**Status**: Active  
**Last Updated**: 2026-01-02  
**Owner**: Ditto Workspace  

This plan bridges your Generative UI Workspace with the claude-prompts MCP ecosystem and the broader MCP registry. Goal: **Schema-driven agent generation with auto-provisioning and dynamic tool reflection**.

---

## Part 1: MCP Registry Indexer

### Goal
Parse MCP server specs (from `modelcontextprotocol/servers`) and auto-generate:
- Zod schemas for tool parameters
- TypeScript type definitions
- "Molecule" wrappers for CopilotKit orchestration
- Agent instructions that respect tool capabilities

### Key Files to Create

```
apps/agent-generator/
├── src/
│   ├── mcp-registry/
│   │   ├── index.ts                    # Entry point
│   │   ├── registry-fetcher.ts         # Download/parse MCP catalog
│   │   ├── schema-crawler.ts           # Extract tool specs → Zod
│   │   ├── molecule-generator.ts       # Higher-order component wrappers
│   │   └── agent-instructions.ts       # Emit agent prompts + constraints
│   └── examples/
│       └── indexed-tools.generated.ts  # Output artifacts
└── package.json
```

### Implementation Tasks

#### 1.1 Registry Fetcher (`registry-fetcher.ts`)

```typescript
// Fetch MCP servers README from modelcontextprotocol/servers
// Parse YAML/JSON specs for each server (filesystem, git, postgres, web, etc.)
// Return: ServerSpec[] with tools, parameters, documentation

interface ServerSpec {
  id: string;                    // "filesystem", "git", etc.
  name: string;
  description: string;
  tools: MCPTool[];
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  returns: JSONSchema;
}
```

**Why**: The MCP ecosystem is reference implementations. By indexing them, your agent generator becomes tool-aware without hardcoding.

#### 1.2 Schema Crawler (`schema-crawler.ts`)

Transform JSON schemas into Zod:

```typescript
// Input: MCPTool.inputSchema (JSON Schema format)
// Output: ZodSchema + TypeScript interface

export function generateZodFromJSONSchema(
  schema: JSONSchema,
  toolName: string
): { zodSchema: string; typeDefinition: string }
```

**Why**: Zod gives you runtime validation + type safety. Generated types become your source of truth.

#### 1.3 Molecule Generator (`molecule-generator.ts`)

Wrap raw MCP tools into "Molecules" (high-level components):

```typescript
// Example: filesystem MCP tools → Molecules
// Input: MCPTool[] for read, write, list
// Output: render_file_browser(), render_code_editor(), etc.

interface Molecule {
  id: string;              // "render_file_browser"
  description: string;
  underlyingTools: string[]; // ["filesystem.read", "filesystem.list"]
  parameters: ZodSchema;
  semantics: string;       // "allows user to navigate and select files"
}
```

**Why**: Your GenUI architecture prefers Molecules over raw atoms. This keeps agents focused on *intent*, not API details.

#### 1.4 Agent Instructions Generator (`agent-instructions.ts`)

Emit dynamic agent prompts based on available tools:

```typescript
// Given: parsed MCP registry + available Molecules
// Emit: Instructions that teach agent which tools exist and when to use them

export function generateAgentInstructions(
  molecules: Molecule[],
  context: { task: string; constraints: string[] }
): string
```

**Output example**:
```markdown
# Available Tools

## Code Editor (render_code_editor)
Allows editing source files with syntax highlighting.
- Input: `filepath: string, content: string`
- Useful when: User wants to modify code

## Git Operations (git_commit)
Commit changes with automatic message generation.
- Input: `message: string, files: string[]`
- Use after: User has made edits

## Sequential Thinking
Break complex problems into steps.
- Input: `problem: string, max_steps: number`
```

---

## Part 2: Devcontainer Integration

### Goal
Embed MCP server provisioning into `.devcontainer/devcontainer.json` so:
- Local Claude Code Desktop automatically sees all tools
- GitHub Codespaces has tools pre-installed
- VS Code Dev Containers work out-of-box

### Key Files to Modify

```
.devcontainer/
├── devcontainer.json          # UPDATED: MCP server config
├── post-create-command.sh     # UPDATED: Install MCP servers
├── mcp-servers/
│   ├── config.json            # MCP transport settings
│   └── install.sh             # Setup script
└── docs/
    └── MCP_SETUP.md           # User guide
```

### Implementation Tasks

#### 2.1 Devcontainer Configuration

Update `.devcontainer/devcontainer.json`:

```json
{
  "name": "Ditto Workspace",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:22-bullseye",
  
  "features": {
    "ghcr.io/devcontainers/features/python:1": {
      "version": "3.11"
    },
    "ghcr.io/devcontainers/features/git:latest": {}
  },

  "postCreateCommand": "bash .devcontainer/post-create-command.sh",

  "mounts": [
    "source=${localEnv:HOME}/.claude-prompts,target=/workspace/.claude-prompts,type=bind,consistency=delegated"
  ],

  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-typescript-next",
        "charliermarsh.ruff",
        "GitHub.copilot"
      ],
      "settings": {
        "[typescript]": {
          "editor.defaultFormatter": "denoland.deno",
          "editor.formatOnSave": true
        }
      }
    }
  },

  "remoteEnv": {
    "MCP_WORKSPACE": "${containerWorkspaceFolder}/.claude-prompts",
    "MCP_PROMPTS_PATH": "${containerWorkspaceFolder}/.claude-prompts/prompts",
    "MCP_GATES_PATH": "${containerWorkspaceFolder}/.claude-prompts/gates",
    "MCP_STYLES_PATH": "${containerWorkspaceFolder}/.claude-prompts/styles",
    "CLAUDE_CODE_WORKSPACE": "${containerWorkspaceFolder}"
  }
}
```

**Key additions**:
- `mcp-servers/config.json` mount for tool configuration
- Environment variables for workspace paths
- `postCreateCommand` to install/start MCP servers

#### 2.2 Post-Create Setup Script

Create `.devcontainer/post-create-command.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Setting up Ditto Workspace with MCP servers..."

# 1. Install Node.js dependencies
npm install --workspace=apps/* --workspace=packages/*

# 2. Build workspace projects
npm run build --workspace=apps/agent-generator

# 3. Install MCP servers
mkdir -p ~/.mcp-servers
cd ~/.mcp-servers

# Install key MCP servers (from modelcontextprotocol/servers)
npm install --save \
  @modelcontextprotocol/server-filesystem \
  @modelcontextprotocol/server-git \
  @modelcontextprotocol/server-postgres \
  @modelcontextprotocol/server-web \
  @modelcontextprotocol/server-sequential-thinking

# 4. Set up claude-prompts MCP (your orchestration layer)
npm install -g claude-prompts

# 5. Initialize workspace config
mkdir -p .claude-prompts/{gates,styles,prompts}
cp workspace-templates/* .claude-prompts/ || true

echo "✅ Workspace ready! Run 'npm run dev' to start."
```

#### 2.3 MCP Server Configuration

Create `.devcontainer/mcp-servers/config.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["${HOME}/.mcp-servers/node_modules/@modelcontextprotocol/server-filesystem/build/index.js", "${containerWorkspaceFolder}"],
      "env": {
        "MCP_WORKSPACE": "${containerWorkspaceFolder}"
      }
    },
    "git": {
      "command": "node",
      "args": ["${HOME}/.mcp-servers/node_modules/@modelcontextprotocol/server-git/build/index.js", "${containerWorkspaceFolder}"],
      "env": {
        "MCP_WORKSPACE": "${containerWorkspaceFolder}"
      }
    },
    "sequential-thinking": {
      "command": "node",
      "args": ["${HOME}/.mcp-servers/node_modules/@modelcontextprotocol/server-sequential-thinking/build/index.js"]
    },
    "claude-prompts": {
      "command": "npx",
      "args": ["claude-prompts@latest"],
      "env": {
        "MCP_WORKSPACE": "${containerWorkspaceFolder}/.claude-prompts"
      }
    }
  },
  "transport": "stdio"
}
```

**Why stdio**: Works seamlessly in devcontainers. SSE is for web clients.

---

## Part 3: Dynamic Schema Reflection

### Goal
At **parse time** (when user describes a task), dynamically:
1. Extract available tools from active MCP servers
2. Generate agent instructions that reflect current capabilities
3. Create specialized prompts for code generation, analysis, etc.

### Key Files to Create

```
apps/agent-generator/
├── src/
│   ├── reflection/
│   │   ├── schema-reflection.ts      # Extract tool schemas at runtime
│   │   ├── agent-specializer.ts      # Tailor prompts to available tools
│   │   └── instruction-builder.ts    # Build dynamic instructions
│   └── integration/
│       ├── copilot-kit-bridge.ts     # Connect to CopilotKit
│       └── genui-coordinator.ts      # Coordinate with GenUI layers
└── prompts/
    ├── agent-base.md                 # Core agent persona
    ├── code-generation.md            # Specialized: code synthesis
    ├── analysis.md                   # Specialized: data/code analysis
    └── tool-discovery.md             # Teach agent about available tools
```

### Implementation Tasks

#### 3.1 Schema Reflection (`schema-reflection.ts`)

At runtime, connect to active MCP servers and extract their tool definitions:

```typescript
// Query MCP server for available tools
// Return: AvailableTools[] with schemas + documentation

export async function reflectMCPSchema(serverName: string): Promise<MCPToolSet> {
  // Connect to running MCP server
  // Call: tools.list() or equivalent
  // Parse response: extract schema, description, constraints
  
  return {
    serverId: serverName,
    tools: [
      {
        name: "read_file",
        schema: ZodSchema,
        description: "Read file contents",
        examples: [ ... ]
      },
      // ...
    ]
  };
}
```

**Why**: Agents should only see tools that actually exist. No hallucinated APIs.

#### 3.2 Agent Specializer (`agent-specializer.ts`)

Tailor agent instructions based on task + available tools:

```typescript
export function specializeAgent(
  baseInstructions: string,
  availableTools: AvailableTools[],
  task: string,
  constraints: string[]
): string {
  // 1. Parse task to determine specialization
  //    - "write code" → code-generation.md
  //    - "debug this" → analysis.md
  //    - "explore data" → data-exploration.md
  
  // 2. Filter tools relevant to task
  //    - code generation → filesystem, git, sequential-thinking
  //    - analysis → web, sequential-thinking
  
  // 3. Inject tool capabilities into instructions
  //    - "You have access to: read_file, write_file, git_commit"
  //    - "Use sequential thinking to break down complex refactors"
  
  // 4. Add safety constraints
  //    - "Never delete files without confirmation"
  //    - "Always run tests after modifications"
  
  return specializedPrompt;
}
```

**Output example**:
```markdown
# Agent: Code Generator

You are an expert code synthesizer with access to:
- Filesystem tools (read, write, list, delete)
- Git tools (commit, push, create branch)
- Sequential thinking for multi-step refactors
- claude-prompts orchestration for structured outputs

## Task
Generate production-ready TypeScript for user's feature request.

## Safety Constraints
- Confirm before destructive operations
- Run tests after modifications
- Create feature branches for experimental changes

## Available Tools
{detailed tool reference with examples}
```

#### 3.3 Instruction Builder (`instruction-builder.ts`)

Compose final agent prompt from:
- Base agent persona
- Specialized task template
- Available tools reflection
- Constraints + safety rules

```typescript
export async function buildAgentInstructions(
  task: string,
  context: BuildContext
): Promise<AgentInstructions> {
  const availableTools = await reflectMCPSchema('all');
  const basePrompt = await loadPrompt('agent-base.md');
  const specialization = detectSpecialization(task);
  const specializedPrompt = await loadPrompt(`${specialization}.md`);
  
  const final = compose(
    basePrompt,
    specializedPrompt,
    generateToolReference(availableTools),
    context.constraints
  );
  
  return {
    systemPrompt: final,
    availableTools,
    toolConstraints: buildConstraints(availableTools),
    recoveryStrategies: buildRecovery(availableTools)
  };
}
```

#### 3.4 CopilotKit Bridge (`copilot-kit-bridge.ts`)

Integrate with your orchestration layer:

```typescript
// When CopilotKit receives a user task:
// 1. Parse task semantics
// 2. Reflect available MCP tools
// 3. Generate specialized agent instructions
// 4. Route to appropriate GenUI layer (Static/Declarative/Open-Ended)

export function createAgentAction(
  task: string,
  tools: AvailableTools[]
): CopilotAction {
  const instructions = buildAgentInstructions(task, { tools });
  const genUIStrategy = selectGenUITier(task, tools);
  
  return {
    name: `agent:${task.split(' ')[0]}`,
    description: task,
    execute: async (input) => {
      const result = await orchestrate({
        systemPrompt: instructions.systemPrompt,
        tools: instructions.availableTools,
        strategy: genUIStrategy,
        input
      });
      return result;
    }
  };
}
```

---

## Integration Points

### With Your GenUI Architecture

```
User Task
    ↓
[Parser] → Detect specialization + available tools
    ↓
[Schema Reflection] → Connect to active MCP servers
    ↓
[Agent Specializer] → Build task-specific instructions
    ↓
[CopilotKit] → Route to appropriate GenUI tier
    ├→ Static GenUI (MUI Registry)
    ├→ Declarative GenUI (JSON Schemas)
    └→ Open-Ended GenUI (Sandboxed HTML/JS)
    ↓
[Execution] → Run with safety constraints
```

### With claude-prompts MCP

Your workspace can use **claude-prompts** as the orchestration layer:

```
MCP Registry → Generate Molecules
    ↓
Molecules → Reflect into Agent Instructions
    ↓
Agent Instructions → Feed into claude-prompts
    ├→ @CAGEERF analysis
    ├→ @ReACT debugging
    ├→ :: quality gates
    └→ → chained workflows
    ↓
[Output] → GenUI components + validated results
```

---

## Deliverables

### Phase 1: Registry Indexer (Week 1-2)
- [ ] `registry-fetcher.ts` — Parse MCP servers
- [ ] `schema-crawler.ts` — JSON Schema → Zod
- [ ] `molecule-generator.ts` — Wrap into higher-level components
- [ ] `agent-instructions.ts` — Emit dynamic prompts

### Phase 2: Devcontainer Integration (Week 2)
- [ ] Update `.devcontainer/devcontainer.json`
- [ ] Create `post-create-command.sh`
- [ ] Configure `mcp-servers/config.json`
- [ ] Document setup process

### Phase 3: Schema Reflection (Week 3)
- [ ] `schema-reflection.ts` — Runtime tool discovery
- [ ] `agent-specializer.ts` — Task-specific customization
- [ ] `instruction-builder.ts` — Compose final prompts
- [ ] `copilot-kit-bridge.ts` — Integration layer
- [ ] Test end-to-end with real MCP servers

### Phase 4: Validation (Week 4)
- [ ] E2E tests with devcontainer
- [ ] Agent instruction quality checks
- [ ] Performance profiling
- [ ] Documentation + examples

---

## Success Criteria

- ✅ MCP registry parsed → 15+ reference servers indexed
- ✅ Zod schemas generated → Type-safe tool calls
- ✅ Molecules created → 50+ higher-level components
- ✅ Devcontainer works → `npm run dev` → tools available
- ✅ Schema reflection live → Tools discovered at parse time
- ✅ Agent specialization → Task-specific instructions generated
- ✅ CopilotKit integration → Tools routed to correct GenUI tier
- ✅ End-to-end working → User describes task → Agent executes with right tools

---

## Notes

**Why this matters**: Your workspace shifts from "static tool set" to "dynamic, context-aware capability orchestration." Every task automatically gets the right tools, the right instructions, and the right UI tier.

**Integration with claude-prompts**: That MCP server (in the documents you shared) becomes your *orchestration substrate*. Its framework injection, gate system, and style control become how you guide agent behavior without hardcoding.

**Safety**: Schema reflection + dynamic instruction building means agents never hallucinate tools. Constraints are injected based on available APIs.

---

Next: Which phase should we tackle first?
