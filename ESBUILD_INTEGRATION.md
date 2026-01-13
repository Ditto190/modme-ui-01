# esbuild Integration Guide

Complete walkthrough for integrating esbuild into your ModMe GenUI Workbench project.

## 📋 What You Get

**esbuild Configuration for**:

- ✅ `agent-generator/` TypeScript CLI tools
- ✅ `scripts/knowledge-management/` documentation utilities
- ✅ `scripts/toolset-management/` validation & detection tools
- ✅ Watch mode for development
- ✅ Minified production bundles
- ✅ Source maps for debugging

## 🚀 5-Minute Setup

### Option A: Automated Setup (Recommended)

**Windows**:

```powershell
.\scripts\setup-esbuild.ps1
```

**Unix/macOS**:

```bash
chmod +x scripts/setup-esbuild.sh
./scripts/setup-esbuild.sh
```

### Option B: Manual Setup

1. **Install esbuild**:

   ```bash
   npm install --save-dev esbuild
   ```

2. **Create output directories**:

   ```bash
   mkdir -p agent-generator/dist
   mkdir -p scripts/knowledge-management/dist
   mkdir -p scripts/toolset-management/dist
   ```

3. **Copy configuration files** (if not already present):
   - `esbuild.config.mjs` — Main configuration file
   - `ESBUILD_SETUP.md` — Detailed documentation
   - `ESBUILD_QUICK_START.md` — Quick reference

4. **Add npm scripts** to your `package.json`:

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

1. **First build**:

   ```bash
   npm run build:esbuild
   ```

2. **Verify bundles created**:

   ```bash
   ls -la agent-generator/dist/
   ls -la scripts/knowledge-management/dist/
   ls -la scripts/toolset-management/dist/
   ```

## 📦 Files Created/Modified

### New Files

- ✅ `esbuild.config.mjs` — Main configuration
- ✅ `ESBUILD_SETUP.md` — Detailed guide
- ✅ `ESBUILD_QUICK_START.md` — Quick reference
- ✅ `ESBUILD_INTEGRATION.md` — This file
- ✅ `scripts/setup-esbuild.ps1` — Windows setup script
- ✅ `scripts/setup-esbuild.sh` — Unix/macOS setup script

### Directories Created (on first build)

- 📁 `agent-generator/dist/` — Agent generator bundles
- 📁 `scripts/knowledge-management/dist/` — Docs tools bundles
- 📁 `scripts/toolset-management/dist/` — Toolset tools bundles

### Modified Files

- **package.json** — Add npm scripts (optional but recommended)

## 🛠️ Common Commands

| Command                                  | Purpose                          |
| ---------------------------------------- | -------------------------------- |
| `npm run build:esbuild`                  | Build all esbuild configs        |
| `npm run build:esbuild:agent`            | Build agent-generator only       |
| `npm run build:esbuild:docs`             | Build docs tools only            |
| `npm run watch:esbuild:agent`            | Watch & rebuild agent on changes |
| `npm run watch:esbuild:docs`             | Watch & rebuild docs on changes  |
| `npm run list:esbuild`                   | List all available configs       |
| `node esbuild.config.mjs build`          | Manual build (no npm script)     |
| `node esbuild.config.mjs watch syncDocs` | Manual watch (no npm script)     |

## 🔗 Integration Points

### 1. Build Pipeline Integration

Make esbuild builds run **before** Next.js build:

```json
{
  "scripts": {
    "prebuild": "npm run build:esbuild",
    "build": "next build"
  }
}
```

Now `npm run build` automatically bundles esbuild configs first.

### 2. Development Workflow

Run in **two terminals**:

**Terminal 1** — React frontend:

```bash
npm run dev:ui
```

**Terminal 2** — Python agent:

```bash
npm run dev:agent
```

**Terminal 3** (optional) — Auto-rebuild esbuild bundles:

```bash
npm run watch:esbuild:agent
```

### 3. CI/CD Integration

**GitHub Actions** example:

```yaml
- name: Install dependencies
  run: npm ci

- name: Build esbuild bundles
  run: npm run build:esbuild

- name: Verify bundles
  run: |
    test -f agent-generator/dist/generate.mjs
    test -f scripts/knowledge-management/dist/sync-docs.mjs

- name: Build Next.js
  run: npm run build

- name: Start services
  run: npm start
```

### 4. Docker Integration

In your `Dockerfile`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build esbuild bundles first
RUN npm run build:esbuild

