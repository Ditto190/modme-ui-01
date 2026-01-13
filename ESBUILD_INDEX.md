# esbuild Documentation Index

Complete guide to esbuild configuration for ModMe GenUI Workbench.

## 🎯 Choose Your Starting Point

### 👤 I'm new to esbuild
**Start here**: [ESBUILD_CONFIGURED.md](./ESBUILD_CONFIGURED.md)

Quick overview of what's installed and how to get started in 5 minutes.

### ⚡ I just want to run commands
**Start here**: [ESBUILD_REFERENCE.md](./ESBUILD_REFERENCE.md)

Quick reference card with common commands and troubleshooting.

### 📝 I need to add npm scripts to package.json
**Start here**: [ESBUILD_NPM_SCRIPTS.md](./ESBUILD_NPM_SCRIPTS.md)

Ready-to-copy npm scripts template. Just paste into your package.json.

### 📚 I want the full reference
**Start here**: [ESBUILD_SETUP.md](./ESBUILD_SETUP.md)

Comprehensive configuration guide with all options explained.

### 🔗 I need CI/CD or integration help
**Start here**: [ESBUILD_INTEGRATION.md](./ESBUILD_INTEGRATION.md)

Integration patterns, GitHub Actions examples, Docker setup, advanced features.

### 🚀 I want step-by-step instructions
**Start here**: [ESBUILD_QUICK_START.md](./ESBUILD_QUICK_START.md)

Detailed walkthrough of installation, setup, and verification steps.

## 📄 All Documentation Files

| File | Purpose | Read Time |
|------|---------|-----------|
| **ESBUILD_CONFIGURED.md** | Setup status & next steps | 5 min |
| **ESBUILD_REFERENCE.md** | Quick commands & troubleshooting | 3 min |
| **ESBUILD_NPM_SCRIPTS.md** | npm scripts template | 2 min |
| **ESBUILD_QUICK_START.md** | Step-by-step setup | 10 min |
| **ESBUILD_SETUP.md** | Comprehensive reference | 15 min |
| **ESBUILD_INTEGRATION.md** | CI/CD & advanced patterns | 20 min |
| **ESBUILD_INDEX.md** | This file (navigation) | 5 min |

## 🗂️ Configuration Files

### Main Configuration
- **esbuild.config.mjs** — Primary esbuild configuration
  - 6 build targets
  - Shared and per-target options
  - Watch mode support
  - CLI interface

### Setup Scripts
- **scripts/setup-esbuild.ps1** — Automated setup (Windows)
- **scripts/setup-esbuild.sh** — Automated setup (Unix/macOS)

## 🎯 Common Tasks

### Task: I just installed esbuild, what now?

1. Read: [ESBUILD_CONFIGURED.md](./ESBUILD_CONFIGURED.md) (5 min)
2. Add npm scripts: [ESBUILD_NPM_SCRIPTS.md](./ESBUILD_NPM_SCRIPTS.md) (2 min)
3. Run: `npm run build:esbuild`

**Done!** Your bundles are created.

### Task: I want to understand what esbuild does

1. Read: [ESBUILD_SETUP.md](./ESBUILD_SETUP.md) sections 1-2 (5 min)
2. Check: [ESBUILD_REFERENCE.md](./ESBUILD_REFERENCE.md) (3 min)

### Task: I need to integrate esbuild with my build pipeline

1. Read: [ESBUILD_INTEGRATION.md](./ESBUILD_INTEGRATION.md) section "Integration with Build Pipeline"
2. Copy: Integration option A, B, or C
3. Test: `npm run build:esbuild`

### Task: My build is failing, I need help

1. Check: [ESBUILD_REFERENCE.md](./ESBUILD_REFERENCE.md) "Troubleshooting" section
2. Read: [ESBUILD_SETUP.md](./ESBUILD_SETUP.md) "Troubleshooting" section
3. If still stuck, check the error message in detail

### Task: I need CI/CD integration (GitHub Actions, Docker)

1. Read: [ESBUILD_INTEGRATION.md](./ESBUILD_INTEGRATION.md) "Integration Patterns" section
2. Copy: GitHub Actions or Docker example
3. Adapt: Change file paths/commands as needed

### Task: I want to use watch mode during development

1. Read: [ESBUILD_REFERENCE.md](./ESBUILD_REFERENCE.md) "Common Commands" table
2. Run: `npm run watch:esbuild:agent` (in separate terminal)
3. Files rebuild automatically on save

## 📊 Build Targets Reference

