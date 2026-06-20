# Setup Instructions

## Initial Setup (After copying template)

### 1. Install Dependencies

```bash
# Ensure you have Node 22+
nvm use  # Uses .nvmrc

# Enable Corepack (for Yarn 4)
corepack enable

# Install dependencies (node-modules linker)
yarn install

# Setup Git hooks (if Husky is configured)
yarn prepare  # Installs pre-commit hooks
```

### 2. Customize Project

**Update root `package.json`:**
```json
{
  "name": "@yourcompany/YOUR-PROJECT-NAME",
  "description": "Your project description",
  ...
}
```

**Rename all packages:**
```bash
# Replace @adaptiveworx with your organization scope
find apps packages envs -type f \( -name "*.json" -o -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' 's/@adaptiveworx/@yourcompany/g' {} +

# Update tsconfig.json paths as well
```

**Update `README.md`:**
- Replace project name
- Update description
- Add specific usage instructions

### 3. Configure Infisical (Optional)

If using Infisical for quality threshold enforcement:

```bash
# Create .env.local (gitignored)
cat > .env.local <<'EOF'
INFISICAL_PLATFORM_PROJECT_ID=<platform-project-id>
INFISICAL_APPS_PROJECT_ID=10b63b16-515c-4ea4-adfc-1da96d654fe8
INFISICAL_CLIENT_ID=<your-client-id>
INFISICAL_CLIENT_SECRET=<your-client-secret>
EOF
```

Without Infisical, package.json thresholds are used as defaults.

### 4. Validate Setup

```bash
# Run all validation checks
yarn validate:all

# Should pass:
# ✅ Type check
# ✅ Lint (0 warnings)
# ✅ Tests (all passing)
```

### 5. Initialize Git

```bash
git init
git add .
git commit -m "Initial commit from template-typescript-lib"
```

## Development Workflow

### Turborepo + Biome Workflow

**Fast builds with caching:**
```bash
yarn build              # First run: builds all packages
yarn build              # Second run: instant (cached)
yarn build --force      # Force rebuild
```

**Linting and formatting:**
```bash
yarn lint:check         # Biome: Check all files (0 warnings enforced)
yarn lint:fix           # Biome: Auto-fix issues
```

### VSCode Integration

Recommended extensions:
- **Biome** - Linting + formatting (replaces ESLint + Prettier)
- **Vitest** - Test runner UI
- **Error Lens** - Inline errors
- **Tailwind CSS IntelliSense** - For UI package

### Quality Standards

Enforced by Turborepo + Biome:
- **0 TypeScript errors** - Strict mode enabled
- **0 Biome warnings** - No exceptions
- **All tests passing** - Vitest across all packages

## Agent Collaboration

See [CLAUDE.md](CLAUDE.md) for detailed agent workflow.

**Quick Start:**
1. Share objectives with agent
2. Agent reads CLAUDE.md
3. Agent delivers 100% clean code (no errors, no warnings)
4. You handle publishing/deployment

## Troubleshooting

### Husky hooks not working
```bash
yarn prepare
chmod +x .husky/pre-commit
```

### Type coverage below threshold
```bash
yarn type-coverage --detail
# Shows which files/lines need type annotations
```

### Tests failing
```bash
yarn test:watch
# Interactive test runner for debugging
```

### Infisical validation failing
```bash
# Skip if not using Infisical
export INFISICAL_CLIENT_ID=""
yarn quality:validate
```
