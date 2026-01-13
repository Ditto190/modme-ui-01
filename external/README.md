# External Tools & Repositories

> **Downloaded repositories for embedding experiments and lightweight agent runners**

**Date**: January 7, 2026  
**Purpose**: Explore integrating embeddings with minimal agent architectures

---

## 📦 Downloaded Repositories

### 1. genai-toolbox (Google)

**Source**: `https://github.com/googleapis/genai-toolbox.git`  
**Location**: `external/genai-toolbox/`  
**Language**: Go  
**Size**: ~631 MB (776k objects)

**What It Is**:

- MCP Toolbox for Databases (formerly "Gen AI Toolbox")
- Production-grade MCP server for database access
- Built-in connection pooling, auth, observability

**Key Features**:

- Simplified tool development for agents
- Database query tools (SQL, natural language)
- OpenTelemetry integration
- Connection pooling and auth
- Support for multiple databases

**Relevant Directories**:

- `internal/embeddingmodels/` - Embedding model integrations
- `internal/tools/` - 42 pre-built tools
- `internal/sources/` - 40+ data sources
- `internal/server/` - MCP server implementation

**Use Case**:

- Reference implementation for production MCP servers
- Embedding model patterns for database queries
- Tool architecture patterns

---

### 2. smallest-agent (obra)

**Source**: `https://github.com/obra/smallest-agent.git`  
**Location**: `external/smallest-agent/`  
**Language**: TypeScript/JavaScript  
**Size**: ~22 KB (66 objects)

**What It Is**:

- Minimal functional coding agent (803 bytes minified!)
- Self-optimized by Claude Code
- Demonstrates bare-minimum agent architecture

**Key Files**:

- `src/agent.ts` - Original Claude Code implementation (2,298 bytes)
- `src/smallest-agent.js` - Minified version (803 bytes)
- `src/smallest-agent.commented.js` - Readable annotated version (2,480 bytes)
- `HACKING-TRANSCRIPT.md` - 20-minute self-optimization session

**Dependencies**:

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.1"
  }
}
```

**⚠️ Warning**:

- Unrestricted bash access
- Can execute any command
- Experimental - use in sandboxed environments only

**Use Case**:

- Study minimal agent patterns
- Lightweight runner for embedding experiments
- Template for custom micro-agents

---

## 🎯 Integration Plan

### Experiment: Embedding-Aware Smallest Agent

**Goal**: Add semantic code search to smallest-agent using our journal-based embeddings

**Approach**:

1. **Copy smallest-agent template** to `experiments/embedded-agent/`
2. **Add embedding tools**:
   - Import `scripts/knowledge-management/embeddings/embeddings.ts`
   - Add semantic search capability
   - Query journal index for context
3. **Extend agent loop**:
   - Before executing bash commands, search codebase for similar patterns
   - Provide context from embedded code chunks
   - Use cosine similarity for relevance filtering
4. **Test**:
   - Ask agent to "refactor authentication middleware"
   - Agent searches embeddings for auth patterns
   - Agent proposes changes based on existing code style

### Experiment: Database Tool Embeddings (genai-toolbox patterns)

**Goal**: Learn from production MCP server architecture

**Study Areas**:

1. `internal/embeddingmodels/` - How they integrate embedding models
2. `internal/tools/` - Tool registration and orchestration
3. `internal/server/` - MCP server lifecycle management
4. Authentication patterns for secure tool access

**Apply To**:

- Our `agent/main.py` tool registration
- Toolset management system
- MCP VT Code integration patterns

---

## 📁 Directory Structure

```
external/
├── README.md                          # This file
├── genai-toolbox/                     # Google MCP Toolbox (Go)
│   ├── internal/
│   │   ├── embeddingmodels/          # Embedding integrations
│   │   ├── tools/                    # 42 pre-built tools
│   │   ├── sources/                  # Data source connectors
│   │   └── server/                   # MCP server core
│   ├── README.md
│   └── server.json
│
├── smallest-agent/                    # obra's minimal agent (TypeScript)
│   ├── src/
│   │   ├── agent.ts                  # Original implementation
│   │   ├── smallest-agent.js         # 803-byte minified
│   │   └── smallest-agent.commented.js
│   ├── package.json
│   └── README.md
│
└── private-journal-mcp/               # Journal MCP (already cloned)
    └── src/
        └── index.ts
```

---

## 🚀 Quick Start

### Run smallest-agent

```bash
cd external/smallest-agent
npm install
npm run build
npm start
```

### Explore genai-toolbox

```bash
cd external/genai-toolbox

# View available tools
ls internal/tools/

# Check embedding models
ls internal/embeddingmodels/

# Read documentation
cat README.md
```

### Create Embedding-Aware Agent Experiment

```bash
# Copy smallest-agent as template
mkdir -p experiments/embedded-agent
cp -r external/smallest-agent/src experiments/embedded-agent/

# Add embedding imports
cd experiments/embedded-agent
npm init -y
npm install @anthropic-ai/sdk @xenova/transformers

# Start customizing agent.ts to include semantic search
```

---

## 🔗 Related Files

- **Journal Embeddings**: `scripts/knowledge-management/embeddings/`
- **Journal CLI**: `scripts/journal/journal-cli.py`
- **Code Indexing Skill**: `agent-generator/src/skills/code-indexing/SKILL.md`
- **Workflow**: `.github/workflows/journal-code-index.yml`

---

## 📖 Resources

### genai-toolbox

- **Docs**: <https://googleapis.github.io/genai-toolbox/>
- **Discord**: <https://discord.gg/Dmm69peqjh>
- **Medium**: <https://medium.com/@mcp_toolbox>
- **GitHub**: <https://github.com/googleapis/genai-toolbox>

### smallest-agent

- **GitHub**: <https://github.com/obra/smallest-agent>
- **Author**: @obra
- **Hacking Transcript**: See `HACKING-TRANSCRIPT.md` for self-optimization story

---

**Next Steps**:

1. Study `smallest-agent/src/agent.ts` architecture
2. Review `genai-toolbox/internal/embeddingmodels/` patterns
3. Create proof-of-concept: smallest-agent + semantic code search
4. Test with our journal-based embeddings
5. Document findings and propose integration patterns

---

**Maintained by**: ModMe GenUI Team  
**Last Updated**: January 7, 2026
