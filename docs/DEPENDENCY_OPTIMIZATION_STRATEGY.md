# Dependency Optimization Strategy

> **Last Updated**: January 7, 2026  
> **Status**: Design Phase  
> **Problem**: Large dependencies (node_modules, native binaries) exceed GitHub's 100MB file limit

---

## Executive Summary

We need an optimization pipeline that:

1. **Reduces bundle size** by 70-90% through intelligent transformations
2. **Maintains functionality** (no runtime errors)
3. **Automates via CI/CD** (pre-commit hooks + GitHub Actions)
4. **Documents tradeoffs** (build time vs bundle size vs runtime performance)

---

## Current State Analysis

### Problem Files Identified

| Category         | Example                            | Size      | Issue                    |
| ---------------- | ---------------------------------- | --------- | ------------------------ |
| Native Binaries  | `libonnxruntime_providers_cuda.so` | 327 MB    | Exceeds GitHub limit     |
| WASM Files       | `onnxruntime-web/*.wasm`           | 10-50 MB  | Not optimized            |
| Source Maps      | `node_modules/**/*.map`            | 20-100 MB | Not needed in production |
| TypeScript Defs  | `node_modules/**/*.d.ts`           | 10-30 MB  | Build-only artifacts     |
| Dev Dependencies | Testing/build tools                | Variable  | Not needed at runtime    |

### Current Workaround

- ✅ Transpiled `embeddings.ts` → `dist/embeddings.js` (4.7KB)
- ✅ Added `node_modules/` to `.gitignore`
- ⚠️ Removed large binary from history (history rewrite required)

---

## Optimization Strategies

### 1. Source Map Stripping ⚡ Quick Win

**Impact**: 30-50% size reduction  
**Risk**: Low  
**Effort**: Minimal

```bash
# Strip all source maps from node_modules
find node_modules -name '*.map' -type f -delete

# Alternative: Configure bundler to exclude maps
# esbuild: --sourcemap=external (generates separate .map file)
# webpack: devtool: false in production config
```

**Pros**:

- Immediate size reduction
- No impact on runtime functionality
- Reversible (regenerate from source)

**Cons**:

- Debugging in production harder (keep external maps separately)
- Need separate storage for production debugging

---

### 2. Tree Shaking & Dead Code Elimination 🌳

**Impact**: 40-70% size reduction  
**Risk**: Medium (if configuration wrong)  
**Effort**: Medium

```javascript
// esbuild.config.js
const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  minify: true,
  treeShaking: true,

  // Critical: Mark packages with side effects
  sideEffects: false,

  // External native modules
  external: ["onnxruntime-node", "@mapbox/node-pre-gyp", "*.node"],

  outfile: "dist/bundle.js",
});
```

**Advanced Tree Shaking**:

```json
// package.json
{
  "sideEffects": ["*.css", "*.scss", "src/polyfills.ts"]
}
```

**Pros**:

- Removes unused code automatically
- Works with all modern bundlers
- Compound effect with minification

**Cons**:

- Requires accurate sideEffects declarations
- Can break code with implicit dependencies
- Testing required to verify functionality

---

### 3. Native Binary Runtime Download 📥

**Impact**: 90% size reduction for native deps  
**Risk**: High (network dependency at runtime)  
**Effort**: High

**Strategy**: Download native binaries via postinstall script instead of committing them.

```json
// package.json
{
  "scripts": {
    "postinstall": "node scripts/download-native-binaries.js"
  }
}
```

```javascript
// scripts/download-native-binaries.js
const https = require("https");
const fs = require("fs");
const path = require("path");
const { platform, arch } = process;

const BINARY_MAP = {
  "linux-x64": "https://cdn.example.com/onnxruntime-linux-x64.tar.gz",
  "darwin-arm64": "https://cdn.example.com/onnxruntime-darwin-arm64.tar.gz",
  "win32-x64": "https://cdn.example.com/onnxruntime-win32-x64.zip",
};

const key = `${platform}-${arch}`;
const url = BINARY_MAP[key];

if (!url) {
  console.error(`No binary available for ${key}`);
  process.exit(1);
}

// Download, extract, place in node_modules/.cache/
downloadAndExtract(url, path.join(__dirname, "../node_modules/.cache"));
```

**Pros**:

- No large binaries in Git
- Platform-specific downloads (smaller)
- Can cache in CI/CD

**Cons**:

- Network dependency (fails in offline environments)
- CDN hosting required
- Version management complexity

**Recommended Implementation**:

1. Host binaries on GitHub Releases (same repo)
2. Checksum verification (SHA256)
3. Fallback: Keep minimal binary set in Git LFS

---

### 4. WASM Optimization & Compression 📦

**Impact**: 50-70% size reduction for WASM  
**Risk**: Low  
**Effort**: Medium

```bash
# Install wasm-opt from Binaryen toolkit
npm install -g binaryen

# Optimize WASM files
wasm-opt input.wasm -O3 -o output.wasm

# Compress with Brotli
brotli -q 11 output.wasm

# Load with streaming (faster)
WebAssembly.compileStreaming(fetch('model.wasm.br'))
  .then(module => WebAssembly.instantiate(module));
```

