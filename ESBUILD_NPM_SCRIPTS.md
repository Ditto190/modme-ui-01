# package.json npm Scripts Template

Copy and paste the following into your `package.json` `"scripts"` section.

## Complete npm Scripts

Add these to your existing `"scripts"` object in `package.json`:

```json
"build:esbuild": "node esbuild.config.mjs build",
"build:esbuild:agent": "node esbuild.config.mjs build agentGenerator",
"build:esbuild:docs": "node esbuild.config.mjs build syncDocs",
"build:esbuild:tools": "node esbuild.config.mjs build validateToolsets detectChanges testAliases generateDiagram",
"watch:esbuild:agent": "node esbuild.config.mjs watch agentGenerator",
"watch:esbuild:docs": "node esbuild.config.mjs watch syncDocs",
"list:esbuild": "node esbuild.config.mjs list"
```

## Optional: Integration Scripts

To auto-build esbuild bundles before your Next.js build:

```json
"prebuild": "npm run build:esbuild"
```

Or to auto-build on `npm install`:

```json
"postinstall": "npm run build:esbuild && npm run install:agent"
```

## Example: Full package.json Scripts Section

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:ui\" \"npm run dev:agent\" --names ui,agent --prefix-colors blue,green --kill-others",
    "dev:all": "concurrently \"npm run dev:ui\" \"npm run dev:agent\" \"npm run dev:vtcode\" --names ui,agent,vtcode --prefix-colors blue,green,yellow --kill-others",
    "dev:debug": "LOG_LEVEL=debug npm run dev",
    "dev:agent": "bash ./scripts/run-agent.sh",
    "dev:ui": "next dev --turbopack",
    "dev:vtcode": "vtcode --mcp-server --port 8080 || echo 'VT Code not installed. Run: npm run vtcode:install'",
    "build": "next build",
    "start": "next start",
    "lint": "npm run lint:ts && npm run lint:python",
    "lint:ts": "eslint .",
    "lint:python": "ruff check .",
    "lint:fix": "eslint . --fix && ruff check --fix .",
    "format": "prettier --write .  && ruff format .",
    "check": "npm run lint && npm run format",
    "install:all": "./scripts/install-all.sh || scripts\\install-all.bat",
    "install:agent": "./scripts/setup-agent.sh || scripts\\setup-agent.bat",
    "quick-start": "./scripts/quick-start.sh || scripts\\quick-start.bat",
    "postinstall": "npm run install:agent",
    "vtcode:install": "echo 'Please install VT Code manually: cargo install vtcode OR npm install -g vtcode OR brew install vtcode'",
    "validate:toolsets": "node scripts/toolset-management/validate-toolsets.js",
    "validate:naming": "node scripts/toolset-management/validate-naming.js",
    "test:aliases": "node scripts/toolset-management/test-alias-resolution.js",
    "detect:changes": "node scripts/toolset-management/detect-toolset-changes.js",
    "docs:sync": "node scripts/knowledge-management/sync-docs.js --validate-only && node scripts/knowledge-management/sync-docs.js --direction json-to-md",
    "docs:md-to-json": "node scripts/knowledge-management/sync-docs.js --direction md-to-json",
    "docs:json-to-md": "node scripts/knowledge-management/sync-docs.js --direction json-to-md",
    "docs:diagram": "node scripts/knowledge-management/generate-diagram.js",
    "docs:diagram:svg": "node scripts/knowledge-management/generate-diagram.js --format svg",
    "docs:all": "npm run docs:sync && npm run docs:diagram:svg",
    "search:toolset": "bash scripts/knowledge-management/search-toolsets.sh",
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

## Usage After Adding Scripts

```bash
# Build all esbuild bundles
npm run build:esbuild

# Build specific target
npm run build:esbuild:agent

# Watch for changes (auto-rebuild)
npm run watch:esbuild:agent

# List available configurations
npm run list:esbuild

# Build all (including Next.js) with integration
npm run build  # This will run "prebuild" first if configured
```

## Quick Copy-Paste for Existing package.json

Find the `"scripts"` section and add these lines (maintaining proper JSON comma/brace syntax):

```
    "build:esbuild": "node esbuild.config.mjs build",
    "build:esbuild:agent": "node esbuild.config.mjs build agentGenerator",
    "build:esbuild:docs": "node esbuild.config.mjs build syncDocs",
    "build:esbuild:tools": "node esbuild.config.mjs build validateToolsets detectChanges testAliases generateDiagram",
    "watch:esbuild:agent": "node esbuild.config.mjs watch agentGenerator",
    "watch:esbuild:docs": "node esbuild.config.mjs watch syncDocs",
    "list:esbuild": "node esbuild.config.mjs list"
```

Place them after the existing scripts, before the closing brace.

## ✅ Verify

After adding scripts, verify they work:

```bash
npm run list:esbuild
# Should output: Available configurations: agentGenerator, syncDocs, ...

npm run build:esbuild
# Should build all bundles

npm run watch:esbuild:agent
# Should start watching for changes (press Ctrl+C to exit)
```

Done! 🎉