# Then Next.js
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Configuration Overview

### Build Targets

```
esbuild.config.mjs
├── agentGenerator
│   ├── Input: agent-generator/src/scripts/generate.ts
│   ├── Output: agent-generator/dist/generate.mjs
│   └── Purpose: Compile TypeScript agent CLI
│
├── syncDocs
│   ├── Input: scripts/knowledge-management/sync-docs.js
│   ├── Output: scripts/knowledge-management/dist/sync-docs.mjs
│   └── Purpose: Bundle docs synchronization tool
│
├── validateToolsets
│   ├── Input: scripts/toolset-management/validate-toolsets.js
│   ├── Output: scripts/toolset-management/dist/validate-toolsets.mjs
│   └── Purpose: Validate toolset JSON schemas
│
├── detectChanges
│   ├── Input: scripts/toolset-management/detect-toolset-changes.js
│   ├── Output: scripts/toolset-management/dist/detect-toolset-changes.mjs
│   └── Purpose: Detect new/modified toolsets
│
├── testAliases
│   ├── Input: scripts/toolset-management/test-alias-resolution.js
│   ├── Output: scripts/toolset-management/dist/test-alias-resolution.mjs
│   └── Purpose: Test toolset alias resolution
│
└── generateDiagram
    ├── Input: scripts/knowledge-management/generate-diagram.js
    ├── Output: scripts/knowledge-management/dist/generate-diagram.mjs
    └── Purpose: Generate mermaid diagrams from toolsets
```

### Key Configuration Options

```javascript
{
  bundle: true,                    // Inline dependencies
  minify: process.env.NODE_ENV === "production",
  sourcemap: true,                 // Debug maps
  target: "ES2022",                // Modern JavaScript
  platform: "node",                // Node.js runtime
  format: "esm",                   // ES modules
  external: ["ajv", "glob"],       // Don't bundle these
  outExtension: { ".js": ".mjs" }  // ESM file extension
}
```

## 🔍 Troubleshooting

### Problem: "Cannot find module"

**Solution**: Add to `external` in config:

```javascript
external: ["ajv", "ajv-formats", "glob", "marked"]; // Add missing deps
```

### Problem: Bundle file not found after build

**Solution**: Ensure output directories exist:

```bash
# Windows PowerShell
mkdir -p agent-generator/dist
mkdir -p scripts/knowledge-management/dist

# Unix/macOS
mkdir -p agent-generator/dist
mkdir -p scripts/knowledge-management/dist
```

### Problem: TypeScript compilation errors

**Solution**: Verify TypeScript config is correct. esbuild should pick up `tsconfig.json` automatically.

Check your `tsconfig.json` target:

```json
{
  "compilerOptions": {
    "target": "ES2022", // Should match esbuild target
    "module": "esnext" // ESM format
  }
}
```

### Problem: Watch mode not rebuilding

**Solution**: Ensure files have proper extensions:

- TypeScript: `.ts` or `.tsx`
- JavaScript: `.js` or `.mjs`

Watch only monitors changed files. Verify the file actually changed (save it again).

## 📚 Learn More

- **esbuild Official Docs**: <https://esbuild.github.io/>
- **ESM in Node.js**: <https://nodejs.org/api/esm.html>
- **Detailed Setup Guide**: See `ESBUILD_SETUP.md`
- **Quick Reference**: See `ESBUILD_QUICK_START.md`

## ✅ Validation Checklist

After setup, verify:

- [ ] esbuild installed: `npm list esbuild`
- [ ] Config file exists: `ls esbuild.config.mjs`
- [ ] Output dirs exist: `ls agent-generator/dist/`
- [ ] First build succeeds: `npm run build:esbuild`
- [ ] Bundles created: `ls -la agent-generator/dist/*.mjs`
- [ ] npm scripts added: `npm run build:esbuild:agent`
- [ ] Watch mode works: `npm run watch:esbuild:agent`
- [ ] Can execute bundle: `node agent-generator/dist/generate.mjs --help`

## 🎯 Next Steps

1. **Run initial build**: `npm run build:esbuild`
2. **Add npm scripts** to `package.json` (see above)
3. **Integrate with CI/CD** (GitHub Actions example provided)
4. **Set up watch mode** for development workflow
5. **Read** `ESBUILD_SETUP.md` for advanced options

---

**Questions?** Refer to `ESBUILD_SETUP.md` for detailed configuration reference and troubleshooting.
