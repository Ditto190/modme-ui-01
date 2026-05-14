---
description: |-
  Instructions for using Context7 to fetch up-to-date library documentation and best practices

applyTo: "**/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.py"
tags:
  - context7
  - documentation
  - code-quality
  - best-practices
---

# Context7 Documentation Integration Instructions

## Overview

Context7 provides up-to-date, version-specific library documentation. Use it instead of relying on potentially outdated training data when working with any library or framework.

## Core Principle

**Documentation First**: NEVER guess library APIs, syntax, or best practices. ALWAYS fetch current documentation from Context7.

## Available Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `mcp_io_github_ups_resolve-library-id` | Find library ID | Before fetching docs |
| `mcp_io_github_ups_get-library-docs` | Fetch documentation | After resolving ID |

## Required Workflow

### Step 1: Resolve Library ID

```typescript
const resolved = await mcp_io_github_ups_resolve_library_id({
  libraryName: "next.js"
});

//Select best match based on:
// - Name similarity
// - High reputation (High > Medium > Low)
// - High benchmark score (0-100)
// - Documentation coverage (code snippets count)
```

### Step 2: Fetch Documentation

```typescript
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: resolved.libraries[0].id,
  mode: "code",              // or "info"
  topic: "specific-topic",   // optional but recommended
  page: 1                    // 1-10 for pagination
});
```

## Mode Selection

### Use `mode: "code"` for:
- API references
- Function signatures
- Code examples
- Method parameters
- Type definitions
- Syntax verification

### Use `mode: "info"` for:
- Conceptual guides
- Architecture patterns
- Best practices
- Migration guides
- Performance tips
- Security recommendations

## Integration Pattern

```typescript
async function getUpToDateInfo(libraryName: string, topic: string) {
  // 1. Resolve
  const resolved = await mcp_io_github_ups_resolve_library_id({
    libraryName
  });

  if (!resolved.libraries.length) {
    throw new Error(`No docs found for: ${libraryName}`);
  }

  // 2. Select best match
  const libraryId = resolved.libraries
    .sort((a, b) => b.benchmarkScore - a.benchmarkScore)[0]
    .id;

  // 3. Fetch docs
  const docs = await mcp_io_github_ups_get_library_docs({
    context7CompatibleLibraryID: libraryId,
    mode: "code",
    topic
  });

  return docs;
}
```

## Common Libraries

| Library | Context7 ID | Use Cases |
|---------|-------------|-----------|
| React | `/facebook/react` | Hooks, components, context |
| Next.js | `/vercel/next.js` | Routing, data fetching, API routes |
| Express | `/expressjs/express` | Middleware, routing, error handling |
| TypeScript | `/microsoft/typescript` | Types, generics, utilities |
| Tailwind | `/tailwindlabs/tailwindcss` | Utilities, responsive, dark mode |
| Vue | `/vuejs/core` | Composition API, reactivity |

## Version-Specific Documentation

```typescript
// For specific version
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js/v14.3.0-canary.87",
  topic: "server-actions"
});

// For latest stable
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js",
  topic: "server-actions"
});
```

## Best Practices

### DO:
✅ Always resolve library ID before fetching docs
✅ Use specific topics for focused results
✅ Choose appropriate mode (code vs info)
✅ Check multiple pages if needed (page 2, 3)
✅ Cache results within session
✅ Cite Context7 as source
✅ Verify version compatibility

### DON'T:
❌ Answer from memory without checking Context7
❌ Guess library IDs without resolving
❌ Skip topic parameter (be specific)
❌ Use wrong mode for query type
❌ Ignore version differences
❌ Cache across version updates

## Error Handling

```typescript
try {
  const resolved = await mcp_io_github_ups_resolve_library_id({
    libraryName: libraryName
  });

  if (!resolved.libraries?.length) {
    console.warn(`No Context7 docs for: ${libraryName}`);
    // Fallback strategy
    return null;
  }

  const docs = await mcp_io_github_ups_get_library_docs({
    context7CompatibleLibraryID: resolved.libraries[0].id,
    mode: mode,
    topic: topic
  });

  if (!docs.content) {
    console.warn(`No content for topic: ${topic}`);
    // Try broader topic or page 2
    return await fetchWithFallback(resolved.libraries[0].id, topic);
  }

  return docs;
} catch (error) {
  console.error("Context7 error:", error);
  throw error;
}
```

## Pagination Strategy

```typescript
async function fetchAllPages(libraryId: string, topic: string) {
  const allDocs = [];

  for (let page = 1; page <= 3; page++) {
    const docs = await mcp_io_github_ups_get_library_docs({
      context7CompatibleLibraryID: libraryId,
      topic: topic,
      page: page
    });

    if (!docs.content) break;

    allDocs.push(docs);

    if (!docs.metadata?.hasMore) break;
  }

  return allDocs;
}
```

