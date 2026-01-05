# Toolset Management Scripts

This directory contains scripts for managing GitHub MCP server toolsets in the ModMe GenUI workspace.

## Script Index

### Detection & Analysis

- **detect-toolset-changes.js** - Detects new and modified toolsets by comparing agent code with registry
- **verify-tools.js** - Verifies all tools referenced in toolsets actually exist
- **find-orphaned-tools.js** - Finds tools not assigned to any toolset
- **check-circular-deps.js** - Detects circular dependencies in toolset aliases

### Validation

- **validate-toolsets.js** - Schema validation for toolset definitions
- **validate-naming.js** - Checks toolset naming conventions
- **validate-alias-targets.js** - Ensures alias targets exist
- **validate-deprecation.js** - Validates deprecation requests
- **check-breaking-changes.js** - Detects breaking changes between versions
- **verify-alias-completeness.js** - Ensures removed toolsets have aliases
- **check-reserved-names.js** - Prevents use of reserved toolset names

### Registry Management

- **update-toolset-registry.js** - Updates the central toolset registry
- **create-alias.js** - Creates deprecation alias mappings
- **inject-deprecation-warning.js** - Adds deprecation warnings to agent code

### Documentation Generation

- **generate-toolset-docs.js** - Generates comprehensive toolset documentation
- **generate-migration-guide.js** - Creates migration guides for deprecated toolsets
- **generate-deprecation-table.js** - Generates table of deprecated toolsets
- **generate-migration-index.js** - Creates index of all migration guides
- **update-readme-toolsets.js** - Updates README with toolset information
- **update-readme-stats.js** - Updates toolset statistics in README
- **update-changelog.js** - Adds entries to CHANGELOG
- **update-deprecation-registry.js** - Updates deprecation tracking documentation

### Testing

- **test-alias-resolution.js** - Tests alias resolution logic
- **test-deprecation-warnings.js** - Verifies deprecation warnings
- **verify-deprecation-warning.js** - Checks that warnings are logged correctly

### Documentation Validation

- **verify-migration-guides.js** - Ensures all deprecated toolsets have migration guides
- **validate-changelog.js** - Validates CHANGELOG format
- **verify-doc-completeness.js** - Ensures all toolsets are documented

## Usage Examples

### Detect Changes

```bash
node scripts/toolset-management/detect-toolset-changes.js
```

### Validate Toolsets

```bash
npm run validate:toolsets
# or
node scripts/toolset-management/validate-toolsets.js
```

### Create Deprecation Alias

```bash
node scripts/toolset-management/create-alias.js \
  --old old_feature \
  --new new_feature \
  --reason "Better API" \
  --removal-date 2026-07-01
```

### Generate Documentation

```bash
node scripts/toolset-management/generate-toolset-docs.js \
  --output docs/toolsets/ \
  --format markdown
```

### Test Alias Resolution

```bash
node scripts/toolset-management/test-alias-resolution.js --toolset old_feature
```

## NPM Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "validate:toolsets": "node scripts/toolset-management/validate-toolsets.js",
    "validate:naming": "node scripts/toolset-management/validate-naming.js",
    "test:aliases": "node scripts/toolset-management/test-alias-resolution.js",
    "test:deprecation": "node scripts/toolset-management/test-deprecation-warnings.js",
    "generate:types": "node scripts/toolset-management/generate-types.js",
    "docs:generate": "node scripts/toolset-management/generate-toolset-docs.js"
  }
}
```

## Configuration

Scripts read configuration from:

- `agent/toolsets.json` - Toolset definitions
- `agent/toolset_aliases.json` - Deprecation aliases
- `package.json` - Project metadata

## Error Codes

| Code | Meaning                      |
| ---- | ---------------------------- |
| 0    | Success                      |
| 1    | Validation failure           |
| 2    | Schema violation             |
| 3    | Circular dependency detected |
| 4    | Missing required file        |
| 5    | Breaking change detected     |

## Development

To add a new script:

1. Create the script in this directory
2. Add JSDoc comments
3. Export main function
4. Add entry to this README
5. Add NPM script if applicable
6. Update workflow YAML if needed

## Related Documentation

- [Toolset Management Guide](../../docs/TOOLSET_MANAGEMENT.md)
- [GitHub Actions Workflows](../../.github/workflows/)
- [Project Overview](../../Project_Overview.md)