**Advanced: WASM Splitting**

```bash
# Split large WASM into lazy-loadable chunks
wasm-split input.wasm --export-prefix=module_ \
  -o primary.wasm \
  -o secondary.wasm
```

**Pros**:

- Significant size reduction
- Faster load times (streaming)
- Better cache efficiency

**Cons**:

- Build step complexity
- Browser compatibility (streaming API)

---

### 5. AST-Based Code Transformations 🔄

**Impact**: 10-30% additional reduction  
**Risk**: High (can break code)  
**Effort**: High

```javascript
// babel-plugin-strip-debug.js
module.exports = function () {
  return {
    visitor: {
      // Remove console.* statements
      CallExpression(path) {
        const callee = path.node.callee;
        if (
          callee.type === "MemberExpression" &&
          callee.object.name === "console"
        ) {
          path.remove();
        }
      },

      // Remove debug-only code blocks
      IfStatement(path) {
        const test = path.node.test;
        if (test.type === "Identifier" && test.name === "__DEV__") {
          path.remove();
        }
      },
    },
  };
};
```

**Use Cases**:

- Remove development-only code paths
- Inline environment constants
- Remove unused imports/exports
- Strip type annotations (TypeScript → JS)

**Pros**:

- Fine-grained control
- Can remove code bundlers miss
- Works across module boundaries

**Cons**:

- Complex to implement correctly
- Risk of breaking runtime behavior
- Requires thorough testing

---

### 6. Monorepo Build Caching 🚀

**Impact**: 80-90% reduction in CI build time  
**Risk**: Low  
**Effort**: Medium-High

**Tools**: Turborepo, Nx, Rush

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "cache": true
    },
    "optimize": {
      "dependsOn": ["build"],
      "outputs": ["dist/optimized/**"],
      "cache": true
    }
  }
}
```

**Benefits**:

- Skip unchanged packages in CI
- Share cache across team/CI
- Faster local development

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (Week 1) ⚡

**Goal**: 50% size reduction, no risk

1. **Strip Source Maps**

   ```bash
   npm run strip-maps
   ```

2. **Remove Dev Dependencies from Production Installs**

   ```bash
   npm ci --production
   ```

3. **Basic Tree Shaking** (esbuild config)

4. **Update `.gitignore`**
   ```
   node_modules/
   **/*.map
   **/*.d.ts
   dist/cache/
   ```

**Success Metrics**:

- ✅ Repo size < 100 MB
- ✅ CI passes
- ✅ No runtime errors

---

### Phase 2: Native Binary Strategy (Week 2) 📥

**Goal**: Remove all native binaries from Git

1. **Identify Native Dependencies**

   ```bash
   find node_modules -name '*.node' -o -name '*.so' -o -name '*.dylib'
   ```

2. **Implement Download Script**

   - Create `scripts/download-binaries.js`
   - Add to `postinstall` hook
   - Host binaries on GitHub Releases

3. **Git LFS Setup** (fallback for unavoidable binaries)

   ```bash
   git lfs install
   git lfs track "*.node" "*.so" "*.dylib" "*.dll"
   ```

4. **CI Configuration**
   ```yaml
   # .github/workflows/build.yml
   - name: Cache Native Binaries
     uses: actions/cache@v3
     with:
       path: node_modules/.cache
       key: ${{ runner.os }}-binaries-${{ hashFiles('**/package-lock.json') }}
   ```

**Success Metrics**:

- ✅ No native binaries in Git
- ✅ Postinstall works in CI
- ✅ Runtime performance unchanged

---

### Phase 3: Advanced Optimization (Week 3-4) 🔬

**Goal**: 70-90% total size reduction

1. **WASM Optimization Pipeline**

   - Integrate `wasm-opt`
   - Brotli compression
   - Lazy loading for large models

2. **AST Transformations**

   - Babel plugin for debug stripping
   - Constant inlining
   - Dead code elimination

3. **Monorepo Setup** (if applicable)

   - Turborepo/Nx integration
   - Shared build cache
   - Incremental builds

4. **Performance Monitoring**
   - Bundle size tracking in CI
   - Runtime performance benchmarks
   - Build time metrics

**Success Metrics**:

- ✅ Bundle size < 20 MB
- ✅ CI build time < 5 min
- ✅ No performance regressions

---

## Tradeoff Analysis

| Strategy          | Size Reduction | Risk        | Build Time | Runtime Perf | Effort      |
| ----------------- | -------------- | ----------- | ---------- | ------------ | ----------- |
| Strip Source Maps | 30-50%         | ⭐ Low      | +10s       | ✅ None      | ⭐ Minimal  |
| Tree Shaking      | 40-70%         | ⭐⭐ Medium | +30s       | ✅ None      | ⭐⭐ Medium |
| Runtime Download  | 90%            | ⭐⭐⭐ High | +5s        | ⚠️ Network   | ⭐⭐⭐ High |
| WASM Optimization | 50-70%         | ⭐ Low      | +1m        | ✅ Faster    | ⭐⭐ Medium |
| AST Transforms    | 10-30%         | ⭐⭐⭐ High | +2m        | ✅ Faster    | ⭐⭐⭐ High |
| Monorepo Cache    | N/A            | ⭐ Low      | -80%       | ✅ None      | ⭐⭐⭐ High |

---

## Tooling Recommendations

### Essential Tools

```json
{
  "devDependencies": {
    "esbuild": "^0.24.0", // Bundling + tree shaking
    "binaryen": "^120.0.0", // WASM optimization (wasm-opt)
    "compression": "^1.7.4", // Brotli/Gzip compression
    "node-fetch": "^3.3.2", // Binary downloads
    "turbo": "^2.3.3" // Monorepo caching (optional)
  }
}
```

### Scripts to Add

```json
{
  "scripts": {
    "optimize": "npm run strip-maps && npm run bundle && npm run compress",
    "strip-maps": "find node_modules dist -name '*.map' -type f -delete",
    "bundle": "esbuild src/index.ts --bundle --minify --tree-shaking --outfile=dist/bundle.js",
    "compress": "brotli dist/*.js dist/*.wasm",
    "download-binaries": "node scripts/download-native-binaries.js",
    "postinstall": "npm run download-binaries"
  }
}
```

---

## CI/CD Integration

### Pre-Commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
npm run optimize
git add dist/
```

