# MCP Integration Implementation Checklist

**Timeline**: 4 weeks | **Complexity**: High | **Team Size**: 1-2 developers

---

## Phase 1: Registry Indexer (Week 1) â€” Registry & Schema Generation

### Setup (Day 1)
- [ ] Review `MCP_INTEGRATION_PLAN.md` (focus on Part 1)
- [ ] Review `registry-fetcher.ts`, `schema-crawler.ts`, `molecule-generator.ts`
- [ ] Create workspace directory structure:
  ```bash
  mkdir -p apps/agent-generator/src/mcp-registry/__tests__
  mkdir -p apps/agent-generator/src/reflection
  mkdir -p apps/agent-generator/src/integration
  ```
- [ ] Create `package.json` for agent-generator workspace if missing
- [ ] Ensure dependencies installed: `npm install zod`

### Implementation (Days 2-3)
- [ ] Copy `registry-fetcher.ts` â†’ `apps/agent-generator/src/mcp-registry/`
- [ ] Copy `schema-crawler.ts` â†’ `apps/agent-generator/src/mcp-registry/`
- [ ] Copy `molecule-generator.ts` â†’ `apps/agent-generator/src/mcp-registry/`
- [ ] Create barrel export `index.ts`:
  ```typescript
  export * from './registry-fetcher';
  export * from './schema-crawler';
  export * from './molecule-generator';
  ```
- [ ] Create `tsconfig.json` if missing (enable strict mode)
- [ ] Build: `npm run build --workspace=apps/agent-generator`
- [ ] Fix any TypeScript errors

### Testing (Days 3-4)
- [ ] Create `__tests__/registry.test.ts`:
  ```typescript
  import { fetchMCPRegistry, getServersByCategory } from '../registry-fetcher';
  
  test('fetches and validates registry', async () => {
    const registry = await fetchMCPRegistry();
    expect(registry.servers.length).toBeGreaterThan(0);
    expect(registry.servers[0].id).toBeDefined();
  });
  ```
- [ ] Create `__tests__/schema.test.ts`:
  ```typescript
  import { generateZodFromJSONSchema } from '../schema-crawler';
  
  test('generates Zod from JSON Schema', () => {
    const schema = { type: 'string', minLength: 5 };
    const result = generateZodFromJSONSchema(schema, 'TestType');
    expect(result.zodCode).toContain('z.string()');
  });
  ```
- [ ] Create `__tests__/molecules.test.ts`:
  ```typescript
  import { generateMoleculesFromTools } from '../molecule-generator';
  
  test('generates molecules from tools', () => {
    const tools = []; // empty for now
    const molecules = generateMoleculesFromTools(tools);
    expect(molecules.length).toBeGreaterThan(0);
  });
  ```
- [ ] Run tests: `npm test --workspace=apps/agent-generator`
- [ ] Verify all pass
- [ ] Create `npm run generate:zod` script to generate schemas on demand

### Integration (Day 5)
- [ ] Create `agent-instructions.ts` (emit dynamic prompts)
- [ ] Test with sample server specs
- [ ] Generate agent instructions for a sample task
- [ ] Document output format
- [ ] Create example usage in README

### Validation (Day 5)
- [ ] **Checklist**:
  - [ ] Registry fetches without errors
  - [ ] Zod schemas validate correctly
  - [ ] TypeScript types compile
  - [ ] Molecules have semantic names
  - [ ] Agent instructions are readable
  - [ ] All tests pass
  - [ ] Build completes cleanly
- [ ] **Deliverable**: `apps/agent-generator/src/mcp-registry/` fully functional

---

## Phase 2: Devcontainer Integration (Week 2) â€” Auto-Provisioning

### Design (Day 1)
- [ ] Review `INTEGRATION_QUICKSTART.md` (Phase 2 section)
- [ ] Review `ARCHITECTURE_DIAGRAM.md` (devcontainer section)
- [ ] Understand current `.devcontainer/devcontainer.json`
- [ ] Plan modifications needed

