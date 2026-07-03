# Inbox Pipeline Quality Report

Generated: 2026-06-28T08:30:10.030Z
Source: `inbox-audit`
Lens: **funnel**
Status: **FAIL**

## Summary

| Metric | Count |
|--------|-------|
| Files scanned | 42 |
| Errors | 49 |
| Warnings | 31 |
| Automatable | 49 |

## Automation

```powershell
yarn inbox:audit              # re-run audit
yarn inbox:fix                # preview safe fixes
yarn inbox:fix:apply          # apply safe fixes
yarn intake:orchestrate       # full pipeline
```

## Findings

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `0007-shopping-list-url-indexing-pipeline.adr.md`
- Filename does not match structured convention: 0007-shopping-list-url-indexing-pipeline.adr.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `ADR-GUIDE.md`
- Filename does not match structured convention: ADR-GUIDE.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `agent-catalogue-sync-plan.md`
- Filename does not match structured convention: agent-catalogue-sync-plan.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `aidosadev-awesomeaitools.md`
- Filename does not match structured convention: aidosadev-awesomeaitools.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `antigravity-library_walkthrough.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `antigravity-library_walkthrough.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `antigravity-library_walkthrough.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `antigravity-library_walkthrough.md`
- Filename does not match structured convention: antigravity-library_walkthrough.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `antigravitylibrary-implementation_plan.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `antigravitylibrary-implementation_plan.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `antigravitylibrary-implementation_plan.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `antigravitylibrary-implementation_plan.md`
- Filename does not match structured convention: antigravitylibrary-implementation_plan.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `awesome-voltagent-skills.md`
- Filename does not match structured convention: awesome-voltagent-skills.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `contextarch-init-workflow.md`
- Filename does not match structured convention: contextarch-init-workflow.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `copilot-27-06-triage-session.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `copilot-27-06-triage-session.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `copilot-27-06-triage-session.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `copilot-27-06-triage-session.md`
- Filename does not match structured convention: copilot-27-06-triage-session.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `discovery-manifest.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `discovery-manifest.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `discovery-manifest.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `discovery-manifest.md`
- Filename does not match structured convention: discovery-manifest.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `dynamic-agent-collection-pipeline-convo.md`
- Filename does not match structured convention: dynamic-agent-collection-pipeline-convo.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `gh-agentic_workflows.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `gh-agentic_workflows.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `gh-agentic_workflows.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `gh-agentic_workflows.md`
- Filename does not match structured convention: gh-agentic_workflows.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `gh-copilot-pricing-guide.md`
- Filename does not match structured convention: gh-copilot-pricing-guide.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `github-actions.md`
- Filename does not match structured convention: github-actions.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `github-aw-workflows-syntax.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `github-aw-workflows-syntax.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `github-aw-workflows-syntax.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `github-aw-workflows-syntax.md`
- Filename does not match structured convention: github-aw-workflows-syntax.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `github-workflows-agent.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `github-workflows-agent.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `github-workflows-agent.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `github-workflows-agent.md`
- Filename does not match structured convention: github-workflows-agent.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `hook_auto-commit_README.md`
- Filename does not match structured convention: hook_auto-commit_README.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `jetski-cortex.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `jetski-cortex.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `jetski-cortex.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `jetski-cortex.md`
- Filename does not match structured convention: jetski-cortex.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `lean-ctx-guide.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `lean-ctx-guide.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `lean-ctx-guide.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `lean-ctx-guide.md`
- Filename does not match structured convention: lean-ctx-guide.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `lean-ctx_appendix_cmd_map.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `lean-ctx_appendix_cmd_map.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `lean-ctx_appendix_cmd_map.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `lean-ctx_appendix_cmd_map.md`
- Filename does not match structured convention: lean-ctx_appendix_cmd_map.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `local-config.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `local-config.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `local-config.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `local-config.md`
- Filename does not match structured convention: local-config.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `lspmux_dx-ide.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `lspmux_dx-ide.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `lspmux_dx-ide.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `lspmux_dx-ide.md`
- Filename does not match structured convention: lspmux_dx-ide.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `next-forge-foundry-architecture.md`
- Filename does not match structured convention: next-forge-foundry-architecture.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `schema-skeleton-pattern.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `schema-skeleton-pattern.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `schema-skeleton-pattern.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `schema-skeleton-pattern.md`
- Filename does not match structured convention: schema-skeleton-pattern.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `SHOPPING-LIST-GUIDE.md`
- Filename does not match structured convention: SHOPPING-LIST-GUIDE.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `shopping-list.md`
- Filename does not match structured convention: shopping-list.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `skills-conversionTRAE.md`
- Filename does not match structured convention: skills-conversionTRAE.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `smart-auto-categorization.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `smart-auto-categorization.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `smart-auto-categorization.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `smart-auto-categorization.md`
- Filename does not match structured convention: smart-auto-categorization.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `the-plan.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `the-plan.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `the-plan.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `the-plan.md`
- Filename does not match structured convention: the-plan.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MISSING_TIMESTAMP (error)
- **File:** `w3c-specification-writer-agent.md`
- Missing required frontmatter.timestamp
- Fix: Set timestamp from file mtime (ISO 8601 UTC)

### INBOX.FM.MISSING_AGENT (error)
- **File:** `w3c-specification-writer-agent.md`
- Missing required frontmatter.agent
- Fix: Set agent: unknown

### INBOX.FM.MISSING_TYPE (error)
- **File:** `w3c-specification-writer-agent.md`
- Missing required frontmatter.type
- Fix: Infer type from filename prefix or use research

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `w3c-specification-writer-agent.md`
- Filename does not match structured convention: w3c-specification-writer-agent.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures

### INBOX.FM.MALFORMED_YAML (error)
- **File:** `winml-cli-overview.md`
- Frontmatter YAML could not be parsed
- Fix: Re-serialize frontmatter with gray-matter

### INBOX.FM.FILENAME_CONVENTION (warning)
- **File:** `winml-cli-overview.md`
- Filename does not match structured convention: winml-cli-overview.md
- Fix: Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures
