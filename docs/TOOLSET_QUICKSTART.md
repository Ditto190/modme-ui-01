# Toolset Management System

## Overview

Complete CI/CD automation for managing GitHub MCP-style toolsets in the ModMe GenUI workspace. This system provides automated detection, validation, deprecation, and documentation for custom agent toolsets.

## Quick Start

### 1. Install Dependencies

```bash
npm install ajv ajv-formats
```

### 2. Validate Existing Toolsets

```bash
npm run validate:toolsets
```

### 3. Test the System

```bash
# Detect any toolset changes
npm run detect:changes

# Validate naming conventions
npm run validate:naming
```

## System Architecture

### Components

1. **Configuration Files** (agent/)
   - `toolsets.json` - Toolset definitions registry
   - `toolset_aliases.json` - Deprecation alias mappings
   - `toolset-schema.json` - JSON schema for validation

2. **Scripts** (scripts/toolset-management/)
   - Detection: `detect-toolset-changes.js`
   - Validation: `validate-toolsets.js`, `validate-naming.js`
   - Deprecation: `create-alias.js`, `generate-migration-guide.js`
   - See [scripts/toolset-management/README.md](scripts/toolset-management/README.md)

3. **Workflows** (.github/workflows/)
   - `toolset-update.yml` - Automated toolset registration
   - `toolset-deprecate.yml` - Safe deprecation with aliases
   - `toolset-validate.yml` - Comprehensive validation suite
   - `toolset-docs.yml` - Documentation generation

## Usage

### Adding a New Toolset

1. **Define tools in agent code** ([agent/main.py](agent/main.py)):
   ```python
   def my_new_tool(tool_context: ToolContext, param: str):
       """Tool description"""
       # Implementation
   ```

2. **Push to main branch** - Toolset will be auto-detected:
   ```bash
   git add agent/main.py
   git commit -m "feat: add my_new_tool"
   git push origin main
   ```

3. **Workflow runs automatically:**
   - Detects new tool
   - Validates against schema
   - Updates `toolsets.json`
   - Generates documentation
   - Creates PR (if configured) or auto-commits

### Deprecating a Toolset

1. **Trigger deprecation workflow:**
   ```bash
   gh workflow run toolset-deprecate.yml \
     -f old_toolset=old_feature \
     -f new_toolset=new_feature \
     -f reason="Better API design" \
     -f create_issue=true
   ```

2. **Workflow performs:**
   - Creates alias: `old_feature` → `new_feature`
   - Generates migration guide
   - Tests alias resolution
   - Creates GitHub issue for tracking
   - Updates documentation

3. **Users see deprecation warnings:**
   ```
   ⚠️  Toolset "old_feature" is deprecated. Use "new_feature" instead.
       Removal planned for: 2026-07-01
       See: docs/migration/old_feature_to_new_feature.md
   ```

### Manual Operations

#### Detect Changes
```bash
node scripts/toolset-management/detect-toolset-changes.js
# Outputs JSON with new/modified/removed toolsets
```

#### Validate Toolsets
```bash
node scripts/toolset-management/validate-toolsets.js
# Validates schema, naming, references, dependencies
```

#### Create Alias
```bash
node scripts/toolset-management/create-alias.js \
  --old old_name \
  --new new_name \
  --reason "Migration reason" \
  --removal-date 2026-07-01
```

#### Generate Migration Guide
```bash
node scripts/toolset-management/generate-migration-guide.js \
  --old old_name \
  --new new_name \
  --reason "Reason" \
  --output docs/migration/
```

## Workflows

### 1. Toolset Update Workflow

**Trigger:** Push to main (agent code changes)

**Process:**
1. Detect toolset changes
2. Validate new/modified toolsets
3. Update registry (toolsets.json)
4. Generate TypeScript types
5. Update documentation
6. Create PR or auto-commit

**Configuration:**
```yaml
# Enable auto-commit (default: create PR)
workflow_dispatch:
  inputs:
    auto_commit: true
```

### 2. Toolset Deprecate Workflow

**Trigger:** Manual (`workflow_dispatch`)

**Process:**
1. Validate deprecation request
2. Create alias mapping
3. Inject deprecation warning
4. Generate migration guide
5. Test alias resolution
6. Create tracking issue (optional)

**Inputs:**
- `old_toolset` (required)
- `new_toolset` (required)
- `reason` (required)
- `removal_date` (optional, default: +180 days)
- `create_issue` (optional, default: true)

### 3. Toolset Validate Workflow

**Trigger:** Pull request, push to main

**10 Validation Jobs:**
1. Schema validation
2. Naming conventions
3. Dependency analysis
4. Alias resolution testing
5. Integration tests
6. Python agent tests
7. Documentation validation
8. Backward compatibility
9. Security scanning
10. Validation summary

### 4. Toolset Docs Workflow

**Trigger:** After update/deprecate, weekly schedule

**Process:**
1. Generate toolset reference docs
2. Update README statistics
3. Update CHANGELOG
4. Commit documentation
5. Validate docs (links, format)
6. Publish to GitHub Pages (optional)

## Configuration

### Environment Variables

```bash
# GitHub Actions secrets
GITHUB_TOKEN          # Automatic, for API access
SLACK_WEBHOOK         # Optional, for notifications

# Configurable in workflows
DEPRECATION_PERIOD_DAYS=180    # Default: 6 months
AUTO_COMMIT=false              # Create PR vs auto-commit
```

### Toolset Definition Format

```json
{
  "id": "my_toolset",
  "name": "My Toolset",
  "description": "Brief description of what it does",
  "default": true,
  "icon": "gear",
  "tools": ["tool_one", "tool_two"],
  "metadata": {
    "category": "generative_ui",
    "requires": [],
    "deprecated": false
  }
}
```

### Alias Format

```json
{
  "aliases": {
    "old_name": "new_name"
  },
  "deprecation_metadata": {
    "old_name": {
      "deprecated_at": "2025-01-01T00:00:00Z",
      "removal_date": "2026-07-01",
      "reason": "Better API",
      "replacement": "new_name",
      "migration_guide": "docs/migration/old_name_to_new_name.md"
    }
  }
}
```

## Best Practices

### Naming Conventions

- **Toolset IDs:** `lowercase_with_underscores`
- **Tool names:** `camelCase` or `snake_case` (Python convention)
- **Avoid reserved words:** `all`, `default`, `system`, `core`, `builtin`

### Deprecation Strategy

1. **Announce early:** Notify users 6 months before removal
2. **Provide migration guide:** Clear, step-by-step instructions
3. **Create tracking issue:** Centralize questions and feedback
4. **Test alias resolution:** Ensure backward compatibility
5. **Monitor usage:** Track adoption of new toolset

### Documentation

- **Keep guides current:** Update when API changes
- **Provide examples:** Show real-world usage
- **Link related docs:** Cross-reference migration guides
- **Version carefully:** Note changes in CHANGELOG

## Testing

### Run Validation Suite

```bash
# Full validation (runs on PRs)
gh workflow run toolset-validate.yml

# Or run locally
npm run validate:toolsets
npm test
```

### Test Alias Resolution

```bash
node scripts/toolset-management/test-alias-resolution.js \
  --toolset old_feature
```

### Integration Tests

```bash
# Python tests
cd agent
pytest tests/test_toolsets.py -v

# TypeScript tests
npm test -- toolsets
```

## Troubleshooting

### Common Issues

**Issue:** Validation fails with "tool not found"
**Solution:** Ensure tool function exists in agent/main.py with correct name

**Issue:** Circular dependency detected
**Solution:** Review `requires` in toolset metadata, remove cycles

**Issue:** Schema validation fails
**Solution:** Check toolsets.json against toolset-schema.json format

**Issue:** Alias not resolving
**Solution:** Verify entry exists in toolset_aliases.json and targets valid toolset

### Debug Commands

```bash
# Check toolset registry
cat agent/toolsets.json | jq '.toolsets[] | {id, tools}'

# Check aliases
cat agent/toolset_aliases.json | jq '.aliases'

# Lint workflows
actionlint .github/workflows/toolset-*.yml

# View workflow logs
gh run list --workflow=toolset-update.yml
gh run view <run-id> --log
```

## Maintenance

### Regular Tasks

- **Weekly:** Review deprecation tracking issues
- **Monthly:** Update migration guide examples
- **Quarterly:** Audit unused toolsets
- **Before removal:** Ensure no usage in codebase

### Metrics to Track

- Number of active toolsets
- Toolsets deprecated (in grace period)
- Toolsets removed (completed migrations)
- Migration guide views
- User feedback/issues

## Migration from Manual Management

If you're currently managing toolsets manually:

1. **Audit existing toolsets**
   ```bash
   # List all tool functions
   grep -r "def.*tool_context.*ToolContext" agent/
   ```

2. **Create initial registry**
   - Run `detect-toolset-changes.js` to bootstrap
   - Review and adjust groupings
   - Add descriptions and metadata

3. **Set up workflows**
   - Copy workflow YAML files to `.github/workflows/`
   - Configure secrets (GITHUB_TOKEN, SLACK_WEBHOOK)
   - Test with manual trigger first

4. **Update agent code**
   - Add toolset loading from JSON
   - Implement alias resolution
   - Add deprecation warning logging

5. **Document for team**
   - Share this README
   - Train team on deprecation process
   - Establish review procedures

## Architecture Decisions

### Why JSON for Registry?

- **Human-readable:** Easy to review in PRs
- **Schema-validated:** Catch errors before runtime
- **Language-agnostic:** Used by Python agent and TypeScript UI
- **Versionable:** Clear diffs in git history

### Why 6-Month Deprecation?

- **Industry standard:** Time for users to plan migration
- **Balances speed vs stability:** Not too fast, not too slow
- **Matches GitHub MCP server:** Consistent with reference implementation

### Why GitHub Actions?

- **Native integration:** Built into GitHub workflow
- **No additional infrastructure:** Runs on GitHub-hosted runners
- **Familiar syntax:** YAML format widely known
- **Rich ecosystem:** Many pre-built actions available

## Related Documentation

- [TOOLSET_MANAGEMENT.md](docs/TOOLSET_MANAGEMENT.md) - Comprehensive guide
- [GitHub MCP Server](https://github.com/github/github-mcp-server) - Reference implementation
- [Tool Renaming Guide](https://github.com/github/github-mcp-server/blob/main/docs/tool-renaming.md)
- [Workflow READMEs](scripts/toolset-management/README.md)

## Support

- **GitHub Issues:** Report bugs and request features
- **Discussions:** Ask questions, share patterns
- **Pull Requests:** Contribute improvements

## License

MIT - See [LICENSE](LICENSE)

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-01  
**Maintained by:** ModMe GenUI Team