### Update devcontainer.json (Day 2)
- [ ] Backup existing `devcontainer.json`
- [ ] Add MCP server environment variables:
  ```json
  "remoteEnv": {
    "MCP_WORKSPACE": "${containerWorkspaceFolder}/.claude-prompts",
    "MCP_PROMPTS_PATH": "${containerWorkspaceFolder}/.claude-prompts/prompts",
    "MCP_GATES_PATH": "${containerWorkspaceFolder}/.claude-prompts/gates",
    "MCP_STYLES_PATH": "${containerWorkspaceFolder}/.claude-prompts/styles"
  }
  ```
- [ ] Add post-create command:
  ```json
  "postCreateCommand": "bash .devcontainer/post-create-command.sh"
  ```
- [ ] Verify JSON syntax is valid

### Create Installation Scripts (Day 2-3)
- [ ] Create `.devcontainer/post-create-command.sh`:
  ```bash
  #!/bin/bash
  set -e
  
  echo "ðŸš€ Setting up Ditto Workspace..."
  npm install --workspace=apps/*
  npm run build --workspace=apps/agent-generator
  
  mkdir -p ~/.mcp-servers
  cd ~/.mcp-servers
  npm install \
    @modelcontextprotocol/server-filesystem \
    @modelcontextprotocol/server-git \
    @modelcontextprotocol/server-web \
    @modelcontextprotocol/server-sequential-thinking \
    @modelcontextprotocol/server-postgres
  
  npm install -g claude-prompts
  mkdir -p ~/.claude-prompts/{gates,styles,prompts}
  
  echo "âœ… Setup complete!"
  ```
- [ ] Make script executable: `chmod +x .devcontainer/post-create-command.sh`
- [ ] Create `.devcontainer/mcp-servers/config.json`:
  ```json
  {
    "mcpServers": {
      "filesystem": { ... },
      "git": { ... },
      "web": { ... },
      "sequential-thinking": { ... },
      "postgres": { ... },
      "claude-prompts": { ... }
    },
    "transport": "stdio"
  }
  ```

### Testing (Day 3-4)
- [ ] **Local test** (VS Code Dev Container):
  ```bash
  # Reopen in Container
  # Wait for post-create to complete
  # Verify: ls ~/.mcp-servers/node_modules
  ```
- [ ] **Codespaces test** (if available):
  ```bash
  # Create codespace from repo
  # Wait for devcontainer to initialize
  # Check that MCP servers installed
  ```
- [ ] Verify environment variables set:
  ```bash
  echo $MCP_WORKSPACE
  echo $MCP_PROMPTS_PATH
  ```
- [ ] Test Claude Code Desktop connection (if available)

### Documentation (Day 4-5)
- [ ] Create `.devcontainer/docs/MCP_SETUP.md`:
  - Quick start guide
  - Troubleshooting section
  - Architecture overview
- [ ] Update main README with devcontainer instructions
- [ ] Create troubleshooting guide for common issues

### Validation (Day 5)
- [ ] **Checklist**:
  - [ ] devcontainer.json is valid JSON
  - [ ] post-create-command.sh is executable
  - [ ] Local devcontainer initialization works
  - [ ] All MCP servers install without errors
  - [ ] Environment variables set correctly
  - [ ] Claude Code Desktop can see tools
  - [ ] Documentation is complete
- [ ] **Deliverable**: `.devcontainer/` fully configured and tested

---

## Phase 3: Schema Reflection & Specialization (Week 3) â€” Dynamic Instructions

### Architecture Review (Day 1)
- [ ] Review `ARCHITECTURE_DIAGRAM.md` (Part 3 section)
- [ ] Review `MCP_INTEGRATION_PLAN.md` (Part 3 section)
- [ ] Understand CopilotKit integration points
- [ ] Identify GenUI tier selection logic

### Implement Schema Reflection (Day 2-3)
- [ ] Create `src/reflection/schema-reflection.ts`:
  ```typescript
  export async function reflectMCPSchema(serverName: string): Promise<MCPToolSet> {
    // Connect to running MCP server
    // Query available tools
    // Return structured tool definitions
  }
  ```
- [ ] Test with a running MCP server
- [ ] Verify schema extraction works
- [ ] Handle connection errors gracefully

