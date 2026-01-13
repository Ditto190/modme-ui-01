# esbuild Quick Start

## 1. Install esbuild

```bash
npm install --save-dev esbuild
```

## 2. Add npm Scripts to package.json

Add these to the `"scripts"` section:

```json
{
  "scripts": {
    "build:esbuild": "node esbuild.config.mjs build",
    "build:esbuild:agent": "node esbuild.config.mjs build agentGenerator",
    "build:esbuild:docs": "node esbuild.config.mjs build syncDocs",
    "build:esbuild:tools": "node esbuild.config.mjs build validateToolsets detectChanges testAliases generateDiagram",
    "watch:esbuild:agent": "node esbuild.config.mjs watch agentGenerator",
    "watch:esbuild:docs": "node esbuild.config.mjs watch syncDocs"
  }
}
```

## 3. Create Output Directories

esbuild needs these directories to exist:

```bash
# Windows
mkdir -p agent-generator/dist
mkdir -p scripts/knowledge-management/dist
mkdir -p scripts/toolset-management/dist

# Unix/macOS
mkdir agent-generator/dist
mkdir -p scripts/knowledge-management/dist
mkdir -p scripts/toolset-management/dist
```

## 4. First Build

```bash
npm run build:esbuild
```

Expected output:

```
Building agentGenerator...
  Entry: agent-generator/src/scripts/generate.ts
  Output: agent-generator/dist/generate.mjs
✓ agentGenerator built successfully

Building syncDocs...
✓ syncDocs built successfully

... (more configs)
```

## 5. Verify Bundles

Check that bundles were created:

```bash
# Windows PowerShell
Get-Item agent-generator/dist/*.mjs
Get-Item scripts/knowledge-management/dist/*.mjs
Get-Item scripts/toolset-management/dist/*.mjs

# Unix/macOS
ls -lh agent-generator/dist/*.mjs
ls -lh scripts/knowledge-management/dist/*.mjs
ls -lh scripts/toolset-management/dist/*.mjs
```

## 6. Update npm Scripts (Optional)

To integrate with your build pipeline, update these in `package.json`:

```json
{
  "scripts": {
    "prebuild": "npm run build:esbuild",
    "build": "next build",
    "postinstall": "npm run build:esbuild && npm run install:agent"
  }
}
```

## 7. Watch Mode (Development)

For faster development, use watch mode:

```bash
# Watch agent-generator changes
npm run watch:esbuild:agent

# In another terminal, watch docs scripts
npm run watch:esbuild:docs
```

Files rebuild automatically on save.

## 8. Usage Reference

Once built, use the bundles like this:

```bash
# Agent generator
node agent-generator/dist/generate.mjs

# Sync docs
node scripts/knowledge-management/dist/sync-docs.mjs --validate-only

# Validate toolsets
node scripts/toolset-management/dist/validate-toolsets.mjs

# Detect changes
node scripts/toolset-management/dist/detect-toolset-changes.mjs

# Generate diagram
node scripts/knowledge-management/dist/generate-diagram.mjs --format svg
```

## Next Steps

See [ESBUILD_SETUP.md](./ESBUILD_SETUP.md) for detailed configuration options, troubleshooting, and advanced usage.
