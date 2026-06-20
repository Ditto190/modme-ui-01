# esbuild Configuration Guide — ModMe GenUI Workbench

**Updated**: January 11, 2026  
**Purpose**: Bundle TypeScript/JavaScript tooling scripts and agent-generator utilities with esbuild

## Overview

This repository uses **esbuild** to bundle:

- **agent-generator** CLI tools (TypeScript → ESM)
- **Knowledge management** scripts (docs sync, diagram generation)
- **Toolset management** scripts (validation, change detection)

esbuild replaces heavier bundlers (webpack, Rollup) for **fast, minimal CLI tooling**.

## Installation

esbuild is already listed in `package.json` devDependencies. Install if needed:

```bash
npm install --save-dev esbuild
```

## Configuration File

**Location**: `esbuild.config.mjs` (ESM format)

### Structure

```javascript
export const buildConfigs = {
  agentGenerator: { ... },
  syncDocs: { ... },
  validateToolsets: { ... },
  detectChanges: { ... },
  testAliases: { ... },
  generateDiagram: { ... },
};
```

Each config defines:

- **entryPoints**: Source file(s) to bundle
- **outfile**: Output bundle path
- **external**: Dependencies to NOT bundle (e.g., `ajv`, `glob`)
- **target/format**: `ES2022` + `esm` (modern Node.js)

## Usage

### Build All Configurations

```bash
node esbuild.config.mjs build
```

Outputs:

- `agent-generator/dist/generate.mjs`
- `scripts/knowledge-management/dist/*.mjs`
- `scripts/toolset-management/dist/*.mjs`

### Build Single Configuration

```bash
node esbuild.config.mjs build agentGenerator
```

### Watch Mode (Auto-rebuild)

```bash
node esbuild.config.mjs watch agentGenerator
```

Keep watching for changes; press `Ctrl+C` to exit.

### List Available Configs

```bash
node esbuild.config.mjs list
```

## npm Scripts (Recommended)

Add to `package.json`:

```json
{
  "scripts": {
    "build:esbuild": "node esbuild.config.mjs build",
    "build:esbuild:agent": "node esbuild.config.mjs build agentGenerator",
    "watch:esbuild": "node esbuild.config.mjs watch agentGenerator",
    "watch:esbuild:all": "concurrently \"npm run watch:esbuild:agent\" \"npm run watch:esbuild:docs\"",
    "watch:esbuild:docs": "node esbuild.config.mjs watch syncDocs"
  }
}
```

Then run:

```bash
npm run build:esbuild
npm run watch:esbuild
```

## Build Targets Explained

### 1. **agentGenerator** (agent-generator/src/scripts/generate.ts)

- **Purpose**: Compile TypeScript agent generator CLI
- **Input**: `agent-generator/src/scripts/generate.ts`
- **Output**: `agent-generator/dist/generate.mjs`
- **Usage**: `node agent-generator/dist/generate.mjs`

### 2. **syncDocs** (scripts/knowledge-management/sync-docs.js)

- **Purpose**: Bundle docs synchronization tool
- **External deps**: `ajv`, `ajv-formats`, `marked`, `handlebars`, `glob`
- **Output**: `scripts/knowledge-management/dist/sync-docs.mjs`
- **Usage**: `node scripts/knowledge-management/dist/sync-docs.mjs --validate-only`

### 3. **validateToolsets** (scripts/toolset-management/validate-toolsets.js)

- **Purpose**: Validate toolset JSON schemas
- **External deps**: `ajv`, `ajv-formats`
- **Output**: `scripts/toolset-management/dist/validate-toolsets.mjs`
- **Usage**: `node scripts/toolset-management/dist/validate-toolsets.mjs`

### 4. **detectChanges** (scripts/toolset-management/detect-toolset-changes.js)

- **Purpose**: Detect new/modified toolsets
- **External deps**: `glob`
- **Output**: `scripts/toolset-management/dist/detect-toolset-changes.mjs`
- **Usage**: `node scripts/toolset-management/dist/detect-toolset-changes.mjs`

### 5. **testAliases** (scripts/toolset-management/test-alias-resolution.js)

- **Purpose**: Test toolset alias resolution
- **External deps**: None
- **Output**: `scripts/toolset-management/dist/test-alias-resolution.mjs`
- **Usage**: `node scripts/toolset-management/dist/test-alias-resolution.mjs`

### 6. **generateDiagram** (scripts/knowledge-management/generate-diagram.js)

- **Purpose**: Generate mermaid diagrams from toolset registry
- **External deps**: `glob`
- **Output**: `scripts/knowledge-management/dist/generate-diagram.mjs`
- **Usage**: `node scripts/knowledge-management/dist/generate-diagram.mjs --format svg`

## Configuration Options Explained

### Shared Defaults

