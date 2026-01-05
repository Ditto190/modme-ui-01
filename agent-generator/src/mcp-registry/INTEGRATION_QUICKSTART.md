# MCP Integration Quickstart

**Status**: Ready to implement  
**Timeline**: 3-4 weeks for full integration  
**Complexity**: High (requires coordination across agent-generator, devcontainer, CopilotKit)

---

## Your Three Immediate Priorities

### 1. Index MCP Registry in Agent Generator
**Goal**: Auto-discover MCP servers and generate type-safe schemas + Molecules

**Files Created**:
- `registry-fetcher.ts` — Fetch & parse MCP server catalog
- `schema-crawler.ts` — Transform JSON Schema → Zod + TypeScript
- `molecule-generator.ts` — Wrap raw tools into semantic components

**What Happens**:
```
MCP Servers (filesystem, git, web, postgres, thinking, etc.)
    ↓
registry-fetcher.ts → ServerSpec[] (structured catalog)
    ↓
schema-crawler.ts → Zod schemas + TypeScript interfaces
    ↓
molecule-generator.ts → Molecules (semantic wrappers)
    ↓
Agent Generator → Dynamic instructions that know about all available tools
```

**Next Step**: Integrate these three modules into your `apps/agent-generator/` workspace:

```bash
# 1. Copy files to workspace
cp registry-fetcher.ts packages/agent-generator/src/mcp-registry/
cp schema-crawler.ts packages/agent-generator/src/mcp-registry/
cp molecule-generator.ts packages/agent-generator/src/mcp-registry/

# 2. Create index file
touch packages/agent-generator/src/mcp-registry/index.ts

# 3. Build & test
npm run build --workspace=packages/agent-generator
npm test --workspace=packages/agent-generator
```

**Key Benefits**:
- ✅ No more hallucinated tools — agents only see what exists
- ✅ Type-safe tool calls via Zod validation
- ✅ Semantic "Molecules" instead of raw APIs
- ✅ Dynamic instruction generation based on available tools

---

### 2. Embed MCP Configuration in Devcontainer
**Goal**: Auto-provision MCP servers in devcontainer so Claude Code Desktop sees all tools

**What to Create**:
```
.devcontainer/
├── devcontainer.json (UPDATED)          ← Add mcp-servers config
├── post-create-command.sh (NEW)         ← Install MCP servers
├── mcp-servers/
│   ├── config.json (NEW)                ← MCP server definitions
│   └── install.sh (NEW)                 ← Setup script
└── docs/
    └── MCP_SETUP.md (NEW)               ← User guide
```

**devcontainer.json Changes**:
```json
{
  "remoteEnv": {
    "MCP_WORKSPACE": "${containerWorkspaceFolder}/.claude-prompts",
    "MCP_PROMPTS_PATH": "${containerWorkspaceFolder}/.claude-prompts/prompts",
    "MCP_GATES_PATH": "${containerWorkspaceFolder}/.claude-prompts/gates",
    "MCP_STYLES_PATH": "${containerWorkspaceFolder}/.claude-prompts/styles"
  },
  "postCreateCommand": "bash .devcontainer/post-create-command.sh"
}
```

**What Gets Installed**:
- `@modelcontextprotocol/server-filesystem`
- `@modelcontextprotocol/server-git`
- `@modelcontextprotocol/server-web`
- `@modelcontextprotocol/server-sequential-thinking`
- `@modelcontextprotocol/server-postgres`
- `claude-prompts` (your orchestration layer)

**When Developer Opens Workspace**:
1. Devcontainer initializes
2. `post-create-command.sh` runs
3. All MCP servers installed to `~/.mcp-servers`
4. claude-prompts configured with workspace paths
5. Claude Code Desktop automatically connects → tools available

**Key Benefits**:
- ✅ Zero-config for developers
- ✅ Works in GitHub Codespaces, VS Code Dev Containers, local Claude Code
- ✅ All tools pre-provisioned
- ✅ Environment variables set automatically

---

