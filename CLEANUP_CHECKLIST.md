# Pre-Commit Cleanup Checklist

> **Final verification before creating PR for porting-ready monorepo**

**Date**: January 3, 2026  
**Branch**: `feature/part-02-workbench-expansion-save-copilot-20260102-2028`  
**PR Title**: `feat: Add Knowledge Base Context Mapper + Codebase Indexing for Porting`

---

## 📋 Documentation Checklist

### Porting Documentation

- [x] **PORTING_GUIDE.md** created (complete integration guide)
  - [x] Quick Start section
  - [x] Architecture overview with diagrams
  - [x] Portable components catalog (7 components)
  - [x] Integration patterns (5 patterns)
  - [x] Dependency map
  - [x] Migration checklist
  - [x] Common porting scenarios (4 scenarios)
  - [x] Configuration templates
  - [x] Support section

- [x] **CODEBASE_INDEX.md** created (searchable codebase inventory)
  - [x] Quick navigation tables
  - [x] Complete directory structure
  - [x] Entry points documentation (6 entry points)
  - [x] Component catalog (React + Python)
  - [x] Module dependency graph
  - [x] API contracts (5 contracts)
  - [x] Configuration files reference
  - [x] Documentation index
  - [x] Search index (by keyword, by extension)
  - [x] Code metrics
  - [x] Development workflows

- [x] **COMPONENT_MANIFEST.json** created (machine-readable registry)
  - [x] 7 portable components defined
  - [x] 5 integration patterns
  - [x] Complete dependency lists
  - [x] API contracts in JSON format
  - [x] Code metrics
  - [x] Porting checklist
  - [x] External resources

- [x] **README.md** updated
  - [x] Added porting ready badge
  - [x] Link to PORTING_GUIDE.md
  - [x] Link to CODEBASE_INDEX.md

---

## 🔍 Code Quality Checklist

### TypeScript

- [ ] **Type checking passes**

  ```bash
  npx tsc --noEmit
  ```

  - [ ] No errors in `src/`
  - [ ] No errors in `agent-generator/src/`
  - [ ] No errors in `scripts/knowledge-management/`

- [ ] **ESLint passes**

  ```bash
  npm run lint
  ```

  - [ ] Fix any ESLint errors
  - [ ] Address any warnings

### Python

- [ ] **Ruff linting passes**

  ```bash
  cd agent
  uv run ruff check .
  ```

  - [ ] No linting errors
  - [ ] Format code: `uv run ruff format .`

- [ ] **Python tests pass**

  ```bash
  cd agent
  uv run pytest
  ```

### Knowledge Base System

- [ ] **KB tests pass**

  ```bash
  cd scripts/knowledge-management
  npm test
  ```

  - [ ] All 4 test cases pass (StatCard, Toolset, State Sync, ChartCard)
  - [ ] 100% test coverage maintained

---

## 🧪 Validation Checklist

### Toolset Management

- [ ] **Toolset validation passes**

  ```bash
  npm run validate:toolsets
  ```

  - [ ] JSON schema validation
  - [ ] No circular dependencies
  - [ ] All referenced tools exist

- [ ] **Documentation sync**

  ```bash
  npm run docs:all
  ```

  - [ ] Markdown generated from JSON
  - [ ] Diagram generated
  - [ ] No validation errors

### Build Verification

- [ ] **Next.js build succeeds**

  ```bash
  npm run build
  ```

  - [ ] No build errors
  - [ ] Static export succeeds

- [ ] **Development servers start**

  ```bash
  npm run dev
  ```

  - [ ] Python agent starts on :8000
  - [ ] Next.js starts on :3000
  - [ ] No startup errors

---

## 📦 File Organization Checklist

### New Files Created

- [x] `PORTING_GUIDE.md` (root)
- [x] `CODEBASE_INDEX.md` (root)
- [x] `COMPONENT_MANIFEST.json` (root)
- [x] `CLEANUP_CHECKLIST.md` (root) - this file

