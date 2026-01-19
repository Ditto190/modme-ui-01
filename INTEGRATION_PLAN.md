# Repository Integration Plan

**Date**: 2026-01-19
**Branch**: `claude/integrate-repo-suggestions-Y3Eyn`

## Analyzed Repositories

1. **Containarium** - Container management platform with MCP integration
2. **OpenWork** - Desktop AI agent workflow application
3. **Goose** - Autonomous AI agent for software development
4. **MCP-Use** - Full-stack Model Context Protocol framework

## Integration Summary

This plan integrates key patterns and features from the analyzed repositories into ModMe GenUI Workspace to enhance its capabilities as a GenUI R&D laboratory and AI-powered consulting platform.

---

## 1. MCP (Model Context Protocol) Integration

**Source**: mcp-use, Containarium, Goose

**Rationale**: MCP provides standardized communication between AI agents and tools, enabling interoperability and extensibility.

### Implementation Tasks

#### Backend (Python ADK Agent)
- Add MCP server implementation using `mcp-use` Python SDK
- Expose existing agent tools as MCP tools/resources
- Implement MCP protocol handlers (tools, resources, prompts)
- Add auto-discovery for MCP servers in toolset system
- Create adapter layer between ADK tools and MCP protocol

#### Frontend (Next.js)
- Add MCP client SDK for programmatic tool access
- Create UI for MCP server discovery and connection
- Integrate MCP tools into component registry
- Add MCP server status monitoring dashboard

### Files to Create/Modify
- `agent/mcp_server.py` (new) - MCP server implementation
- `agent/mcp_adapter.py` (new) - ADK-to-MCP adapter
- `src/lib/mcp-client.ts` (new) - MCP client SDK
- `src/components/registry/MCPServerCard.tsx` (new) - MCP status UI
- `agent/pyproject.toml` - Add mcp-use dependency

---

## 2. Permission Management System

**Source**: OpenWork

**Rationale**: Granular permission controls ensure safe AI agent operations, especially for sensitive client data and destructive actions.

### Implementation Tasks

- Create permission schema (file access, network, destructive operations)
- Implement permission request/approval workflow
- Add UI components for permission review and grant
- Integrate with existing agent tools to require permissions
- Persistent permission settings per session/project

### Files to Create/Modify
- `src/lib/permissions.ts` (new) - Permission types and schemas
- `src/components/registry/PermissionDialog.tsx` (new) - Permission UI
- `agent/permissions.py` (new) - Permission checking logic
- `agent/main.py` - Add permission decorators to tools
- `src/app/canvas/GenerativeCanvas.tsx` - Integrate permission dialogs

---

## 3. SSE (Server-Sent Events) Streaming

**Source**: OpenWork

**Rationale**: SSE provides better real-time updates than WebSocket for one-way server-to-client streaming, showing agent progress and intermediate results.

### Implementation Tasks

- Implement SSE endpoint in FastAPI agent server
- Create SSE client in Next.js frontend
- Stream agent tool execution progress
- Show intermediate thinking/reasoning steps
- Visual progress indicators for long-running operations

### Files to Create/Modify
- `agent/sse_handler.py` (new) - SSE streaming implementation
- `src/lib/sse-client.ts` (new) - SSE client utilities
- `src/components/registry/AgentProgress.tsx` (new) - Progress UI
- `agent/main.py` - Add SSE event emission to tools
- `src/app/api/sse/route.ts` (new) - Next.js SSE proxy

---

## 4. Skills Marketplace

**Source**: OpenWork

**Rationale**: Dynamic skill installation extends agent capabilities without code changes, aligning with existing toolset management system.

### Implementation Tasks

- Create skills registry/marketplace UI
- Implement skill installation from remote sources
- Integrate with existing `agent/toolsets.json` system
- Add skill versioning and dependency management
- Skill discovery and search functionality

### Files to Create/Modify
- `src/app/skills/page.tsx` (new) - Skills marketplace UI
- `src/components/registry/SkillCard.tsx` (new) - Skill display component
- `agent/skills_installer.py` (new) - Dynamic skill installation
- `agent/toolset_manager.py` - Integrate skill installation
- `public/skills-registry.json` (new) - Default skills catalog

---

## 5. Multi-Model LLM Support

**Source**: Goose

**Rationale**: Support multiple LLM providers (OpenAI, Anthropic, local models) for cost optimization and fallback strategies.

### Implementation Tasks

- Abstract LLM provider interface
- Add OpenAI GPT-4/GPT-4o support
- Add Anthropic Claude support
- Add local model support (Ollama, LM Studio)
- Model selection UI and configuration
- Cost tracking per model
- Automatic fallback on rate limits/errors

### Files to Create/Modify
- `agent/llm_providers.py` (new) - Multi-provider abstraction
- `agent/providers/openai.py` (new) - OpenAI integration
- `agent/providers/anthropic.py` (new) - Anthropic integration
- `agent/providers/local.py` (new) - Local model support
- `src/components/registry/ModelSelector.tsx` (new) - Model selection UI
- `.env.example` - Add API keys for new providers

---

## 6. Workflow Templates (Recipe System)

**Source**: Goose

**Rationale**: Template-based automation enables reusable workflows for common consulting tasks (data analysis, reporting, etc.).

### Implementation Tasks

- Define workflow/recipe schema
- Implement recipe execution engine
- Create library of default recipes (data analysis, report generation)
- Recipe editor UI
- Save/share custom recipes
- Integrate with existing toolset system

### Files to Create/Modify
- `agent/recipes.py` (new) - Recipe execution engine
- `agent/recipes/` (new directory) - Default recipe definitions
- `src/app/recipes/page.tsx` (new) - Recipe management UI
- `src/components/registry/RecipeCard.tsx` (new) - Recipe display
- `recipes/data-analysis.json` (new) - Sample recipes