### 3. Reflect Tool Schemas Dynamically
**Goal**: At parse time, extract available tools and generate specialized agent instructions

**Architecture**:
```
User Task
    ↓
[Parser] → Detect task type (code generation, analysis, debugging, etc.)
    ↓
[Schema Reflection] → Connect to running MCP servers
    ↓
[Tool Discovery] → What tools are actually available?
    ↓
[Agent Specializer] → Build task-specific instructions
    ↓
[Instruction Builder] → Compose final system prompt
    ↓
Agent → Executes with knowledge of available tools
```

**Files to Create**:
```
apps/agent-generator/src/reflection/
├── schema-reflection.ts       ← Runtime tool discovery
├── agent-specializer.ts       ← Tailor prompts to available tools
└── instruction-builder.ts     ← Compose final instructions

apps/agent-generator/src/integration/
├── copilot-kit-bridge.ts      ← Connect to CopilotKit
└── genui-coordinator.ts       ← Route to GenUI tier
```

**Example Flow**:

```typescript
// User task: "Refactor this TypeScript component"
const task = "Refactor this TypeScript component";

// 1. Discover what's available
const availableTools = await reflectMCPSchema('all');
// → { filesystem: [...], git: [...], sequential-thinking: [...] }

// 2. Specialize the agent
const specializedInstructions = await buildAgentInstructions(task, {
  availableTools,
  constraints: ["Always run tests", "Confirm before pushing"]
});

// 3. Route to appropriate GenUI tier
const genUIStrategy = selectGenUITier(task, availableTools);
// → Detects: code editing needed → use Static GenUI (MUI)
//           git operations needed → use Declarative GenUI
//           complex analysis needed → use Open-Ended GenUI

// 4. Execute
const result = await orchestrate({
  systemPrompt: specializedInstructions,
  tools: availableTools,
  strategy: genUIStrategy
});
```

**Agent Instructions Generated** (example):
```markdown
# Code Refactoring Agent

You have access to these tools:
- **Code Editor** (filesystem) — Read/write TypeScript files
- **Git Workspace** (git) — Check status, diffs, branches
- **Sequential Analyzer** (thinking) — Plan refactoring steps
- **Test Runner** (shell) — Run tests

## Task
Refactor the TypeScript component for readability and performance.

## Approach
1. Use Sequential Analyzer to plan refactoring steps
2. Read current code with Code Editor
3. Make targeted changes
4. Run tests to validate
5. Commit with Git if all tests pass

## Safety Constraints
- Always show diffs before applying changes
- Run tests after each refactoring step
- Never delete code without confirmation
- Create feature branch for experimental changes
```

**Key Benefits**:
- ✅ Agent instructions match available capabilities
- ✅ No tool hallucinations (agent only sees real tools)
- ✅ Task-specific guidance
- ✅ Automatic GenUI tier selection

---

## Integration with claude-prompts

The **claude-prompts MCP server** (from the documents you shared) becomes your orchestration substrate:

```
MCP Schema Reflection
    ↓
Generate Agent Instructions
    ↓
Feed into claude-prompts → @CAGEERF (for analysis)
                       → @ReACT (for debugging)
                       → :: gates (for quality)
                       → --> chains (for multi-step)
    ↓
Output → GenUI components + validated results
```

**Example**:
```bash
# Agent with reflected tools + claude-prompts
prompt_engine(
  command: "@CAGEERF refactor_component code:'UserProfile.tsx' >> sequential_analyzer",
  gates: ["code-quality", "test-coverage"],
  tools: availableTools  # Dynamically populated from reflection
)
```

---

## Implementation Sequence

### Week 1: Registry Indexer (Phase 1)
- [ ] Integrate `registry-fetcher.ts` into agent-generator
- [ ] Implement `schema-crawler.ts` — generate Zod schemas
- [ ] Create `molecule-generator.ts` — define molecule library
- [ ] Test with canonical MCP servers
- [ ] Generate sample agent instructions

### Week 2: Devcontainer Integration (Phase 2)
- [ ] Update `.devcontainer/devcontainer.json`
- [ ] Create `post-create-command.sh`
- [ ] Configure `mcp-servers/config.json`
- [ ] Test devcontainer startup
- [ ] Document setup process