## Topic Extraction

Extract topics from user questions:

| User Question | Library | Topic |
|---------------|---------|-------|
| "How to use React hooks?" | react | hooks |
| "Next.js routing examples" | next.js | routing |
| "Express middleware patterns" | express | middleware |
| "Tailwind dark mode setup" | tailwind | dark-mode |
| "TypeScript generics" | typescript | generics |

## Code Example Usage

When Context7 returns code examples:

```typescript
// Context7 response includes:
{
  content: "...",
  codeExamples: [
    {
      language: "typescript",
      code: "const example = ...",
      description: "Example usage"
    }
  ]
}

// Present to user with:
// 1. Context/explanation
// 2. Code example
// 3. Key points
// 4. Best practices from docs
```

## Version Checking

```typescript
async function checkForUpdates(libraryName: string, currentVersion: string) {
  // Resolve library
  const resolved = await mcp_io_github_ups_resolve_library_id({
    libraryName
  });

  // Check if newer version available
  const latestId = resolved.libraries[0].id;
  const currentId = `${latestId}/v${currentVersion}`;

  // Fetch both versions
  const current = await mcp_io_github_ups_get_library_docs({
    context7CompatibleLibraryID: currentId,
    mode: "info"
  });

  const latest = await mcp_io_github_ups_get_library_docs({
    context7CompatibleLibraryID: latestId,
    mode: "info"
  });

  // Compare and recommend
  if (current.version !== latest.version) {
    return {
      hasUpdate: true,
      current: current.version,
      latest: latest.version,
      breaking: checkBreakingChanges(current, latest)
    };
  }

  return { hasUpdate: false };
}
```

## Caching Strategy

```typescript
// Session-level cache
const cache = new Map<string, DocResponse>();

async function getCachedDocs(
  libraryId: string,
  topic: string,
  mode: string
) {
  const key = `${libraryId}:${mode}:${topic}`;

  if (cache.has(key)) {
    return cache.get(key);
  }

  const docs = await mcp_io_github_ups_get_library_docs({
    context7CompatibleLibraryID: libraryId,
    mode: mode as "code" | "info",
    topic: topic
  });

  cache.set(key, docs);
  return docs;
}

// Clear cache on version changes
function clearCacheForLibrary(libraryId: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(libraryId)) {
      cache.delete(key);
    }
  }
}
```

## Troubleshooting

### No Results for Library

1. Check spelling
2. Try alternative names:
   - "nextjs" → "next.js"
   - "node" → "nodejs"
3. Search by organization:
   - "vercel" → shows Next.js
   - "facebook" → shows React
4. Check official package name

### No Results for Topic

1. Make topic more general:
   - "dynamic routing" → "routing"
   - "useCallback" → "hooks"
2. Try different mode (code ↔ info)
3. Check page 2-3
4. Remove topic for general docs

### Outdated Information

1. Verify version in library ID
2. Check user's package.json
3. Re-resolve for latest
4. Clear session cache

## Security Considerations

- API key stored in environment (`CONTEXT7_API_KEY`)
- No credentials in library IDs
- HTTPS-only communication
- Rate limiting respected
- No PII in requests

## Performance Tips

1. **Cache aggressively** within session
2. **Parallel fetching** for multiple topics
3. **Progressive loading** (page 1 first)
4. **Debounce requests** to avoid spam
5. **Batch resolutions** when possible

## Integration with Other Tools

### With Code Generation

```typescript
// 1. Fetch current docs
const docs = await getUpToDateInfo("next.js", "api-routes");

// 2. Generate code following docs
generateCode(docs.codeExamples);

// 3. Validate against docs
validateSyntax(generatedCode, docs);
```

### With Linting

```typescript
// Check if code follows current best practices
const docs = await getUpToDateInfo(libraryName, "best-practices");
const issues = checkAgainstBestPractices(code, docs);
```

### With Migration Tools

```typescript
// Compare old vs new version
const oldDocs = await getVersionDocs(libraryName, oldVersion);
const newDocs = await getVersionDocs(libraryName, newVersion);
const changes = generateMigrationGuide(oldDocs, newDocs);
```

## Environment Setup

Required environment variable:

```bash
# .env
CONTEXT7_API_KEY=your_api_key_here
```

## Related Resources

- **Agents**:
  - [context7-resolve-library.agent.md](../agents/context7-resolve-library.agent.md)
  - [context7-get-docs.agent.md](../agents/context7-get-docs.agent.md)
- **Prompts**:
  - [use-context7-docs.prompt.md](../prompts/use-context7-docs.prompt.md)
- **Skills**:
  - [context7/SKILL.md](../skills/context7/SKILL.md)
- **Official Docs**: https://context7.com/docs

---

**Remember**: Always use Context7 for library questions. It's the difference between outdated and accurate information.