### GitHub Actions Workflow

```yaml
# .github/workflows/optimize-bundle.yml
name: Optimize Bundle

on:
  pull_request:
    branches: [main, develop]

jobs:
  optimize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci --production

      - name: Download native binaries
        run: npm run download-binaries

      - name: Optimize bundle
        run: npm run optimize

      - name: Check bundle size
        run: |
          BUNDLE_SIZE=$(du -sh dist/ | cut -f1)
          echo "Bundle size: $BUNDLE_SIZE"

          # Fail if over 100MB
          if [ $(du -sb dist/ | cut -f1) -gt 104857600 ]; then
            echo "Bundle exceeds 100MB limit!"
            exit 1
          fi

      - name: Upload optimized bundle
        uses: actions/upload-artifact@v4
        with:
          name: optimized-bundle
          path: dist/
          retention-days: 7
```

---

## Testing Strategy

### Automated Tests

1. **Bundle Size Regression**

   ```javascript
   // tests/bundle-size.test.js
   const fs = require("fs");
   const path = require("path");

   test("bundle size under 50MB", () => {
     const distSize = getDirectorySize("dist/");
     expect(distSize).toBeLessThan(50 * 1024 * 1024);
   });
   ```

2. **Runtime Functionality**

   ```javascript
   // tests/embeddings.test.js
   const { generateEmbedding } = require("../dist/embeddings.js");

   test("embeddings work after optimization", async () => {
     const result = await generateEmbedding("test query");
     expect(result).toHaveLength(768);
   });
   ```

3. **Binary Download Verification**

   ```javascript
   // tests/binaries.test.js
   test("native binaries downloaded correctly", () => {
     const binaryPath = "node_modules/.cache/onnxruntime";
     expect(fs.existsSync(binaryPath)).toBe(true);

     // Verify checksum
     const hash = calculateSHA256(binaryPath);
     expect(hash).toBe(EXPECTED_SHA256);
   });
   ```

---

## Monitoring & Rollback

### Bundle Size Tracking

```yaml
# .github/workflows/bundle-size-report.yml
- name: Report bundle size
  uses: andresz1/size-limit-action@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Performance Metrics

```javascript
// scripts/benchmark.js
console.time("embeddings-cold-start");
const { generateEmbedding } = require("./dist/embeddings.js");
console.timeEnd("embeddings-cold-start");

console.time("embedding-generation");
await generateEmbedding("test query");
console.timeEnd("embedding-generation");
```

### Rollback Plan

If optimization breaks functionality:

1. **Revert commit** with optimization changes
2. **Disable postinstall** temporarily
3. **Fall back to Git LFS** for native binaries
4. **Debug in isolation** (separate branch)
5. **Re-enable incrementally** with additional tests

---

## References

- [esbuild Documentation](https://esbuild.github.io/)
- [Binaryen wasm-opt](https://github.com/WebAssembly/binaryen)
- [Turborepo Guide](https://turbo.build/repo/docs)
- [Git LFS](https://git-lfs.github.com/)
- [Webpack Tree Shaking](https://webpack.js.org/guides/tree-shaking/)

---

## Discussion Questions

1. **Should we adopt a monorepo architecture?**

   - Pros: Better build caching, shared dependencies
   - Cons: Migration effort, tooling complexity

2. **Git LFS vs Runtime Downloads?**

   - Git LFS: Simpler, more reliable
   - Runtime: Smaller repo, platform-specific

3. **Build artifact versioning strategy?**

   - Commit optimized bundles?
   - Generate on-demand in CI?
   - Hybrid approach?

4. **CI build time vs bundle size tradeoff?**
   - Current CI: ~3-5 min
   - With aggressive optimization: ~8-12 min
   - Acceptable increase?

---

**Next Action**: Review strategies, pick Phase 1 tasks, implement and test.
