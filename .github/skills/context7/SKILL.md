---
name: context7-docs
description: Fetch up-to-date library documentation from Context7. Use when user asks about library APIs, framework syntax, code examples, best practices, migration guides, or how to use any package or framework. Automatically resolves library names to Context7 IDs and retrieves version-specific documentation. Supports React, Next.js, Express, TypeScript, Tailwind, Vue, and thousands more libraries via Context7 MCP server.
license: Complete terms in LICENSE.txt
---

# Context7 Documentation Integration

Access current, version-specific library documentation through Context7's MCP server. Never rely on potentially outdated training data when accurate library docs are available.

## When to Use This Skill

Activate this skill when the user:
- Asks "how to use" any library or framework
- Requests code examples for a specific package
- Questions library syntax or API methods
- Needs best practices for a framework
- Wants migration guides between versions
- Troubleshoots library-related errors
- Asks about framework features or capabilities
- Mentions "latest version" or "current docs"
- Discusses TypeScript types for a package
- Compares library options or approaches

**Supported libraries**: Any library with public documentation (React, Next.js, Express, TypeScript, Tailwind, Vue, Angular, Svelte, FastAPI, Django, Flask, pytest, and thousands more).

## Prerequisites

### Environment Variables

```bash
# Required for Context7 MCP server
CONTEXT7_API_KEY=your_api_key_here
```

### MCP Tools Required

- `mcp_io_github_ups_resolve-library-id` - Resolve library names to Context7 IDs
- `mcp_io_github_ups_get-library-docs` - Fetch documentation content

## Core Workflow

### Step 1: Identify Library

Extract the library name from the user's request:

| User Request | Library Name |
|--------------|--------------|
| "How to use React hooks?" | `react` |
| "Next.js routing examples" | `next.js` |
| "Express middleware setup" | `express` |
| "Tailwind dark mode" | `tailwindcss` |
| "TypeScript generics" | `typescript` |

### Step 2: Resolve Library ID

```typescript
const resolved = await mcp_io_github_ups_resolve_library_id({
  libraryName: "next.js"
});
```

**Selection criteria** (in order):
1. **Name similarity** - Closest match to user's library name
2. **Benchmark score** - Higher is better (0-100 scale)
3. **Reputation** - High > Medium > Low
4. **Documentation coverage** - More code snippets = better docs

See [Library Resolution Guide](./references/library-resolution.md) for detailed selection algorithm.

### Step 3: Determine Mode

Choose documentation mode based on request type:

| Request Type | Mode | Examples |
|--------------|------|----------|
| Code examples | `code` | "Show me how to...", "Example of...", "Syntax for..." |
| Concepts | `info` | "Explain...", "Why...", "When to use...", "Best practices" |
| API reference | `code` | "What parameters...", "Return type...", "Method signature" |
| Architecture | `info` | "How does... work", "Architecture of...", "Design patterns" |
| Migration | `info` | "Upgrade from...", "Breaking changes", "Deprecated..." |

### Step 4: Fetch Documentation

```typescript
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: resolved.libraries[0].id,
  mode: "code",              // or "info"
  topic: "specific-topic",   // Extract from user request
  page: 1                    // Start with page 1
});
```

**Topic extraction examples**:
- "React hooks" → topic: `hooks`
- "Next.js dynamic routing" → topic: `routing`
- "Express error handling" → topic: `middleware`

See [Topic Extraction Patterns](./references/topic-extraction.md) for comprehensive guide.

### Step 5: Format Response

Structure your response:

1. **Brief introduction** - What the docs cover
2. **Code examples** - From Context7 response
3. **Key points** - Highlight important details
4. **Best practices** - From documentation
5. **Citation** - "According to Context7 docs for [library] v[version]"

## Common Workflows

### Quick Examples

Use [quick-example.py](./scripts/quick-example.py) for simple lookups:

```bash
python scripts/quick-example.py --library react --topic hooks
```

### Version Comparison

Compare two versions using [compare-versions.py](./scripts/compare-versions.py):

```bash
python scripts/compare-versions.py --library next.js --old 13 --new 14
```

### Bulk Resolution

Resolve multiple libraries at once with [resolve-bulk.py](./scripts/resolve-bulk.py):

```bash
python scripts/resolve-bulk.py --libraries react,next.js,express
```

## Progressive Documentation Loading

Start specific, broaden if needed:

1. **Try specific topic first**: `routing` → `data-fetching`
2. **If no results, broaden**: `dynamic-routing` → `routing`
3. **If still empty, try different mode**: `code` → `info`
4. **Check pagination**: Try page 2-3
5. **Last resort**: Fetch without topic

See [workflow-progressive-loading.md](./references/workflow-progressive-loading.md) for detailed strategy.

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| No libraries found | Wrong library name | Try variations: "nextjs" → "next.js" |
| Empty content | Topic too specific | Broaden topic or remove |
| Wrong mode | Mode mismatch | Switch between code/info |
| Version mismatch | User on old version | Fetch version-specific docs |
| API key error | Missing env var | Check CONTEXT7_API_KEY |

See [Troubleshooting Guide](./references/troubleshooting.md) for comprehensive error resolution.

## Response Templates

### Code Example Response

Use [code-response.template](./templates/code-response.template) for structuring code-focused answers.

### Conceptual Response

Use [concept-response.template](./templates/concept-response.template) for info-mode responses.

### Migration Guide Response

Use [migration-response.template](./templates/migration-response.template) for version comparisons.

## Performance Tips

1. **Cache within session** - Store resolved IDs and docs
2. **Parallel fetching** - Resolve and fetch can run concurrently for different libraries
3. **Progressive loading** - Fetch page 1 first, show results, then fetch more
4. **Debounce requests** - Wait 500ms before fetching on user input
5. **Batch resolutions** - Resolve multiple libraries in one call

See [Performance Optimization](./references/performance.md) for detailed caching strategies.

## Version-Specific Documentation

```typescript
// Latest stable version
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js"
});

// Specific version
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js/v14.3.0-canary.87"
});

// User's installed version (from package.json)
const userVersion = getUserVersion("next");
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: `/vercel/next.js/v${userVersion}`
});
```

## Common Libraries Quick Reference

| Library | Context7 ID | Common Topics |
|---------|-------------|---------------|
| React | `/facebook/react` | hooks, components, context, state, props |
| Next.js | `/vercel/next.js` | routing, api-routes, server-actions, middleware |
| Express | `/expressjs/express` | middleware, routing, error-handling, request |
| TypeScript | `/microsoft/typescript` | types, generics, utilities, decorators |
| Tailwind | `/tailwindlabs/tailwindcss` | utilities, responsive, dark-mode, customization |
| Vue | `/vuejs/core` | composition-api, reactivity, directives, router |
| Angular | `/angular/angular` | components, services, dependency-injection |
| Svelte | `/sveltejs/svelte` | reactivity, stores, transitions, animations |
| FastAPI | `/tiangolo/fastapi` | routing, dependency-injection, authentication |
| pytest | `/pytest-dev/pytest` | fixtures, parametrize, markers, plugins |

## Integration with Other Tools

### With Code Generation

```typescript
// 1. Fetch docs
const docs = await getContext7Docs("next.js", "api-routes");

// 2. Generate code following docs
const code = generateFromTemplate(docs.codeExamples);

// 3. Validate against docs
validateSyntax(code, docs.apiReference);
```

### With Linting

```typescript
// Check if code follows current best practices
const docs = await getContext7Docs(libraryName, "best-practices");
const issues = lintAgainstDocs(code, docs);
```

### With Testing

```typescript
// Generate tests based on documentation examples
const docs = await getContext7Docs("pytest", "fixtures");
const tests = generateTests(docs.codeExamples);
```

## Security Considerations

- API key stored in environment (never in code)
- No credentials in library IDs or topics
- HTTPS-only communication with Context7
- Rate limiting respected automatically
- No PII sent in requests
- Cache cleared on context close

## Caching Strategy

Session-level cache implementation:

```typescript
const cache = new Map<string, DocResponse>();

function getCacheKey(libraryId: string, mode: string, topic: string): string {
  return `${libraryId}:${mode}:${topic}`;
}

async function getCachedDocs(
  libraryId: string,
  mode: "code" | "info",
  topic: string
): Promise<DocResponse> {
  const key = getCacheKey(libraryId, mode, topic);

  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const docs = await mcp_io_github_ups_get_library_docs({
    context7CompatibleLibraryID: libraryId,
    mode,
    topic
  });

  cache.set(key, docs);
  return docs;
}
```

See [Caching Implementation](./references/caching.md) for complete strategy.

## Pagination Handling

Fetch multiple pages when needed:

```typescript
async function fetchAllPages(
  libraryId: string,
  topic: string,
  maxPages: number = 3
): Promise<DocResponse[]> {
  const allDocs: DocResponse[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const docs = await mcp_io_github_ups_get_library_docs({
      context7CompatibleLibraryID: libraryId,
      mode: "code",
      topic,
      page
    });

    if (!docs.content) break;
    allDocs.push(docs);

    // Check if more pages available
    if (!docs.metadata?.hasMore) break;
  }

  return allDocs;
}
```

## Best Practices

### DO
✅ Always resolve library ID before fetching docs
✅ Extract specific topics from user requests
✅ Choose appropriate mode (code vs info)
✅ Check multiple pages if first page insufficient
✅ Cache results within session
✅ Cite Context7 as documentation source
✅ Verify version matches user's installed version
✅ Handle errors gracefully with fallbacks

### DON'T
❌ Answer from memory without checking Context7
❌ Guess library IDs without resolution
❌ Use vague topics (be specific)
❌ Wrong mode for query type
❌ Ignore version differences
❌ Cache across context boundaries
❌ Skip error handling
❌ Forget to cite source

## Troubleshooting

See [Troubleshooting Guide](./references/troubleshooting.md) for:
- No results for library
- No results for topic
- Outdated information
- API errors
- Rate limiting
- Version mismatches

## References

- [Library Resolution Guide](./references/library-resolution.md)
- [Topic Extraction Patterns](./references/topic-extraction.md)
- [Progressive Loading Strategy](./references/workflow-progressive-loading.md)
- [Performance Optimization](./references/performance.md)
- [Caching Implementation](./references/caching.md)
- [Troubleshooting Guide](./references/troubleshooting.md)
- [Context7 API Documentation](https://context7.com/docs)

## Scripts

- [quick-example.py](./scripts/quick-example.py) - Quick documentation lookups
- [compare-versions.py](./scripts/compare-versions.py) - Version comparison
- [resolve-bulk.py](./scripts/resolve-bulk.py) - Bulk library resolution
- [validate-cache.py](./scripts/validate-cache.py) - Cache validation

## Templates

- [code-response.template](./templates/code-response.template) - Code example responses
- [concept-response.template](./templates/concept-response.template) - Conceptual responses
- [migration-response.template](./templates/migration-response.template) - Migration guides

---

**Remember**: Context7 provides current, accurate documentation. Always use it instead of relying on potentially outdated training data.
