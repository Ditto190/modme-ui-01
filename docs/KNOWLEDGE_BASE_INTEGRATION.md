# Knowledge Base Integration - Context Mapper

## Overview

The **Knowledge Base Context Mapper** automatically enriches GitHub issues with relevant file paths, documentation links, and related concepts. When an issue is opened or edited, the system:

1. **Analyzes issue content** using a curated knowledge base
2. **Detects relevant concepts** (e.g., "StatCard", "State Sync", "Toolset")
3. **Maps concepts to files** and documentation
4. **Posts context comment** with actionable information
5. **Suggests labels** based on detected concepts

---

## How It Works

### Architecture

```
GitHub Issue Opened
      │
      ▼
┌─────────────────────────────────────┐
│  issue-labeler.yml Workflow         │
│                                     │
│  1. Checkout repo                   │
│  2. Setup Node.js 22                │
│  3. Install dependencies            │
│  4. Run issue-context-mapper.ts     │◄─── Knowledge Base
│     - Analyze title + body          │     (KNOWLEDGE_BASE object)
│     - Detect concepts               │
│     - Map to files/docs             │
│  5. Parse JSON output               │
│  6. Add suggested labels            │
│  7. Post context comment            │
└─────────────────────────────────────┘
      │
      ▼
Issue enriched with:
- Relevant file paths
- Documentation links
- Related concepts
- Auto-applied labels
```

---

## Knowledge Base Structure

Located in: `scripts/knowledge-management/issue-context-mapper.ts`

### Concept Mapping

```typescript
const KNOWLEDGE_BASE: Record<string, ConceptMapping> = {
  StatCard: {
    keywords: ["statcard", "stat card", "metric card", "kpi card"],
    files: [
      {
        path: "src/components/registry/StatCard.tsx",
        description: "StatCard component implementation",
        relatedPaths: ["src/lib/types.ts", "src/app/page.tsx"],
        docs: ["docs/REFACTORING_PATTERNS.md#component-registry-refactoring"],
      },
    ],
    documentation: [
      "src/components/registry/README.md",
      ".github/copilot-instructions.md#component-registry-conventions",
    ],
    relatedConcepts: ["DataTable", "ChartCard", "Component Registry"],
  },
  // ... more concepts
};
```

### Current Concepts

| Concept         | Keywords                                      | Related Files                     | Labels Suggested   |
| --------------- | --------------------------------------------- | --------------------------------- | ------------------ |
| **StatCard**    | statcard, stat card, metric card              | StatCard.tsx, types.ts            | component-registry |
| **DataTable**   | datatable, data table, table                  | DataTable.tsx, types.ts           | component-registry |
| **ChartCard**   | chartcard, chart card, visualization          | ChartCard.tsx, types.ts           | component-registry |
| **Agent Tools** | upsert_ui_element, tool_context, python agent | agent/main.py                     | agent              |
| **State Sync**  | state sync, tool_context.state, useCoAgent    | agent/main.py, types.ts, page.tsx | state-sync         |
| **Toolset**     | toolset, toolsets.json, deprecation           | toolsets.json, toolset_manager.py | toolset            |
| **Frontend**    | react, next.js, copilotkit, ui                | page.tsx, route.ts                | frontend           |
| **CI/CD**       | workflow, github actions, automation          | .github/workflows/                | ci-cd              |
| **Testing**     | test, pytest, jest, validation                | tests/                            | testing            |

---

## Example Output

### Input Issue

**Title**: "StatCard component not rendering"  
**Body**: "When I call upsert_ui_element with StatCard type, nothing appears on the canvas..."

### Context Comment Generated