### Existing Files Modified

- [x] `README.md` - Added porting section

### Files to Review

- [ ] **Configuration files**
  - [ ] `package.json` - All scripts present
  - [ ] `tsconfig.json` - Path aliases correct
  - [ ] `agent/pyproject.toml` - Dependencies correct

- [ ] **.gitignore**
  - [ ] ChromaDB data excluded (`chroma_data/`)
  - [ ] Output chunks excluded (`output_chunks/`)
  - [ ] Lock files excluded (package-lock, yarn.lock, etc.)
  - [ ] Node modules excluded
  - [ ] Python cache excluded

---

## 🗂️ ChromaDB Indexing Checklist

### Preparation

- [ ] **Generate code chunks**

  ```bash
  # Option 1: Use pykomodo (if installed)
  pykomodo generate --input . --output output_chunks/chunks.jsonl

  # Option 2: Use custom chunking script (to be created)
  python scripts/generate_chunks.py --output output_chunks/chunks.jsonl
  ```

- [ ] **Verify chunks.jsonl format**
  - [ ] Each line is valid JSON
  - [ ] Has required fields: `id`, `text`, `metadata`
  - [ ] Metadata includes: `file`, `type`, `name`

### Ingestion

- [ ] **Set Google API key**

  ```bash
  export GOOGLE_API_KEY="your-key-here"
  # or add to .env file
  ```

- [ ] **Run ingestion script**

  ```bash
  python scripts/ingest_chunks.py \
    --mode persistent \
    --persist-dir ./chroma_data \
    --chunks-file output_chunks/chunks.jsonl \
    --embedding-dim 768
  ```

- [ ] **Verify collections created**
  - [ ] `code_index` collection
  - [ ] `agent_tools` collection (optional)
  - [ ] `documentation` collection (optional)
  - [ ] `workflows` collection (optional)

- [ ] **Test semantic search**

  ```python
  import chromadb
  client = chromadb.PersistentClient(path="./chroma_data")
  collection = client.get_collection("code_index")
  results = collection.query(query_texts=["StatCard component"], n_results=5)
  print(results)
  ```

---

## 🚀 GitHub Actions Checklist

### Workflows to Verify

- [ ] **issue-labeler.yml**
  - [ ] KB analysis step present
  - [ ] Node.js version correct (22)
  - [ ] TypeScript build succeeds

- [ ] **toolset-validate.yml**
  - [ ] Runs on PR
  - [ ] Validates toolsets.json
  - [ ] Checks aliases

- [ ] **toolset-update.yml**
  - [ ] Runs on push to main
  - [ ] Detects new toolsets
  - [ ] Updates documentation

- [ ] **toolset-deprecate.yml**
  - [ ] Manual workflow dispatch
  - [ ] Creates aliases
  - [ ] Generates migration guide

---

## 🔐 Security Checklist

### Secrets Management

- [ ] **No hardcoded secrets**
  - [ ] Check all .py files
  - [ ] Check all .ts files
  - [ ] Check all .json files
  - [ ] Check all .yaml files

- [ ] **.env.example up to date**
  - [ ] All required keys listed
  - [ ] No actual values present

- [ ] **GitHub Secrets configured** (for CI/CD)
  - [ ] `GOOGLE_API_KEY` (for embeddings)
  - [ ] Any other required secrets

### Dependency Audit

- [ ] **npm audit**

  ```bash
  npm audit
  # Fix any high/critical vulnerabilities
  npm audit fix
  ```

- [ ] **Python dependencies**

  ```bash
  cd agent
  uv run pip-audit  # if available
  ```

---

## 📝 Documentation Cross-Reference Checklist

### Internal Links Verified

- [ ] **PORTING_GUIDE.md links**
  - [x] Link to CODEBASE_INDEX.md
  - [x] Link to COMPONENT_MANIFEST.json
  - [x] Links to docs/ files
  - [x] Links to agent-generator/ docs