### Implement Agent Specializer (Day 3-4)
- [ ] Create `src/reflection/agent-specializer.ts`:
  ```typescript
  export function specializeAgent(
    baseInstructions: string,
    availableTools: AvailableTools[],
    task: string,
    constraints: string[]
  ): string {
    // Determine task specialization
    // Filter relevant tools
    // Inject capabilities and constraints
    // Return specialized prompt
  }
  ```
- [ ] Create prompt templates:
  - `prompts/agent-base.md` (core persona)
  - `prompts/code-generation.md` (for coding tasks)
  - `prompts/analysis.md` (for analysis tasks)
  - `prompts/tool-discovery.md` (educational)
- [ ] Test specialization with various tasks

### Implement Instruction Builder (Day 4)
- [ ] Create `src/reflection/instruction-builder.ts`:
  ```typescript
  export async function buildAgentInstructions(
    task: string,
    context: BuildContext
  ): Promise<AgentInstructions> {
    // Discover available tools
    // Load appropriate template
    // Specialize for task
    // Add constraints
    // Return final instructions
  }
  ```
- [ ] Test composition of all components

### Integration with CopilotKit (Day 4-5)
- [ ] Create `src/integration/copilot-kit-bridge.ts`:
  - Connect schema reflection to CopilotKit
  - Route to appropriate GenUI tier
  - Execute with specialized instructions
- [ ] Create `src/integration/genui-coordinator.ts`:
  - Static GenUI (MUI) for code editing
  - Declarative GenUI (JSON) for configs
  - Open-Ended GenUI (HTML) for complex analysis

### Testing (Day 5)
- [ ] **Unit tests**: Each component independently
- [ ] **Integration tests**: Schema reflection + specializer + builder
- [ ] **E2E tests**: Full flow from task to agent execution
- [ ] Test with multiple task types:
  - Code generation
  - Debugging
  - Analysis
  - Refactoring
  - Testing

### Validation (Day 5)
- [ ] **Checklist**:
  - [ ] Schema reflection discovers all running tools
  - [ ] Agent specializer generates task-specific instructions
  - [ ] Instruction builder composes complete prompts
  - [ ] CopilotKit integration works
  - [ ] GenUI tier selection automatic
  - [ ] All tests pass
  - [ ] Error handling is robust
- [ ] **Deliverable**: `src/reflection/` and `src/integration/` fully functional

---

## Phase 4: Validation & Documentation (Week 4) â€” Polish & Release

### E2E Testing (Days 1-2)
- [ ] Set up test workspace
- [ ] Create test suite covering:
  - [ ] Registry discovery
  - [ ] Schema generation
  - [ ] Molecule creation
  - [ ] Devcontainer provisioning
  - [ ] Schema reflection
  - [ ] Agent specialization
  - [ ] Complete workflow (task â†’ execution)
- [ ] Test across all platforms:
  - [ ] Local devcontainer
  - [ ] GitHub Codespaces
  - [ ] CI/CD pipeline
- [ ] Test with real MCP servers running
- [ ] Verify all tool validations work

### Performance Profiling (Day 2)
- [ ] Measure schema reflection time
- [ ] Measure instruction generation time
- [ ] Identify bottlenecks
- [ ] Optimize if needed (caching, lazy loading)
- [ ] Document performance metrics

### Documentation (Days 2-3)
- [ ] Create comprehensive README:
  - [ ] Architecture overview
  - [ ] Installation instructions
  - [ ] Usage examples
  - [ ] Troubleshooting guide
  - [ ] Contributing guide
- [ ] Create API documentation:
  - [ ] registry-fetcher
  - [ ] schema-crawler
  - [ ] molecule-generator
  - [ ] schema-reflection
  - [ ] instruction-builder
- [ ] Create user guides:
  - [ ] For developers (how to use workspace)
  - [ ] For LLM agents (tool reference)
  - [ ] For DevOps (deployment options)
- [ ] Update existing documentation

### Demo & Examples (Days 3-4)
- [ ] Create example projects:
  - [ ] Simple CLI tool
  - [ ] Code refactoring task
  - [ ] Multi-step workflow
- [ ] Create demo video (optional)
- [ ] Create blog post (optional)
- [ ] Prepare presentation slides (optional)

### Final Review (Day 4-5)
- [ ] **Code Review**:
  - [ ] All TypeScript strict mode
  - [ ] All tests passing
  - [ ] No console errors
  - [ ] No security issues
  - [ ] Follow team conventions
- [ ] **Documentation Review**:
  - [ ] Complete and accurate
  - [ ] Examples runnable
  - [ ] No broken links
  - [ ] Good formatting
- [ ] **Security Review**:
  - [ ] No hardcoded secrets
  - [ ] Input validation correct
  - [ ] Error messages safe
  - [ ] No privilege escalation
- [ ] **Performance Review**:
  - [ ] Response times acceptable
  - [ ] Memory usage reasonable
  - [ ] No resource leaks

### Release Preparation (Day 5)
- [ ] Tag version: `npm version <major|minor|patch>`
- [ ] Update CHANGELOG
- [ ] Create release notes
- [ ] Push to repository
- [ ] Create GitHub release
- [ ] Announce to team

### Validation (Day 5)
- [ ] **Checklist**:
  - [ ] All tests pass
  - [ ] E2E flows work end-to-end
  - [ ] Performance acceptable
  - [ ] Documentation complete
  - [ ] Examples runnable
  - [ ] Code reviewed
  - [ ] Security cleared
  - [ ] Ready for production
- [ ] **Deliverable**: Complete, tested, documented system ready for team

---

## Success Criteria (Final Check)

### Phase 1 âœ…
- [ ] MCP registry indexed (15+ servers)
- [ ] Zod schemas generated and validated
- [ ] 50+ semantic molecules defined
- [ ] Agent instructions readable and useful
- [ ] Tests: 100% passing

### Phase 2 âœ…
- [ ] Devcontainer auto-installs MCP servers
- [ ] Works locally in VS Code
- [ ] Works in GitHub Codespaces
- [ ] Environment variables set correctly
- [ ] Claude Code Desktop detects tools

### Phase 3 âœ…
- [ ] Schema reflection discovers running tools
- [ ] Agent instructions dynamically generated
- [ ] GenUI tier selection automatic
- [ ] CopilotKit integration complete
- [ ] E2E flow works end-to-end

### Phase 4 âœ…
- [ ] All tests passing
- [ ] Performance metrics documented
- [ ] Comprehensive documentation
- [ ] Example projects working
- [ ] Team trained and ready

---

## During Implementation: Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| TypeScript errors on import | Check `tsconfig.json` has `"strict": true` |
| Devcontainer won't initialize | Check `post-create-command.sh` permissions and syntax |
| MCP servers fail to install | Check Node.js version (need â‰¥20) |
| Schema reflection fails | Ensure MCP server is running and accessible |
| Agent instructions too long | Truncate or summarize less relevant tools |
| GenUI tier selection wrong | Check task detection logic |

---

## Weekly Standup Template

```
Week {1-4} Summary:
- âœ… Completed: ...
- ðŸ”„ In Progress: ...
- âš ï¸ Blocked: ...
- ðŸ“Š Metrics:
  - Tests passing: X/X
  - Code coverage: X%
  - Performance: X ms average
- ðŸŽ¯ Next week: ...
```

---

## Final Deliverables Checklist

By end of Week 4:
- [ ] âœ… Phase 1: Registry indexing + schema generation
- [ ] âœ… Phase 2: Devcontainer auto-provisioning
- [ ] âœ… Phase 3: Schema reflection + dynamic instructions
- [ ] âœ… Phase 4: Complete documentation + examples
- [ ] âœ… 100% test coverage on core modules
- [ ] âœ… Zero critical/high security issues
- [ ] âœ… Ready for team rollout

---

## Next Steps After Completion

1. **Team Training**: Show team how to use the system
2. **Gradual Rollout**: Start with pilot team, expand slowly
3. **Gather Feedback**: Iterate based on real usage
4. **Continuous Improvement**: Monitor and enhance
5. **Document Learnings**: Capture best practices

---

**Good luck! ðŸš€**

Questions during implementation? Refer back to:
- `MCP_INTEGRATION_PLAN.md` for architecture details
- `ARCHITECTURE_DIAGRAM.md` for visual reference
- This checklist for task tracking

You've got this!