| Target | Input | Output | Purpose |
|--------|-------|--------|---------|
| **agentGenerator** | `agent-generator/src/scripts/generate.ts` | `agent-generator/dist/generate.mjs` | Compile TypeScript agent CLI |
| **syncDocs** | `scripts/knowledge-management/sync-docs.js` | `scripts/knowledge-management/dist/sync-docs.mjs` | Docs synchronization tool |
| **validateToolsets** | `scripts/toolset-management/validate-toolsets.js` | `scripts/toolset-management/dist/validate-toolsets.mjs` | Validate JSON schemas |
| **detectChanges** | `scripts/toolset-management/detect-toolset-changes.js` | `scripts/toolset-management/dist/detect-toolset-changes.mjs` | Detect new toolsets |
| **testAliases** | `scripts/toolset-management/test-alias-resolution.js` | `scripts/toolset-management/dist/test-alias-resolution.mjs` | Test alias resolution |
| **generateDiagram** | `scripts/knowledge-management/generate-diagram.js` | `scripts/knowledge-management/dist/generate-diagram.mjs` | Generate mermaid diagrams |

## 🔧 Quick Commands

```bash
# Build all
npm run build:esbuild

# Build one target
npm run build:esbuild:agent

# Watch for changes
npm run watch:esbuild:agent

# List all configs
npm run list:esbuild

# Direct (without npm scripts)
node esbuild.config.mjs build
node esbuild.config.mjs watch syncDocs
node esbuild.config.mjs list
```

For more: See [ESBUILD_REFERENCE.md](./ESBUILD_REFERENCE.md)

## ❓ Frequently Asked Questions

### Q: What is esbuild?
**A**: Fast JavaScript/TypeScript bundler for CLI tools and scripts. Outputs efficient ES modules (.mjs files).

For details: [ESBUILD_SETUP.md](./ESBUILD_SETUP.md) "Overview" section

### Q: Do I need to use esbuild?
**A**: No, but it's recommended for:
- Fast builds (milliseconds, not seconds)
- Simple configuration
- Small bundle sizes
- Native TypeScript support

### Q: Can I customize the build targets?
**A**: Yes! Edit `esbuild.config.mjs`:
- Add new targets in `buildConfigs` object
- Adjust options (minify, sourcemap, external, etc.)
- Copy an existing target and modify

For details: [ESBUILD_SETUP.md](./ESBUILD_SETUP.md) "Advanced Configuration" section

### Q: How do I troubleshoot build failures?
**A**: 
1. Check [ESBUILD_REFERENCE.md](./ESBUILD_REFERENCE.md) "Quick Troubleshooting"
2. See [ESBUILD_SETUP.md](./ESBUILD_SETUP.md) "Troubleshooting" section
3. Verify source files exist at paths in `esbuild.config.mjs`

### Q: What's the difference between dev and production builds?
**A**: 
- **Dev**: Includes source maps (larger files, better debugging)
- **Prod**: Minified, no maps (smaller files, faster execution)

Set with: `NODE_ENV=production npm run build:esbuild`

For details: [ESBUILD_SETUP.md](./ESBUILD_SETUP.md) "Performance Tips"

### Q: How do I integrate with my CI/CD pipeline?
**A**: See [ESBUILD_INTEGRATION.md](./ESBUILD_INTEGRATION.md) "Integration Patterns"

Examples for:
- GitHub Actions
- Docker
- npm scripts (prebuild, postinstall)

## 📞 Support Resources

### Official Resources
- **esbuild Docs**: https://esbuild.github.io/
- **Node.js ESM**: https://nodejs.org/api/esm.html
- **TypeScript**: https://www.typescriptlang.org/

### Project Resources
- Configuration: `esbuild.config.mjs`
- Troubleshooting: See documentation "Troubleshooting" sections
- Examples: See `ESBUILD_INTEGRATION.md` for code examples

## ✅ Validation Checklist

- [ ] esbuild installed: `npm list esbuild`
- [ ] npm scripts added to package.json
- [ ] First build succeeds: `npm run build:esbuild`
- [ ] Output files created: `ls -la agent-generator/dist/`
- [ ] Can execute bundles: `node agent-generator/dist/generate.mjs`
- [ ] Watch mode works: `npm run watch:esbuild:agent`

## 🚀 Next Steps

1. **Choose your starting point** from the list above
2. **Read the appropriate documentation** (5-20 minutes)
3. **Run a build** to verify everything works
4. **Integrate with your workflow** (optional)

---

**Questions?** Each documentation file has a troubleshooting section. Start there!

**Status**: ✅ Configuration complete, ready to use