- [ ] **CODEBASE_INDEX.md links**
  - [x] Link to PORTING_GUIDE.md
  - [x] Links to source files
  - [x] Links to documentation

- [ ] **README.md links**
  - [x] Link to PORTING_GUIDE.md
  - [x] Link to CODEBASE_INDEX.md
  - [ ] Other links valid

### External Links Verified

- [ ] **CopilotKit docs** (<https://docs.copilotkit.ai/>)
- [ ] **Google ADK docs** (<https://ai.google.dev/adk/docs>)
- [ ] **ChromaDB docs** (<https://docs.trychroma.com/>)
- [ ] **Zod docs** (<https://zod.dev/>)

---

## 🧹 Cleanup Tasks

### Remove Temporary Files

- [ ] **Remove debug logs**
  - [ ] Check for `console.log` in production code
  - [ ] Check for `print()` statements in Python

- [ ] **Remove commented code**
  - [ ] Review and remove old code comments
  - [ ] Keep only meaningful comments

- [ ] **Remove unused files**
  - [ ] Old test files
  - [ ] Backup files (_.bak,_.old)
  - [ ] Temporary scripts

### Code Formatting

- [ ] **Format TypeScript**

  ```bash
  npx prettier --write "**/*.{ts,tsx,js,jsx,json,css,md}"
  ```

- [ ] **Format Python**

  ```bash
  cd agent
  uv run ruff format .
  ```

- [ ] **Format Markdown**

  ```bash
  npx prettier --write "**/*.md"
  ```

---

## 📊 Final Review Checklist

### Documentation Completeness

- [x] **Porting Guide** - Complete and detailed
- [x] **Codebase Index** - Comprehensive and searchable
- [x] **Component Manifest** - Machine-readable and accurate
- [ ] **README** - Updated with porting information
- [ ] **All links verified** - No broken links

### Code Quality

- [ ] **TypeScript** - No type errors
- [ ] **Python** - Passes linting
- [ ] **Tests** - All pass (100%)
- [ ] **Build** - Succeeds without warnings

### ChromaDB Integration

- [ ] **Chunks generated** - Format validated
- [ ] **Ingestion completed** - Collections created
- [ ] **Search tested** - Results correct

### GitHub Actions

- [ ] **All workflows** - Syntax valid
- [ ] **Secrets configured** - For CI/CD

### Git

- [ ] **All changes staged**

  ```bash
  git status
  git add .
  ```

- [ ] **Commit message prepared**

  ```
  feat: Add Knowledge Base Context Mapper + Codebase Indexing for Porting

  - Implement KB semantic issue enrichment (9 concepts, 30+ keywords)
  - Add comprehensive porting documentation (PORTING_GUIDE.md, CODEBASE_INDEX.md)
  - Create machine-readable component manifest (COMPONENT_MANIFEST.json)
  - Integrate ChromaDB indexing with Gemini embeddings
  - Add toolset management system with deprecation support
  - Include GitHub Actions workflows for automation
  - Document 7 portable components with integration patterns
  - Achieve 100% KB test coverage (4/4 tests pass)
  - Total: ~26,700 LoC across 100+ files

  Components ready for porting:
  - Knowledge Base System (standalone)
  - Component Registry (React 19+)
  - Toolset Management (JSON-based)
  - Schema Crawler (Zod generator)
  - ChromaDB Indexing (semantic search)
  - GenAI Toolbox (YAML config)
  - Python ADK Agent (requires ADK)

  See PORTING_GUIDE.md for integration instructions.
  ```

- [ ] **Push to remote**

  ```bash
  git push origin feature/part-02-workbench-expansion-save-copilot-20260102-2028
  ```

---

## 🚀 Pull Request Checklist

### PR Creation

- [ ] **Title**: `feat: Add Knowledge Base Context Mapper + Codebase Indexing for Porting`

- [ ] **Description**:

  ```markdown
  ## 🎯 Overview

  This PR adds comprehensive Knowledge Base system for semantic issue enrichment, plus complete codebase indexing infrastructure for porting components to other projects.

  ## ✨ Features Added

  ### Knowledge Base Context Mapper

  - Semantic issue analysis (9 concepts, 30+ keywords)
  - Automatic label suggestions
  - File/doc linking
  - GitHub Actions integration
  - 100% test coverage (4/4 tests pass)

  ### Codebase Indexing & Porting

  - PORTING_GUIDE.md - Complete integration guide
  - CODEBASE_INDEX.md - Searchable codebase inventory
  - COMPONENT_MANIFEST.json - Machine-readable registry
  - ChromaDB integration with Gemini embeddings
  - 7 portable components documented
  - 5 integration patterns

  ### Toolset Management

  - JSON-based tool registry
  - Deprecation aliases
  - Validation workflows
  - Documentation generation

  ## 📦 Portable Components

  1. **Knowledge Base System** - Standalone (Node.js only)
  2. **Component Registry** - React 19+ components
  3. **Toolset Management** - JSON configuration
  4. **Schema Crawler** - JSON Schema → Zod converter
  5. **ChromaDB Indexing** - Semantic code search
  6. **GenAI Toolbox** - YAML tool config
  7. **Python ADK Agent** - Agent tools

  ## 🧪 Testing

  - All KB tests pass (4/4)
  - TypeScript compiles without errors
  - Python passes linting
  - Toolset validation succeeds

  ## 📊 Metrics

  - Files: 100+
  - Lines of Code: ~26,700
  - Documentation: ~15,000 LoC
  - Test Coverage: 100% (KB system)

  ## 📚 Documentation

  - [PORTING_GUIDE.md](PORTING_GUIDE.md) - How to port components
  - [CODEBASE_INDEX.md](CODEBASE_INDEX.md) - Searchable index
  - [COMPONENT_MANIFEST.json](COMPONENT_MANIFEST.json) - Machine-readable registry
  - [docs/KNOWLEDGE_BASE_INTEGRATION.md](docs/KNOWLEDGE_BASE_INTEGRATION.md) - KB integration guide

  ## 🔗 Related Issues

  Closes #XXX (if applicable)
  ```

- [ ] **Labels added**:
  - `enhancement`
  - `documentation`
  - `knowledge-base`
  - `porting`

- [ ] **Reviewers assigned**

- [ ] **Linked to project board** (if applicable)

---

## ✅ Final Verification

### Before Creating PR

- [ ] All tests pass
- [ ] All linting passes
- [ ] Build succeeds
- [ ] Documentation complete
- [ ] Links verified
- [ ] Secrets secure
- [ ] Code formatted
- [ ] Commit message ready

### After PR Created

- [ ] CI/CD passes
- [ ] No merge conflicts
- [ ] Reviewers notified
- [ ] Documentation accessible

---

## 📋 Post-Merge Tasks

### After PR Merged

- [ ] **Update main branch**

  ```bash
  git checkout main
  git pull origin main
  ```

- [ ] **Delete feature branch** (optional)

  ```bash
  git branch -d feature/part-02-workbench-expansion-save-copilot-20260102-2028
  git push origin --delete feature/part-02-workbench-expansion-save-copilot-20260102-2028
  ```

- [ ] **Create GitHub Release** (optional)
  - Tag version (e.g., v1.0.0)
  - Include changelog
  - Attach COMPONENT_MANIFEST.json

- [ ] **Update documentation site** (if applicable)

- [ ] **Announce in team channels**

---

## 🎉 Completion Criteria

This checklist is complete when:

✅ All checkboxes are ticked  
✅ PR is created and CI passes  
✅ Code is ready for review  
✅ Documentation is comprehensive  
✅ Components are portable and documented

---

**Checklist Version**: 1.0.0  
**Last Updated**: January 3, 2026  
**Maintainer**: ModMe GenUI Team