```markdown
## 🔍 Detected Context

This issue appears to be related to:

- **StatCard**
- **Agent Tools**
- **State Sync**

### 📁 Relevant Files

- [`src/components/registry/StatCard.tsx`](src/components/registry/StatCard.tsx) - StatCard component implementation
  - Related: `src/lib/types.ts`, `src/app/page.tsx`, `agent/main.py`
- [`agent/main.py`](agent/main.py) - Agent tool definitions and lifecycle hooks
  - Related: `src/app/api/copilotkit/route.ts`, `src/lib/types.ts`
- [`src/lib/types.ts`](src/lib/types.ts) - TypeScript state contract
  - Related: `agent/main.py`

### 📚 Documentation

- [src/components/registry/README.md](src/components/registry/README.md)
- [.github/copilot-instructions.md#component-registry-conventions](.github/copilot-instructions.md#component-registry-conventions)
- [docs/REFACTORING_PATTERNS.md#component-registry-refactoring](docs/REFACTORING_PATTERNS.md#component-registry-refactoring)
- [docs/REFACTORING_PATTERNS.md#python-backend-refactoring](docs/REFACTORING_PATTERNS.md#python-backend-refactoring)
- [docs/REFACTORING_PATTERNS.md#state-contract-refactoring](docs/REFACTORING_PATTERNS.md#state-contract-refactoring)

---

_This context was automatically generated by the Knowledge Base Context Mapper._
```

### Labels Auto-Applied

- `component-registry`
- `agent`
- `state-sync`
- `bug` (from template)

---

## Adding New Concepts

### 1. Update Knowledge Base

Edit `scripts/knowledge-management/issue-context-mapper.ts`:

```typescript
const KNOWLEDGE_BASE: Record<string, ConceptMapping> = {
  // ... existing concepts

  "New Concept": {
    keywords: ["keyword1", "keyword2", "phrase with spaces"],
    files: [
      {
        path: "path/to/file.ts",
        description: "File description",
        relatedPaths: ["related/file1.ts", "related/file2.ts"],
        docs: ["docs/GUIDE.md#section"],
      },
    ],
    documentation: ["docs/MAIN_DOC.md", ".github/instructions.md#section"],
    relatedConcepts: ["Related Concept 1", "Related Concept 2"],
  },
};
```

### 2. Update Label Suggestion Logic

```typescript
if (concept === "New Concept") {
  suggestedLabels.push("new-label");
}
```

### 3. Test Locally

```bash
cd scripts/knowledge-management
npm install
npm run build
node dist/issue-context-mapper.js "Test issue title" "Test issue body with keyword1"
```

### 4. Verify Output

Check JSON output includes:

- `detectedConcepts: ["New Concept"]`
- `suggestedLabels: ["new-label"]`
- `comment` with file paths and docs

---

## Maintenance

### Keeping Knowledge Base Updated

**When adding new components**:

1. Add to KNOWLEDGE_BASE with keywords
2. Link to component file
3. Include related files (types, page.tsx)
4. Reference documentation

**When refactoring files**:

1. Update `path` fields to new locations
2. Update `relatedPaths` arrays
3. Verify documentation links still valid

**When adding documentation**:

1. Add to `documentation` arrays
2. Use relative paths from repo root
3. Include anchor links (`#section-name`)

### Monitoring

**GitHub Actions logs show**:

- Detected concepts per issue
- Suggested labels
- Whether context comment posted

**Example log output**:

```
Knowledge base detected concepts: StatCard, Agent Tools, State Sync
Added knowledge base context with 3 detected concepts
Final labels: bug, component-registry, agent, state-sync, status:triage
```

---

## Performance

**Build time**: ~5 seconds (TypeScript compilation)  
**Analysis time**: <1 second (string matching)  
**Total workflow time**: ~15-20 seconds

**Optimization considerations**:

- Knowledge base is in-memory (no DB queries)
- String matching uses simple `includes()` (fast)
- Deduplication prevents redundant data

---

## Comparison with Alternatives

| Approach                  | Pros                               | Cons                                       | Our Choice      |
| ------------------------- | ---------------------------------- | ------------------------------------------ | --------------- |
| **ripgrep**               | Fast regex search                  | Requires file scanning, no concept mapping | ❌ Not suitable |
| **Tree logger**           | Shows file relationships           | Static output, no semantic understanding   | ❌ Not suitable |
| **index.ts**              | Centralized type registry          | Would need runtime evaluation              | ❌ Complex      |
| **Knowledge Base (ours)** | Curated mappings, fast, extensible | Manual maintenance                         | ✅ **Selected** |

