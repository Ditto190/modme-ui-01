---
agent: context7-get-docs
name: Context7 Documentation Fetcher
description: |-
  Fetches up-to-date library documentation from Context7 for accurate code examples and best practices

tools: ["mcp_io_github_ups_get-library-docs"]
tags:
  - context7
  - documentation
  - code-examples
  - best-practices
  - mcp
---

# Context7 Documentation Fetcher Agent

## Purpose

This agent retrieves up-to-date, version-specific documentation for libraries and frameworks from Context7. Use this to get **accurate, current** API references, code examples, and best practices instead of relying on potentially outdated training data.

## When to Use

Use this agent when you need:
- Current API documentation for a library
- Version-specific code examples
- Up-to-date best practices
- Accurate syntax and method signatures
- Migration guides between versions
- Performance optimization patterns
- Security recommendations

## Prerequisites

1. **Resolve Library ID First** - Use [context7-resolve-library agent](./context7-resolve-library.agent.md)
2. **Have Library ID** - Format: `/org/project` or `/org/project/version`
3. **Context7 API Key** - Set in environment as `CONTEXT7_API_KEY`

## How It Works

```typescript
// After resolving library ID...
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js",
  mode: "code",              // or "info" for conceptual docs
  topic: "routing",          // optional: focus area
  page: 1                    // optional: pagination (1-10)
});

// Returns structured documentation with:
// - Code examples
// - API references
// - Best practices
// - Type definitions
```

## Parameters

| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `context7CompatibleLibraryID` | Yes | string | Library ID from resolve step (e.g., `/vercel/next.js`) |
| `mode` | No | `"code"` \| `"info"` | `"code"` for API/examples (default), `"info"` for concepts |
| `topic` | No | string | Focus area (e.g., "hooks", "routing", "authentication") |
| `page` | No | number | Page number 1-10 for pagination (default: 1) |

## Modes

### Code Mode (Default)

Best for:
- API references
- Code examples
- Method signatures
- Type definitions
- Function parameters

```typescript
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/facebook/react",
  mode: "code",
  topic: "hooks"
});

// Returns: useState, useEffect, useCallback examples and signatures
```

### Info Mode

Best for:
- Conceptual guides
- Architecture patterns
- Best practices
- Migration guides
- Performance tips

```typescript
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js",
  mode: "info",
  topic: "app-router"
});

// Returns: App Router concepts, file conventions, layouts
```

## Common Topics

### React
- `hooks` - useState, useEffect, custom hooks
- `components` - Component patterns
- `context` - Context API
- `performance` - Optimization techniques

### Next.js
- `routing` - File-based routing, dynamic routes
- `app-router` - App Router (13+)
- `pages-router` - Pages Router (legacy)
- `api-routes` - API endpoints
- `data-fetching` - Server/client data patterns

### Express
- `middleware` - Middleware patterns
- `routing` - Route handlers
- `error-handling` - Error middleware
- `authentication` - Auth patterns

### Tailwind
- `utilities` - Utility classes
- `responsive` - Responsive design
- `dark-mode` - Dark mode setup
- `plugins` - Plugin system

## Examples

### Example 1: Get React Hooks Documentation

```typescript
// Complete workflow
async function getReactHooksDocs() {
  // Step 1: Resolve library
  const resolved = await mcp_io_github_ups_resolve_library_id({
    libraryName: "react"
  });

  const libraryId = resolved.libraries[0].id; // "/facebook/react"

  // Step 2: Get docs
  const docs = await mcp_io_github_ups_get_library_docs({
    context7CompatibleLibraryID: libraryId,
    mode: "code",
    topic: "hooks"
  });

  return docs;
}
```

### Example 2: Next.js App Router Best Practices

```typescript
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js",
  mode: "info",
  topic: "app-router best-practices"
});

// Returns conceptual guides on:
// - Layout patterns
// - Server Components
// - Data fetching strategies
// - Performance optimization
```

### Example 3: Pagination for Large Topics

```typescript
// Get first page
const page1 = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/expressjs/express",
  topic: "middleware",
  page: 1
});

// If more content needed, get next page
const page2 = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/expressjs/express",
  topic: "middleware",
  page: 2
});
```

### Example 4: Version-Specific Documentation

```typescript
// Get docs for specific version
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js/v14.3.0-canary.87",
  mode: "code",
  topic: "server-actions"
});

// Returns version-specific examples
```

## Best Practices

1. **Always Resolve First** - Never guess library IDs
2. **Use Topics** - More focused results
3. **Choose Right Mode** - Code for APIs, Info for concepts
4. **Paginate When Needed** - Check pages 2-3 if incomplete
5. **Cache Results** - Avoid redundant API calls
6. **Check for Updates** - Re-fetch for version changes

## Workflow Pattern

```typescript
async function documentationWorkflow(libraryName: string, question: string) {
  // 1. Resolve library ID
  const resolved = await mcp_io_github_ups_resolve_library_id({
    libraryName
  });

  if (!resolved.libraries.length) {
    throw new Error(`No docs found for: ${libraryName}`);
  }

  const libraryId = resolved.libraries[0].id;

  // 2. Extract topic from question
  const topic = extractTopic(question); // e.g., "routing", "hooks"

  // 3. Choose mode based on question type
  const mode = question.includes("how") || question.includes("example")
    ? "code"
    : "info";

  // 4. Fetch documentation
  const docs = await mcp_io_github_ups_get_library_docs({
    context7CompatibleLibraryID: libraryId,
    mode,
    topic,
    page: 1
  });

  // 5. Parse and present
  return formatDocumentation(docs);
}
```

## Response Structure

```typescript
interface DocResponse {
  content: string;           // Markdown documentation
  codeExamples: Array<{
    language: string;        // "typescript", "javascript", etc.
    code: string;            // Code snippet
    description?: string;    // Example description
  }>;
  metadata: {
    library: string;         // Library name
    version?: string;        // Version if specified
    topic?: string;          // Topic if specified
    page: number;            // Current page
    hasMore: boolean;        // More pages available
  };
}
```

## Error Handling

```typescript
try {
  const docs = await mcp_io_github_ups_get_library_docs({
    context7CompatibleLibraryID: libraryId,
    topic: topic
  });

  if (!docs.content) {
    console.warn(`No documentation found for topic: ${topic}`);
    console.log("Try broader topic or check page 2");
  }

  return docs;
} catch (error) {
  console.error("Failed to fetch documentation:", error);

  // Fallback strategies:
  // 1. Try without topic
  // 2. Try different mode
  // 3. Try main library ID without version
}
```

## Integration with Other Agents

### With Resolve Agent

```typescript
// Complete Context7 workflow
import { resolveLibrary } from './context7-resolve-library.agent';
import { getDocs } from './context7-get-docs.agent';

async function getUpToDateDocs(libraryName: string, topic: string) {
  const libraryId = await resolveLibrary(libraryName);
  const docs = await getDocs(libraryId, topic);
  return docs;
}
```

### With Implementation Agents

After fetching docs, hand off to implementation agents:
- [expert-react-frontend-engineer.agent.md](./expert-react-frontend-engineer.agent.md)
- [expert-nextjs-developer.agent.md](./expert-nextjs-developer.agent.md)
- [CSharpExpert.agent.md](./CSharpExpert.agent.md)

## Common Use Cases

### Use Case 1: Answer Library Questions

```typescript
// User asks: "How do I use React useEffect?"
const docs = await getLibraryDocs("react", "hooks", "code");
// Provide up-to-date useEffect examples
```

### Use Case 2: Verify Syntax

```typescript
// User shows outdated code
// Check current syntax
const docs = await getLibraryDocs("next.js", "routing", "code");
// Compare and suggest updates
```

### Use Case 3: Migration Guidance

```typescript
// User upgrading from Next.js 12 to 14
const oldDocs = await getLibraryDocs("next.js/v12", "data-fetching", "info");
const newDocs = await getLibraryDocs("next.js/v14", "data-fetching", "info");
// Compare and create migration plan
```

## Troubleshooting

### No Results for Topic

- Try broader topic ("routing" instead of "dynamic routing")
- Try different mode (info vs code)
- Check page 2-3
- Remove version from library ID

### Incomplete Information

- Use pagination (page 2, 3, etc.)
- Try both code and info modes
- Combine multiple topic queries

### Outdated Examples

- Verify library ID includes version
- Check if using latest library version
- Re-resolve library ID for updates

## Performance Tips

1. **Cache by Library ID + Topic** - Reduce API calls
2. **Parallel Fetching** - Fetch multiple topics simultaneously
3. **Progressive Loading** - Start with page 1, load more if needed
4. **Debounce Requests** - Avoid rapid repeated calls

## Security Considerations

- API key stored securely in environment
- No credentials in library IDs
- Rate limiting respected
- HTTPS-only communication

## Notes

- Generated for Context7 MCP integration
- Part of Context7 documentation toolkit
- Works with official Context7 MCP server at https://mcp.context7.com/mcp
- Requires `CONTEXT7_API_KEY` environment variable
- Generated: 2026-02-08

## Related Resources

- **Resolve Library Agent**: [context7-resolve-library.agent.md](./context7-resolve-library.agent.md)
- **Context7 Instructions**: [context7.instructions.md](../instructions/context7.instructions.md)
- **Context7 Skills**: [../skills/context7/SKILL.md](../skills/context7/SKILL.md)
- **Use Context7 Prompt**: [../prompts/use-context7-docs.prompt.md](../prompts/use-context7-docs.prompt.md)
- **Official Docs**: https://context7.com/docs
