# GitHub Actions Workflows

This directory contains CI/CD workflows for the ModMe GenUI Workspace.

## Workflows

### `ci.yml` - Continuous Integration
**Trigger**: Push to main/develop/feature branches, Pull Requests

Runs comprehensive checks on every code change:

1. **Lint TypeScript** - ESLint validation
2. **Type Check TypeScript** - TypeScript compiler checks
3. **Lint Python** - Flake8 validation
4. **Build Next.js** - Production build verification
5. **Test Agent** - Python agent startup verification

**Status**: All jobs must pass before merge

**Artifacts**: Next.js build output (7 days retention)

### `devcontainer-build.yml` - DevContainer Validation
**Trigger**: Push to .devcontainer files, Pull Requests, Manual

Validates that the DevContainer builds and works correctly:

1. **Build DevContainer** - Docker image build
2. **Test Node.js Environment** - Verify Node.js 22.9.0+
3. **Test Python Environment** - Verify Python 3.12+
4. **Test Workspace Setup** - Verify project structure
5. **Health Check** - Run comprehensive environment validation

**Cache**: Docker layers cached for faster builds

### `ai-assisted-maintenance.yml` - Automated Maintenance
**Trigger**: Weekly schedule (Monday 9 AM UTC), Manual

Automates routine maintenance tasks:

1. **Dependency Check** - Find outdated npm and Python packages
2. **Security Audit** - Run npm audit and Python safety checks
3. **Code Quality Check** - Run linting and complexity analysis (manual)
4. **Create Maintenance Issue** - Automatically create/update tracking issue

**Schedule**: Weekly on Mondays at 9:00 AM UTC

**Permissions**: Can create issues and read repository contents

## Manual Triggers

All workflows support manual triggering via workflow_dispatch:

```bash
# Using GitHub CLI
gh workflow run ci.yml
gh workflow run devcontainer-build.yml
gh workflow run ai-assisted-maintenance.yml --field task_type=security-audit
```

Or via GitHub UI: Actions → Select workflow → Run workflow

## Workflow Status Badges

Add to README.md:
```markdown
[![CI](https://github.com/Ditto190/modme-ui-01/workflows/CI/badge.svg)](https://github.com/Ditto190/modme-ui-01/actions)
[![DevContainer](https://github.com/Ditto190/modme-ui-01/workflows/DevContainer%20Build/badge.svg)](https://github.com/Ditto190/modme-ui-01/actions)
```

## Environment Variables

### Required Secrets
These must be set in repository settings:
- None currently required (workflows use GitHub default tokens)

### Optional Secrets
For enhanced functionality:
- `GOOGLE_API_KEY` - For running agent tests (not in CI currently)
- `CODECOV_TOKEN` - For code coverage reporting (if added)

## Customizing Workflows

### Change Node.js Version
Edit in workflow files:
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22.9.0'  # Change here
```

### Change Python Version
Edit in workflow files:
```yaml
- name: Setup Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.12'  # Change here
```

### Add New CI Steps
Add to `ci.yml` under `jobs`:
```yaml
your-new-job:
  name: Your Job Name
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v4
    - name: Your Step
      run: your-command
```

### Change Maintenance Schedule
Edit in `ai-assisted-maintenance.yml`:
```yaml
on:
  schedule:
    - cron: '0 9 * * 1'  # Change cron expression
```

Cron format: `minute hour day month weekday`

## Troubleshooting

### CI Failing on Lint
```bash
# Run locally to reproduce
npm run lint

# Fix automatically
npm run lint -- --fix
```

### CI Failing on Type Check
```bash
# Run locally
npx tsc --noEmit

# Fix type errors in reported files
```

### DevContainer Build Failing
1. Test locally: `docker build -f .devcontainer/Dockerfile .`
2. Check for syntax errors in Dockerfile
3. Verify all base images are accessible

### Maintenance Workflow Not Creating Issues
1. Check repository settings → Actions → General → Workflow permissions
2. Ensure "Read and write permissions" is enabled
3. Or grant specific permission in workflow file

## Best Practices

### Before Pushing
1. Run `npm run lint` locally
2. Run `npx tsc --noEmit` for type checking
3. Test builds with `npm run build`

### Pull Requests
1. Ensure all CI checks pass
2. Review workflow logs if failures occur
3. Fix issues before requesting review

### Maintenance
1. Review weekly maintenance issues
2. Update dependencies in separate PRs
3. Test thoroughly after updates

## Performance

### Caching
Workflows use caching to speed up runs:
- npm dependencies cached by `actions/setup-node`
- Python dependencies cached by uv
- Docker layers cached for DevContainer builds

### Parallel Execution
CI jobs run in parallel when possible:
- Lint and type-check run simultaneously
- Build verification runs independently

### Optimization Tips
1. Keep dependencies minimal
2. Use cache-friendly tools (uv for Python)
3. Split large jobs into smaller parallel jobs

## Security

### Workflow Permissions
Workflows use minimal permissions:
- `contents: read` - Read repository code
- `issues: write` - Create maintenance issues (maintenance workflow only)
- `packages: read` - Read GitHub packages (if needed)

### Secrets Management
- Never log secrets
- Use GitHub Secrets for sensitive data
- Rotate tokens regularly

### Third-Party Actions
All actions are from trusted sources:
- `actions/*` - Official GitHub actions
- `devcontainers/*` - Official DevContainers actions
- Always pin to specific versions (v4, v5, etc.)

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [DevContainers CI](https://github.com/devcontainers/ci)
- [npm-audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)