**Why Knowledge Base?**

- **Semantic understanding**: "StatCard" concept encompasses component, types, state contract
- **Curated quality**: Maintainers control what's linked
- **Documentation first**: Always points to relevant docs
- **Fast execution**: No file system scanning needed
- **GitHub-friendly**: Pure TypeScript, runs in Actions

---

## Future Enhancements

### Phase 2 Ideas

1. **Related Issues Detection**
   - Index past issues with similarity scoring
   - Link to "Similar issues: #123, #456"

2. **Code Snippet Extraction**
   - Pull relevant code blocks from linked files
   - Include in context comment for quick reference

3. **Dynamic Priority Scoring**
   - Concepts like "State Sync" + "bug" = higher priority
   - Auto-suggest priority labels

4. **Multi-language Support**
   - Detect language from issue (EN, ES, FR)
   - Provide localized documentation links

5. **Integration with MCP Collections**
   - Query awesome-copilot MCP for related instructions
   - Surface relevant agent prompts

6. **Metrics Dashboard**
   - Most-referenced files
   - Common concept combinations
   - Context accuracy feedback loop

---

## Troubleshooting

### Issue: Context comment not appearing

**Check**:

1. Workflow logs in Actions tab
2. TypeScript compilation succeeded
3. JSON output is valid
4. `knowledgeContext.comment` is not empty

**Debug**:

```bash
cd scripts/knowledge-management
npm run build
node dist/issue-context-mapper.js "My title" "My body with StatCard"
```

### Issue: Wrong concepts detected

**Cause**: Keywords too broad (e.g., "table" matches both DataTable and database)

**Fix**: Make keywords more specific

```typescript
keywords: ["data table", "datatable", "table component"]; // More specific
```

### Issue: Files not found (404 links)

**Cause**: File paths changed after KB update

**Fix**: Run path validator

```bash
# Check all paths in knowledge base exist
node scripts/validate-kb-paths.js
```

---

## API Reference

### `analyzeIssueContent(issueBody: string, issueTitle: string): IssueContext`

Analyzes issue content and returns detected concepts, files, docs, labels.

**Returns**:

```typescript
{
  detectedConcepts: string[];
  relevantFiles: FileMapping[];
  documentationLinks: string[];
  suggestedLabels: string[];
  relatedIssues?: number[];
}
```

### `generateContextComment(context: IssueContext): string`

Generates formatted markdown comment for issue.

**Returns**: Markdown string with sections for concepts, files, documentation.

### `resolveGitHubPath(filePath: string, repo: string, branch: string): string`

Converts relative paths to GitHub URLs.

**Example**:

```typescript
resolveGitHubPath("src/app/page.tsx", "Ditto190/modme-ui-01", "main");
// → "https://github.com/Ditto190/modme-ui-01/blob/main/src/app/page.tsx"
```

---

## Related Documentation

- [ISSUE_MANAGEMENT_SYSTEM.md](./ISSUE_MANAGEMENT_SYSTEM.md) - Full issue system docs
- [KNOWLEDGE_MANAGEMENT.md](./KNOWLEDGE_MANAGEMENT.md) - Knowledge base architecture
- [TOOLSET_MANAGEMENT.md](./TOOLSET_MANAGEMENT.md) - Toolset lifecycle automation
- [REFACTORING_PATTERNS.md](./REFACTORING_PATTERNS.md) - Code patterns and best practices

---

**Maintained by**: ModMe GenUI Team  
**Version**: 1.0.0  
**Last Updated**: January 3, 2026

---

## Summary

The Knowledge Base Context Mapper provides **intelligent issue enrichment** by:

- ✅ Detecting relevant concepts from curated knowledge base
- ✅ Linking to specific files and documentation
- ✅ Auto-suggesting appropriate labels
- ✅ Posting helpful context comments
- ✅ Zero file system scanning (fast, GitHub Actions friendly)

**Result**: Issues are automatically enriched with actionable context, helping maintainers triage faster and contributors understand what files to check.
