---
agent: context7-resolve-library
name: Context7 Library Resolver
description: |-
  Resolves library names to Context7-compatible library IDs for fetching up-to-date documentation

tools: ["mcp_io_github_ups_resolve-library-id"]
tags:
  - context7
  - documentation
  - library-resolution
  - mcp
---

# Context7 Library Resolver Agent

## Purpose

This agent helps resolve library/package names to Context7-compatible library IDs. This is the **first step** before fetching documentation, ensuring you get the correct and most relevant library documentation.

## When to Use

Use this agent when you need to:
- Find the correct Context7 ID for a library (e.g., "express" → "/expressjs/express")
- Discover available versions of a library
- Check if a library has documentation in Context7
- Resolve ambiguous library names (multiple matches)
- Verify library reputation and benchmark scores

## How It Works

```typescript
// Call the MCP tool
const result = await mcp_io_github_ups_resolve_library_id({
  libraryName: "next.js"
});

// Returns matching libraries with metadata
// {
//   libraries: [
//     {
//       id: "/vercel/next.js",
//       name: "Next.js",
//       description: "The React Framework",
//       reputation: "High",
//       benchmarkScore: 98.5,
//       codeSnippets: 1250
//     }
//   ]
// }
```

## Selection Criteria

When multiple matches are found, prioritize:

1. **Exact Name Match** - Prefer exact or close name matches
2. **Source Reputation** - High > Medium > Low
3. **Benchmark Score** - Higher is better (0-100 scale)
4. **Documentation Coverage** - More code snippets = better docs

## Common Libraries

| Library | Context7 ID | Benchmark |
|---------|-------------|-----------|
| React | `/facebook/react` | 99.2 |
| Next.js | `/vercel/next.js` | 98.5 |
| Express | `/expressjs/express` | 94.2 |
| Tailwind CSS | `/tailwindlabs/tailwindcss` | 96.8 |
| TypeScript | `/microsoft/typescript` | 97.3 |
| Vue | `/vuejs/core` | 98.1 |

## Examples

### Example 1: Resolve Single Library

```typescript
// User asks: "How do I use React hooks?"
// Step 1: Resolve library ID
const result = await mcp_io_github_ups_resolve_library_id({
  libraryName: "react"
});

// Step 2: Select best match
const bestMatch = result.libraries[0]; // "/facebook/react"

// Step 3: Use ID to fetch docs (see context7-get-docs agent)
```

### Example 2: Handle Multiple Matches

```typescript
// User asks: "How do I use Supabase?"
const result = await mcp_io_github_ups_resolve_library_id({
  libraryName: "supabase"
});

// Multiple matches possible:
// - /supabase/supabase (main SDK)
// - /supabase/supabase-js (JavaScript client)
// - /supabase/auth-helpers (auth helpers)

// Select based on user context:
// - General usage → /supabase/supabase
// - JavaScript/TypeScript → /supabase/supabase-js
// - Authentication → /supabase/auth-helpers
```

### Example 3: Version-Specific Resolution

```typescript
// User has Next.js 14.3.0-canary.87
const result = await mcp_io_github_ups_resolve_library_id({
  libraryName: "next.js"
});

// Look for version-specific ID:
// /vercel/next.js/v14.3.0-canary.87
// OR use main ID: /vercel/next.js
```

## Best Practices

1. **Always Call First** - Resolve before fetching docs
2. **Cache Results** - Store library IDs for session
3. **Handle No Match** - Gracefully inform user if library not found
4. **Show Options** - Let user choose if multiple good matches
5. **Check Versions** - Look for version-specific IDs when relevant

## Error Handling

```typescript
try {
  const result = await mcp_io_github_ups_resolve_library_id({
    libraryName: libraryName
  });

  if (!result.libraries || result.libraries.length === 0) {
    console.error(`No Context7 documentation found for: ${libraryName}`);
    console.log("Try alternative library names or check spelling");
    return null;
  }

  return result.libraries[0].id; // Best match
} catch (error) {
  console.error("Failed to resolve library:", error);
  return null;
}
```

## Integration with Get Docs Agent

This agent works in tandem with the Context7 Get Docs agent:

```typescript
// Complete workflow
async function getLibraryDocs(libraryName: string, topic?: string) {
  // Step 1: Resolve (this agent)
  const resolved = await mcp_io_github_ups_resolve_library_id({
    libraryName
  });

  if (!resolved.libraries.length) {
    throw new Error(`Library not found: ${libraryName}`);
  }

  const libraryId = resolved.libraries[0].id;

  // Step 2: Fetch docs (get-docs agent)
  const docs = await mcp_io_github_ups_get_library_docs({
    context7CompatibleLibraryID: libraryId,
    topic: topic || undefined
  });

  return docs;
}
```

## Response Format

The tool returns:

```typescript
interface ResolveResult {
  libraries: Array<{
    id: string;              // "/org/project" or "/org/project/version"
    name: string;            // Display name
    description?: string;    // Library description
    reputation: "High" | "Medium" | "Low";
    benchmarkScore: number;  // 0-100 quality score
    codeSnippets: number;    // Documentation coverage
  }>;
}
```

## Troubleshooting

### No Results Found

- Check library name spelling
- Try alternative names (e.g., "nextjs" vs "next.js")
- Search for organization name (e.g., "vercel")

### Multiple Good Matches

- Ask user which specific package they mean
- Show all options with descriptions
- Default to highest benchmark score

### Version Not Found

- Use main library ID without version
- Context7 will provide latest stable docs
- Check if canary/beta versions are supported

## Notes

- Generated for Context7 MCP integration
- Part of Context7 documentation toolkit
- Works with official Context7 MCP server
- Requires `CONTEXT7_API_KEY` environment variable

## Related Resources

- **Get Docs Agent**: [context7-get-docs.agent.md](./context7-get-docs.agent.md)
- **Context7 Instructions**: [context7.instructions.md](../instructions/context7.instructions.md)
- **Context7 Skills**: [../skills/context7/SKILL.md](../skills/context7/SKILL.md)
- **Official Docs**: https://context7.com/docs