```javascript
const sharedOptions = {
  bundle: true, // Inline dependencies
  minify: process.env.NODE_ENV === "production", // Minify in prod
  sourcemap: process.env.NODE_ENV !== "production", // Debug maps in dev
  target: "ES2022", // Modern JavaScript
  platform: "node", // Node.js runtime
  format: "esm", // ES modules
  external: ["esbuild"], // Don't bundle esbuild
};
```

### Per-Config Overrides

```javascript
{
  entryPoints: ["src/index.ts"],           // Input file(s)
  outfile: "dist/bundle.mjs",              // Output bundle
  outExtension: { ".js": ".mjs" },         // Use .mjs for ESM
  external: ["ajv", "glob"],               // External deps (in node_modules)
}
```

**Note**: Externals are installed via `npm` and loaded at runtime. They reduce bundle size.

## Integration with Build Pipeline

### 1. Auto-run before `npm run build`

Update `package.json`:

```json
{
  "scripts": {
    "prebuild": "npm run build:esbuild",
    "build": "next build"
  }
}
```

### 2. Auto-run on postinstall

```json
{
  "scripts": {
    "postinstall": "npm run build:esbuild && npm run install:agent"
  }
}
```

### 3. CI/CD Integration

In GitHub Actions:

```yaml
- name: Build esbuild bundles
  run: npm run build:esbuild

- name: Verify bundles exist
  run: |
    test -f agent-generator/dist/generate.mjs
    test -f scripts/knowledge-management/dist/sync-docs.mjs
```

## Troubleshooting

### Error: "Cannot find module"

**Cause**: Module is bundled but not installed, or missing from `external` list.

**Solution**:

1. If it's a dev dependency, add to `external`
2. If it should be bundled, remove from `external`
3. Ensure the module is listed in `package.json` devDependencies

```javascript
external: ["ajv", "ajv-formats", "glob"]; // Add missing deps here
```

### Error: "ERR_MODULE_NOT_FOUND"

**Cause**: Output `.mjs` file not found or wrong path.

**Solution**: Verify output path in config:

```bash
ls -la scripts/knowledge-management/dist/
ls -la agent-generator/dist/
```

Ensure parent directories exist (create if needed):

```bash
mkdir -p agent-generator/dist
mkdir -p scripts/knowledge-management/dist
mkdir -p scripts/toolset-management/dist
```

### Error: "Unknown file extension"

**Cause**: esbuild doesn't recognize file type.

**Solution**: Ensure loader is correct in config. For TypeScript:

```javascript
{
  entryPoints: ["src/index.ts"],
  loader: { ".ts": "ts" }, // Explicit loader
}
```

### Bundle Too Large

**Solution**: Increase externals to prevent bundling:

```javascript
external: ["ajv", "ajv-formats", "marked", "handlebars", "glob", "typescript"];
```

## Performance Tips

### 1. **Use `external` for npm packages**

Don't bundle packages from `node_modules`. They're already installed:

```javascript
external: ["ajv", "glob", "marked"]; // ✅ Better: smaller bundle
```

### 2. **Enable minification in production**

```bash
NODE_ENV=production npm run build:esbuild
```

### 3. **Use watch mode during development**

```bash
npm run watch:esbuild
```

Auto-rebuilds on file changes (faster than manual rebuilds).

### 4. **Check bundle size**

```bash
du -sh agent-generator/dist/generate.mjs
du -sh scripts/knowledge-management/dist/*.mjs
```

## Advanced Configuration

### Tree-shaking

esbuild performs tree-shaking by default. To preserve all exports:

```javascript
{
  // ...
  preserveUsages: true, // Keep unused exports
}
```

### Source Maps

Control debug information:

```javascript
{
  sourcemap: true,        // Include source maps (.map files)
  sourcesContent: true,   // Include original source code in maps
}
```

### Plugins

Add custom esbuild plugins:

```javascript
import { esbuildPlugin } from "some-package";

export const buildConfigs = {
  myConfig: {
    // ...
    plugins: [esbuildPlugin()],
  },
};
```

## Comparison with Next.js Build

| Aspect       | Next.js            | esbuild (this config)        |
| ------------ | ------------------ | ---------------------------- |
| **Input**    | React + TypeScript | CLI scripts, agent-generator |
| **Output**   | Optimized SPA      | Standalone `.mjs` files      |
| **Bundler**  | SWC/Turbopack      | esbuild                      |
| **Target**   | Browser + Node.js  | Node.js only                 |
| **Use Case** | Web application    | Build tooling, scripts       |

## See Also

- **esbuild Docs**: <https://esbuild.github.io/>
- **TypeScript Support**: esbuild has built-in `.ts` transpilation (no tsc needed)
- **ESM Format**: ECMAScript modules (native Node.js 22.9.0+)

## Quick Reference

```bash
# Build everything
node esbuild.config.mjs build

# Watch one config
node esbuild.config.mjs watch agentGenerator

# List configs
node esbuild.config.mjs list

# Using npm scripts
npm run build:esbuild
npm run watch:esbuild
```