---

## 7. Enhanced Session Management

**Source**: OpenWork

**Rationale**: Better session persistence enables recovery from crashes and multi-session workflows.

### Implementation Tasks

- Implement session persistence to SQLite
- Session history and replay
- Multi-session support (parallel workflows)
- Session import/export
- Session branching and merging

### Files to Create/Modify
- `agent/session_manager.py` (new) - Session persistence
- `data/sessions.db` (new) - Session storage (Git-ignored)
- `src/lib/session-client.ts` (new) - Session management client
- `src/components/registry/SessionManager.tsx` (new) - Session UI
- `agent/main.py` - Integrate session persistence

---

## 8. JWT Authentication

**Source**: Containarium

**Rationale**: Secure agent API endpoints for multi-user environments and remote access.

### Implementation Tasks

- Implement JWT token generation and validation
- Add authentication middleware to FastAPI
- Login/logout endpoints
- Token refresh mechanism
- Frontend token storage and management
- Optional: OAuth integration

### Files to Create/Modify
- `agent/auth.py` (new) - JWT authentication
- `agent/middleware/auth_middleware.py` (new) - Auth middleware
- `src/lib/auth-client.ts` (new) - Frontend auth utilities
- `src/components/registry/LoginForm.tsx` (new) - Login UI
- `.env.example` - Add JWT_SECRET

---

## 9. MCP Inspector UI

**Source**: mcp-use

**Rationale**: Debugging tool for visualizing MCP server connections, tool calls, and protocol messages.

### Implementation Tasks

- Create inspector dashboard
- Real-time MCP message logging
- Tool call visualization
- Resource inspection
- Protocol message viewer (request/response)

### Files to Create/Modify
- `src/app/inspector/page.tsx` (new) - Inspector dashboard
- `src/components/registry/MCPMessageViewer.tsx` (new) - Message viewer
- `src/components/registry/ToolCallGraph.tsx` (new) - Call graph visualization
- `agent/inspector_logger.py` (new) - Inspector event logging

---

## 10. Container Enhancement Research

**Source**: Containarium

**Rationale**: Evaluate LXC container integration as alternative/supplement to MicroSandbox.

### Implementation Tasks

- Document comparison: MicroSandbox vs LXC containers
- Prototype LXC integration for sandboxed execution
- Multi-tenant isolation patterns
- Cost/benefit analysis
- Optional: Add container management UI

**Note**: This is exploratory; may be deferred based on MicroSandbox capabilities.

---

## Implementation Priority

### Phase 1 (High Priority - Core Infrastructure)
1. MCP Server Integration (Backend)
2. SSE Streaming
3. Permission Management System
4. Multi-Model LLM Support

### Phase 2 (Medium Priority - User Experience)
5. Skills Marketplace
6. Workflow Templates
7. Enhanced Session Management
8. MCP Inspector UI

### Phase 3 (Low Priority - Security & Advanced)
9. JWT Authentication
10. Container Enhancement Research

---

## Testing Strategy

### Unit Tests
- Permission system logic
- JWT token generation/validation
- Recipe execution engine
- MCP adapter layer

### Integration Tests
- Frontend ↔ Backend SSE streaming
- MCP client ↔ MCP server communication
- Multi-model LLM switching
- Skill installation workflow

### Manual Testing
- Permission dialog UX
- Skills marketplace browsing
- Recipe creation and execution
- Inspector UI for debugging

---

## Documentation Updates

### Files to Update
- `CLAUDE.md` - Add new features and commands
- `README.md` - Update feature list
- `.copilot/knowledge/architecture.md` - Document new architecture
- `CODEBASE_INDEX.md` - Add new components
- Create `docs/MCP_INTEGRATION.md` - MCP usage guide
- Create `docs/PERMISSIONS.md` - Permission system guide
- Create `docs/MULTI_MODEL.md` - LLM provider configuration

---

## Dependencies to Add

### Python (agent/pyproject.toml)
```toml
mcp-use = "^0.3.0"           # MCP framework
pyjwt = "^2.8.0"              # JWT authentication
python-jose = "^3.3.0"        # JWT utilities
anthropic = "^0.25.0"         # Anthropic Claude SDK
openai = "^1.30.0"            # OpenAI SDK
```

### TypeScript (package.json)
```json
{
  "@modelcontextprotocol/sdk": "^0.5.0",
  "eventsource": "^2.0.2",
  "jwt-decode": "^4.0.0"
}
```

---

## Migration Notes

### Backward Compatibility
- All new features are opt-in
- Existing CopilotKit integration remains unchanged
- Permission system defaults to "auto-approve" for development
- MCP server runs alongside existing FastAPI routes

### Breaking Changes
- None anticipated; all integrations are additive

---

## Success Criteria

✅ MCP server exposes all existing agent tools
✅ Permission dialogs appear for destructive operations
✅ SSE streaming shows real-time agent progress
✅ Can switch between Gemini, GPT-4, and Claude models
✅ Skills marketplace allows one-click skill installation
✅ Workflows can be saved, edited, and replayed
✅ MCP Inspector shows all tool calls and messages
✅ All tests pass
✅ Documentation updated

---

## Timeline Estimate

**Note**: Per instructions, no specific timeline provided. Tasks are broken into actionable steps for user scheduling.

**Total Implementation Tasks**: ~40-50 discrete tasks
**Complexity**: Medium-High (new protocols, multiple integrations)
**Risk**: Low (additive changes, no breaking modifications)

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1 implementation
3. Incremental commits per feature
4. Create comprehensive PR with all changes
5. Update documentation
6. Test all integrations

---

**Plan Status**: ✅ Ready for Implementation