### Week 3: Schema Reflection (Phase 3)
- [ ] Implement `schema-reflection.ts`
- [ ] Build `agent-specializer.ts`
- [ ] Create `instruction-builder.ts`
- [ ] Test with running MCP servers
- [ ] Integrate with CopilotKit

### Week 4: Validation & Polish (Phase 4)
- [ ] E2E testing across all tiers
- [ ] Performance profiling
- [ ] Documentation + examples
- [ ] Create demo/example workspace

---

## Quick Testing

Once Phase 1 is complete:

```bash
# 1. Index available tools
npm run index:mcp-registry

# 2. Generate Zod schemas
npm run generate:zod-schemas

# 3. Create molecules
npm run generate:molecules

# 4. Test schema validation
npm test -- mcp-registry

# 5. See generated instructions
npm run show:agent-instructions
```

---

## File Structure (Complete)

```
apps/agent-generator/
├── src/
│   ├── mcp-registry/
│   │   ├── index.ts                    # Barrel export
│   │   ├── registry-fetcher.ts         # ← Fetch MCP servers
│   │   ├── schema-crawler.ts           # ← Generate Zod
│   │   ├── molecule-generator.ts       # ← Create molecules
│   │   └── agent-instructions.ts       # ← Build prompts
│   ├── reflection/
│   │   ├── schema-reflection.ts        # ← Runtime discovery
│   │   ├── agent-specializer.ts        # ← Task-specific guidance
│   │   └── instruction-builder.ts      # ← Compose final prompt
│   └── integration/
│       ├── copilot-kit-bridge.ts       # ← Connect to CopilotKit
│       └── genui-coordinator.ts        # ← Route to GenUI tier
├── prompts/
│   ├── agent-base.md                   # Core persona
│   ├── code-generation.md              # Specialized: coding
│   ├── analysis.md                     # Specialized: analysis
│   └── tool-discovery.md               # Teach about tools
└── package.json

.devcontainer/
├── devcontainer.json                   # ← Updated with MCP
├── post-create-command.sh              # ← Install servers
├── mcp-servers/
│   ├── config.json                     # ← Server definitions
│   └── install.sh                      # ← Setup script
└── docs/
    └── MCP_SETUP.md                    # ← User guide
```

---

## Key Success Metrics

✅ **By End of Week 1**:
- Registry indexed, Zod schemas generated, 15+ molecules defined
- Agent instructions mention available tools by name
- Tests pass for schema validation

✅ **By End of Week 2**:
- Devcontainer installs MCP servers automatically
- Claude Code Desktop sees tools without manual setup
- Environment variables set correctly

✅ **By End of Week 3**:
- Schema reflection works with running servers
- Agent instructions dynamically generated per task
- GenUI tier selection automatic

✅ **By End of Week 4**:
- Full E2E working: describe task → agent executes with right tools
- Documentation complete
- Example projects demonstrate capabilities

---

## Questions for You

1. **Which MCP servers are most critical?** Should we start with filesystem + git, or include postgres + web from day 1?

2. **How should errors be handled?** If MCP server crashes, should agent degrade gracefully or fail loudly?

3. **Performance constraints?** Should we cache schema reflection, or re-discover on every task?

4. **Integration timeline?** Can this live alongside existing agent system, or needs refactoring?

5. **Claude-prompts integration?** Should we use its framework + gates system, or just the tool orchestration?

---

## Next Action

Choose one:

**A) Start with Phase 1** (Registry Indexer)
→ Get comfortable with the schema-driven approach
→ Build foundation for phases 2-3

**B) Start with Phase 2** (Devcontainer)
→ Get immediate tooling benefits
→ Devcontainer ready for team use

**C) Start with Phase 3** (Schema Reflection)
→ If you want dynamic agent instructions first
→ Requires Phase 1 to be scaffolded

**My Recommendation**: **A → B → C** (sequential)

Ready to begin? 🚀
