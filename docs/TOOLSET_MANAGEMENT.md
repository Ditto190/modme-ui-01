# GitHub MCP Toolset Management Guide

## Overview

This document describes the automated CI/CD workflows for managing GitHub MCP server toolsets in this repository. These workflows handle adding new toolsets, deprecating old ones, maintaining backward compatibility through aliases, and keeping documentation synchronized.

## Table of Contents

1. [Architecture](#architecture)
2. [Workflow Components](#workflow-components)
3. [Adding New Toolsets](#adding-new-toolsets)
4. [Deprecating Toolsets](#deprecating-toolsets)
5. [Testing & Validation](#testing--validation)
6. [Troubleshooting](#troubleshooting)

---

## Architecture

### Key Concepts

Based on the GitHub MCP server architecture, toolsets are managed through:

- **Toolset Definitions**: Located in `agent/main.py` or similar configuration
- **Toolset Aliases**: Maps old toolset names to new canonical names (similar to `DeprecatedToolAliases`)
- **MCP Configuration**: User-level config at `%APPDATA%\Code\User\mcp.json` or workspace `.vscode/mcp.json`
- **GitHub Actions**: Automated workflows for lifecycle management

### Workflow Triggers

All workflows are triggered by:

- **Push to main branch**: When toolset changes are merged
- **Manual dispatch**: For on-demand operations
- **Pull request**: For validation before merge

---

## Workflow Components

### 1. Toolset Update Workflow (`.github/workflows/toolset-update.yml`)

**Purpose**: Automatically detect and register new toolsets when tools/features are added.

**Triggers**:

- Push to `main` branch with changes to agent toolset definitions
- Manual workflow dispatch

**Actions**:

- Scans codebase for new toolset definitions
- Validates toolset structure and naming
- Updates toolset registry
- Generates documentation
- Creates PR with changes (if auto-commit is disabled)

**Configuration**:

```yaml
env:
  AUTO_COMMIT: true  # Automatically commit changes to main
  TOOLSET_CONFIG_PATH: agent/toolsets.json
  REQUIRE_APPROVAL: false  # Set to true for manual review
```

### 2. Toolset Deprecation Workflow (`.github/workflows/toolset-deprecate.yml`)

**Purpose**: Safely deprecate old toolsets by creating aliases and migration guides.

**Triggers**:

- Manual workflow dispatch with toolset name parameters
- Scheduled check for deprecated toolsets

**Actions**:

- Creates deprecation alias mapping (old → new)
- Generates migration documentation
- Updates user-facing documentation
- Creates GitHub issue tracking deprecation
- Sends notifications to dependent repositories

**Deprecation Process**:

```text
1. Identify toolset to deprecate
2. Create alias in toolset_aliases.json
3. Update documentation with migration path
4. Add deprecation warning to logs
5. Monitor usage for 6 months
6. Remove after migration period
```

### 3. Validation & Testing Workflow (`.github/workflows/toolset-validate.yml`)

**Purpose**: Validate toolset changes before deployment.

**Triggers**:

- Pull request targeting `main` branch
- Before toolset update/deprecation workflows
- Manual validation

**Actions**:

- Schema validation for toolset definitions
- Backward compatibility checks
- Alias resolution testing
- Integration tests with MCP server
- Documentation link validation

**Validation Rules**:

- Toolset names must follow naming conventions
- Aliases must point to existing toolsets
- No circular dependencies
- All tools in toolset must exist
- Documentation must be complete

### 4. Documentation Generation Workflow (`.github/workflows/toolset-docs.yml`)

**Purpose**: Auto-generate and update toolset documentation.

**Triggers**:

- After toolset update workflow
- After deprecation workflow
- Manual dispatch

**Actions**:

- Regenerates toolset reference documentation
- Updates README with toolset tables
- Creates migration guides for deprecated toolsets
- Updates CHANGELOG
- Commits documentation updates

---

## Adding New Toolsets

### Manual Process

1. **Define Toolset** in agent configuration:

   ```python
   # agent/main.py
   def register_toolsets():
       toolsets = {
           "new_feature": {
               "id": "new_feature",
               "description": "New feature tools for X functionality",
               "default": False,  # Set to True for default toolsets
               "icon": "tools",
               "tools": [
                   "new_tool_1",
                   "new_tool_2"
               ]
           }
       }
   ```

2. **Create PR** with toolset definition

3. **Automated validation** runs on PR

4. **Merge to main** triggers update workflow

5. **Documentation** auto-generated and committed

### Automated Detection

The update workflow automatically detects new toolsets by:

- Parsing agent configuration files
- Comparing with existing toolset registry
- Validating against schema
- Running integration tests

---

## Deprecating Toolsets

### Deprecation Workflow

1. **Initiate Deprecation**:

   ```bash
   gh workflow run toolset-deprecate.yml \
     -f old_toolset=old_feature \
     -f new_toolset=new_feature \
     -f reason="Replaced by new_feature with better API"
   ```

2. **Alias Creation**: Workflow creates alias mapping:

   ```json
   {
     "deprecated_toolsets": {
       "old_feature": {
         "canonical": "new_feature",
         "deprecated_at": "2026-01-02",
         "removal_date": "2026-07-02",
         "migration_guide": "docs/migration/old_feature_to_new_feature.md"
       }
     }
   }
   ```

3. **Migration Documentation**: Auto-generated guide includes:
   - Breaking changes
   - Step-by-step migration steps
   - Before/after examples
   - Timeline for removal

4. **User Notification**:
   - GitHub issue created
   - CHANGELOG updated
   - Warning logs added to MCP server

### Backward Compatibility

The system maintains backward compatibility through:

**Alias Resolution**:

```javascript
// User's old config
{
  "github": {
    "env": {
      "GITHUB_TOOLSETS": "old_feature,repos"
    }
  }
}

// Resolved at runtime to:
{
  "github": {
    "env": {
      "GITHUB_TOOLSETS": "new_feature,repos"  // old_feature → new_feature
    }
  }
}
```

**Deprecation Warning**:

```text
Warning: Toolset 'old_feature' is deprecated and will be removed on 2026-07-02.
Please migrate to 'new_feature'. See docs/migration/old_feature_to_new_feature.md
```

---

## Testing & Validation

### Pre-Deployment Tests

```yaml
# .github/workflows/toolset-validate.yml
jobs:
  validate:
    steps:
      - name: Schema Validation
        run: npm run validate:toolsets
      
      - name: Alias Resolution Test
        run: npm run test:aliases
      
      - name: Integration Test
        run: |
          # Start MCP server with test config
          npm run test:integration
      
      - name: Documentation Validation
        run: npm run validate:docs
```

### Local Testing

```bash
# Validate toolset definitions
npm run validate:toolsets

# Test alias resolution
npm run test:aliases -- --toolset old_feature

# Run full integration suite
npm run test:integration
```

### Continuous Monitoring

Post-deployment monitoring includes:

- Toolset usage metrics
- Deprecation warning counts
- Migration adoption rates
- Error rates for deprecated toolsets

---

## Troubleshooting

### Common Issues

#### 1. Circular Dependency in Aliases

**Problem**: Alias points to another alias in a loop

```json
{
  "toolset_a": "toolset_b",
  "toolset_b": "toolset_a"  // ❌ Circular
}
```

**Solution**: Validation workflow detects and fails with error

```bash
Error: Circular alias dependency detected: toolset_a → toolset_b → toolset_a
```

#### 2. Missing Toolset in Alias

**Problem**: Deprecated toolset points to non-existent toolset

```json
{
  "old_toolset": "nonexistent_toolset"  // ❌ Target doesn't exist
}
```

**Solution**: Validation ensures target exists

#### 3. Documentation Out of Sync

**Problem**: Docs don't reflect current toolsets

**Solution**: Rerun documentation workflow:

```bash
gh workflow run toolset-docs.yml
```

#### 4. Failed Deprecation Workflow

**Problem**: Deprecation workflow fails mid-execution

**Solution**:

1. Check workflow logs for specific error
2. Manually rollback partial changes
3. Fix issue and re-run workflow
4. Use `--force` flag if needed

---

## Configuration Reference

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TOOLSET_CONFIG_PATH` | Path to toolset definitions | `agent/toolsets.json` |
| `AUTO_COMMIT` | Auto-commit changes | `true` |
| `REQUIRE_APPROVAL` | Require manual approval for changes | `false` |
| `DEPRECATION_PERIOD_DAYS` | Days before toolset removal | `180` |
| `NOTIFICATION_CHANNEL` | Slack/Teams webhook for notifications | `` |

### File Structure

```
.github/
  workflows/
    toolset-update.yml       # Auto-update toolsets
    toolset-deprecate.yml    # Deprecation workflow
    toolset-validate.yml     # Validation tests
    toolset-docs.yml         # Doc generation
agent/
  toolsets.json             # Toolset definitions
  toolset_aliases.json      # Deprecation aliases
docs/
  migration/                # Migration guides
  toolsets/                 # Toolset reference docs
scripts/
  validate-toolsets.js      # Validation scripts
  generate-docs.js          # Doc generation
  test-aliases.js           # Alias testing
```

---

## Best Practices

### 1. Naming Conventions

- Use lowercase with underscores: `code_security`, `pull_requests`
- Be descriptive but concise: `actions` not `github_actions_ci_cd`
- Avoid generic names: `data` → `data_analysis`

### 2. Deprecation Strategy

- **Plan ahead**: Announce deprecation 6+ months in advance
- **Clear migration path**: Provide detailed migration docs
- **Gradual rollout**: Use feature flags for new toolsets
- **Monitor usage**: Track adoption before removing old toolsets

### 3. Documentation

- **Always document** new toolsets with examples
- **Update immediately** when toolsets change
- **Include migration guides** for all deprecations
- **Link to related docs** (API references, tutorials)

### 4. Testing

- **Test aliases** before deployment
- **Validate backward compatibility** in integration tests
- **Run full test suite** on every change
- **Monitor production** after deployment

---

## Related Documentation

- [GitHub MCP Server Tool Renaming Guide](https://github.com/github/github-mcp-server/blob/main/docs/tool-renaming.md)
- [GitHub MCP Server README](https://github.com/github/github-mcp-server/blob/main/README.md)
- [GitHub Actions CI/CD Best Practices](../.github/copilot-instructions.md)
- [Project Overview](../Project_Overview.md)

---

## Support

For issues with toolset management workflows:

1. **Check workflow logs**: `.github/workflows/` → Actions tab
2. **Validate locally**: `npm run validate:toolsets`
3. **File an issue**: Use template `toolset-management-issue.md`
4. **Contact**: @github/mcp-team

---

*Last Updated: January 2, 2026*
