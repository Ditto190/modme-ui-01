<!--
SYNC IMPACT REPORT
==================
Version Change: TEMPLATE (unversioned) → 1.0.0 (initial ratification)
Constitution Type: Initial establishment from template
Date: 2026-01-05

Principles Established:
- I. One-Way State Flow (Python → React)
- II. Type Contract Discipline
- III. Validation & Safety
- IV. Component-First Architecture
- V. Testing & Observability
- VI. Toolset Management
- VII. Documentation Currency

Sections Added:
- Core Principles (7 principles)
- Technical Standards
- Security & Performance
- Governance

Templates Requiring Updates:
✅ plan-template.md - Constitution Check section references correct principles
✅ spec-template.md - Requirements align with state flow and type safety
✅ tasks-template.md - Task categories reflect validation, testing, toolset management
⚠ Command files (.specify/templates/commands/*.md) - Require review for consistency

Follow-up TODOs:
- Review command templates for alignment with new principles
- Add constitution compliance checks to CI/CD workflows
- Create developer onboarding guide referencing constitution
-->

# ModMe GenUI Workbench Constitution

## Core Principles

### I. One-Way State Flow (NON-NEGOTIABLE)

State MUST flow in a single direction: Python agent writes → React reads. React components MUST NEVER mutate agent state directly.

**Rationale**: The dual-runtime architecture (Python ADK agent on port 8000, React UI on port 3000) requires strict unidirectional data flow to prevent race conditions, inconsistent state, and debugging nightmares. Bidirectional sync introduces complexity that violates the GenUI orchestration model.

**Enforcement**:

- All state mutations MUST occur through Python `tool_context.state` writes
- React components MUST use `useCoAgent` in read-only mode
- Any attempt to call `setState` on agent state MUST be rejected in code review
- TypeScript types MUST NOT expose state mutation methods to React components

### II. Type Contract Discipline

Python state dictionaries and TypeScript interfaces MUST maintain exact key parity. Component type strings MUST match precisely between agent tools and React switch statements.

**Rationale**: Cross-language type safety is achieved through disciplined naming conventions. Key mismatches (`"component_id"` in Python vs `"id"` in TypeScript) break the runtime contract and cause silent failures.

**Enforcement**:

- Every Python `tool_context.state["elements"]` structure MUST have a corresponding TypeScript interface in `src/lib/types.ts`
- Component type validation MUST use `ALLOWED_TYPES` whitelist in `agent/main.py`
- Python `"StatCard"` MUST match TypeScript `case "StatCard"` exactly (PascalCase)
- All prop keys MUST be JSON-serializable (no functions, no circular references)
- Breaking changes to state contracts MUST increment MAJOR version

### III. Validation & Safety

All user inputs, agent outputs, and component props MUST be validated before use. Runtime validation MUST use Zod schemas; agent tools MUST validate all parameters.

**Rationale**: Generative UI introduces XSS, injection, and type coercion risks. Runtime validation is the last line of defense against hallucinated data, malformed props, and security vulnerabilities.

**Enforcement**:

- Every agent tool MUST validate inputs and return structured `{"status": "success"|"error", "message": "..."}` dicts
- Every React component accepting dynamic props MUST validate with Zod `.safeParse()`
- All string inputs MUST be sanitized (HTML escape, regex validation)
- Component types MUST be checked against whitelists before rendering
- Invalid data MUST render error fallbacks, never silent failures

### IV. Component-First Architecture

UI generation MUST prioritize the component registry over open-ended HTML/JS. New component types MUST be added to the registry before use.

**Rationale**: Curated components ensure consistency, accessibility, testability, and security. Open-ended code generation is a last resort for edge cases outside the registry vocabulary.

**Enforcement**:

- Agent prompts MUST list available component types (`StatCard`, `DataTable`, `ChartCard`)
- New component requests MUST follow: design → registry PR → agent instruction update → use
- Components MUST be independently testable with React Testing Library
- MUI/Tailwind tokens MUST be used for theming consistency
- Sandboxed open-ended UI MUST be isolated in iframes with strict CSP

### V. Testing & Observability

Tests MUST be written before implementation (TDD). All agent tool calls MUST log inputs/outputs. ChromaDB MUST index semantic code for retrieval.

**Rationale**: Generative UI systems are inherently non-deterministic. Observability and testing are the only ways to ensure reliability and debuggability at scale.

**Enforcement**:

- Agent tools MUST have unit tests with mocked `ToolContext`
- React components MUST have tests covering valid props, invalid props, and edge cases
- `/health` and `/ready` endpoints MUST report system state and dependency health
- ChromaDB ingestion MUST run on code changes (see `.github/workflows/build-code-index.yml`)
- Structured logging MUST be used (JSON format, log levels: DEBUG, INFO, WARNING, ERROR)

### VI. Toolset Management

Toolsets MUST be registered in `agent/toolsets.json` with JSON schema validation. Deprecated tools MUST maintain backward-compatible aliases for 180 days.

**Rationale**: As the agent ecosystem grows, toolset sprawl degrades discoverability and maintainability. Structured registration, versioning, and deprecation prevent breakage.

**Enforcement**:

- New tools MUST be detected with `npm run detect:changes`
- Toolsets MUST validate against `agent/toolset-schema.json`
- Deprecations MUST create entries in `agent/toolset_aliases.json` with removal dates
- Migration guides MUST be auto-generated for all deprecations
- Breaking changes MUST increment toolset version (semantic versioning)

### VII. Documentation Currency

All documentation MUST be updated within the same PR as code changes. Generated docs (schemas, diagrams) MUST be regenerated before merge.

**Rationale**: Stale docs are worse than no docs. In a dual-runtime system with multiple runtimes, templates, and toolsets, docs are the source of truth for cross-cutting concerns.

**Enforcement**:

- README changes MUST accompany feature additions
- `.github/copilot-instructions.md` MUST reflect current architecture
- Schema diagrams (`docs/toolsets/toolset-relationships.mmd`) MUST be regenerated with `npm run docs:diagram:svg`
- All `TODO(<FIELD>)` placeholders in docs MUST be resolved or justified
- Codebase index (`CODEBASE_INDEX.md`) MUST be updated quarterly or on major structural changes

## Technical Standards

### Node.js & Python Versions

**Node.js**: 22.9.0+ (REQUIRED). Earlier versions cause EBADENGINE errors and compatibility issues.
**Python**: 3.12+ (REQUIRED). Required for Google ADK agent, ChromaDB, and FastMCP features.

**Enforcement**:

- DevContainer and setup scripts MUST enforce version checks
- CI workflows MUST fail on unsupported versions
- Version mismatches MUST be documented in troubleshooting sections

### Dependency Management

**Node.js**: pnpm, npm, yarn, or bun (developer choice). Lock files MUST be git-ignored to avoid conflicts.
**Python**: `uv` (preferred) or `pip`. Virtual environments MUST be used (`.venv/`).

**Enforcement**:

- `.gitignore` MUST exclude all lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`)
- Setup scripts MUST create Python virtual environments
- Dependencies MUST be pinned in `package.json` (Node.js) and `pyproject.toml` (Python)

### Environment Configuration

Secrets MUST be stored in `.env` (git-ignored). `.env.example` MUST document all required variables.

**Required Secrets**:

- `GOOGLE_API_KEY` - For Google Gemini ADK agent (required)
- `COPILOT_CLOUD_API_KEY` - Optional CopilotKit cloud features
- `GITHUB_PERSONAL_ACCESS_TOKEN` - For GitHub MCP server (optional)

**Enforcement**:

- Setup scripts MUST copy `.env.example` to `.env` if missing
- Missing `GOOGLE_API_KEY` MUST prevent agent startup with clear error message
- Secrets MUST NEVER be committed (`.gitignore` enforcement)

## Security & Performance

### Security Requirements

1. **Input Sanitization**: All user inputs MUST be sanitized (HTML escape, regex validation) before rendering
2. **Sandbox Isolation**: Open-ended HTML/JS MUST be rendered in iframes with `sandbox` attributes and CSP
3. **Component Whitelisting**: Only registered component types MUST be renderable
4. **Secret Management**: Secrets MUST be stored in `.env`, never hardcoded
5. **Dependency Auditing**: `npm audit` and `pip-audit` MUST run in CI, vulnerabilities MUST be addressed

### Performance Standards

1. **Agent Response Time**: `/health` and `/ready` endpoints MUST respond <500ms
2. **UI Rendering**: Component registry components MUST render within 100ms of state update
3. **ChromaDB Indexing**: Code indexing MUST complete within 5 minutes for typical repo size
4. **Memory Constraints**: Python agent MUST stay under 1GB RAM; React UI under 500MB
5. **Network Efficiency**: Agent ↔ UI communication MUST batch state updates (avoid per-element calls)

**Enforcement**:

- Performance benchmarks MUST be established for critical paths
- Load testing MUST be performed before production deployment
- Memory leaks MUST be profiled and resolved

## Governance

### Constitutional Authority

This constitution supersedes all other development practices, coding guidelines, and legacy patterns. In case of conflict, constitution principles take precedence.

### Amendment Process

1. **Proposal**: Open GitHub issue with `constitution-amendment` label
2. **Justification**: Document rationale, affected systems, migration path
3. **Review Period**: Minimum 7 days for community feedback
4. **Approval**: Requires approval from at least 2 maintainers
5. **Implementation**: Update constitution, propagate to templates, update version
6. **Communication**: Announce in README, CHANGELOG, and team channels

### Version Bumping

Constitution follows semantic versioning:

- **MAJOR**: Principle removal/redefinition, breaking governance changes
- **MINOR**: New principle added, section materially expanded
- **PATCH**: Clarifications, wording fixes, non-semantic updates

### Compliance Review

1. **PR Review**: All PRs MUST pass constitution compliance checks
2. **Quarterly Audit**: Maintainers MUST review adherence quarterly
3. **Violation Reporting**: Violations MUST be reported via GitHub issues
4. **Remediation**: Violations MUST be resolved within 30 days or justified in writing

### Runtime Guidance

For day-to-day development guidance beyond these principles, see `.github/copilot-instructions.md`. That file provides tactical patterns, command references, and troubleshooting.

**Version**: 1.0.0 | **Ratified**: 2026-01-05 | **Last Amended**: 2026-01-05
