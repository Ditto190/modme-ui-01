# esbuild Quick Reference Card

## Installation Status
✅ **esbuild** installed and ready
✅ **Configuration** files created
✅ **Output directories** created
✅ **Setup scripts** available

## 📋 What is esbuild?

Fast, minimal JavaScript/TypeScript bundler for:
- CLI tools (agent-generator)
- Build scripts (knowledge-management, toolset-management)
- TypeScript transpilation to JavaScript

## 🚀 First Time Setup

### Step 1: Add npm scripts to package.json

```json
{
  "scripts": {
    "build:esbuild": "node esbuild.config.mjs build",
    "build:esbuild:agent": "node esbuild.config.mjs build agentGenerator",
    "build:esbuild:docs": "node esbuild.config.mjs build syncDocs",
    "build:esbuild:tools": "node esbuild.config.mjs build validateToolsets detectChanges testAliases generateDiagram",
    "watch:esbuild:agent": "node esbuild.config.mjs watch agentGenerator",
    "watch:esbuild:docs": "node esbuild.config.mjs watch syncDocs",
    "list:esbuild": "node esbuild.config.mjs list"
  }
}
```

### Step 2: Run first build

```bash
npm run build:esbuild
```

### Step 3: Done! ✅

Bundles are now in:
- `agent-generator/dist/generate.mjs`
- `scripts/knowledge-management/dist/sync-docs.mjs`
- `scripts/toolset-management/dist/validate-toolsets.mjs`
- (etc.)

## 🎯 Common Commands

| Command | What It Does |
|---------|--------------|
| `npm run build:esbuild` | Build all bundles |
| `npm run build:esbuild:agent` | Build agent-generator only |
| `npm run build:esbuild:docs` | Build docs tools only |
| `npm run watch:esbuild:agent` | Auto-rebuild on file changes |
| `npm run watch:esbuild:docs` | Auto-rebuild docs tools |
| `npm run list:esbuild` | List all build targets |

## 🔧 Direct Commands (without npm)

```bash
node esbuild.config.mjs build              # Build all
node esbuild.config.mjs build agentGenerator  # Build one
node esbuild.config.mjs watch syncDocs     # Watch one
node esbuild.config.mjs list               # List targets
```

## 📁 Build Targets

1. **agentGenerator** → `agent-generator/dist/generate.mjs`
2. **syncDocs** → `scripts/knowledge-management/dist/sync-docs.mjs`
3. **validateToolsets** → `scripts/toolset-management/dist/validate-toolsets.mjs`
4. **detectChanges** → `scripts/toolset-management/dist/detect-toolset-changes.mjs`
5. **testAliases** → `scripts/toolset-management/dist/test-alias-resolution.mjs`
6. **generateDiagram** → `scripts/knowledge-management/dist/generate-diagram.mjs`

## 🔗 Integration

### Auto-build with Next.js

```json
{
  "scripts": {
    "prebuild": "npm run build:esbuild",
    "build": "next build"
  }
}
```

Now `npm run build` automatically runs esbuild first.

### Auto-build on npm install

```json
{
  "scripts": {
    "postinstall": "npm run build:esbuild && npm run install:agent"
  }
}
```

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module" | Ensure output dirs exist: `mkdir -p agent-generator/dist scripts/knowledge-management/dist scripts/toolset-management/dist` |
| "esbuild not found" | Run: `npm install --save-dev esbuild` |
| Bundles not created | Ensure parent directory exists, check file paths in esbuild.config.mjs |
| Watch mode not working | Make sure source files end in `.ts`, `.tsx`, `.js`, or `.mjs` |

## 📚 Documentation

- **ESBUILD_SETUP.md** — Full reference guide
- **ESBUILD_QUICK_START.md** — Detailed setup steps
- **ESBUILD_INTEGRATION.md** — CI/CD & advanced patterns
- **esbuild.config.mjs** — Configuration source code

## 💡 Tips

1. **Use watch mode during development** for faster iteration
   ```bash
   npm run watch:esbuild:agent
   ```

2. **Check bundle sizes** to optimize
   ```bash
   du -sh agent-generator/dist/*.mjs
   ```

3. **Use externals** to reduce bundle size
   - Already configured for `ajv`, `glob`, `marked`, etc.
   - Prevents bundling of npm packages

4. **Production vs Dev**
   - Dev: includes source maps (for debugging)
   - Prod: minified, no maps (set `NODE_ENV=production`)

## 🎓 Key Files

| File | Purpose |
|------|---------|
| `esbuild.config.mjs` | Main configuration file |
| `scripts/setup-esbuild.ps1` | Windows setup (automated) |
| `scripts/setup-esbuild.sh` | Unix/macOS setup (automated) |
| `ESBUILD_SETUP.md` | Detailed reference |
| `ESBUILD_INTEGRATION.md` | Integration patterns |

## ✅ Validation

Verify everything is working:

```bash
# Check esbuild is installed
npm list esbuild

# List available configs
npm run list:esbuild

# Build everything
npm run build:esbuild

# Check output files exist
ls -lh agent-generator/dist/*.mjs
ls -lh scripts/knowledge-management/dist/*.mjs

# Test execution
node agent-generator/dist/generate.mjs
```

## 🔗 Related

- **Next.js build**: Uses its own bundler (SWC/Turbopack)
- **Python agent**: Separate runtime (FastAPI at port 8000)
- **esbuild docs**: https://esbuild.github.io/

---

**Status**: ✅ Ready to use  
**Installation**: ✅ Complete  
**Next step**: Add npm scripts → Run `npm run build:esbuild`
