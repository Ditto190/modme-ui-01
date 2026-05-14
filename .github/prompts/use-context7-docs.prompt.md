---
agent: "agent"
description: |-
  Fetch up-to-date library documentation using Context7 instead of relying on potentially outdated information

tools: ["mcp_io_github_ups_resolve-library-id", "mcp_io_github_ups_get-library-docs", "edit", "search"]
tags:
  - context7
  - documentation
  - code-examples
  - best-practices
---

# Use Context7 for Library Documentation

**Always fetch current documentation instead of guessing syntax or APIs.**

## When to Use This Prompt

Use when the user asks about:
- Library APIs or methods
- Framework best practices
- Code examples
- Migration between versions
- Performance patterns
- Security recommendations
- ANY question about a specific library/framework

## Process

### 1. Identify the Library

Extract library name from the user's question:

- "How do I use React hooks?" → `react`
- "Next.js routing" → `next.js`
- "Express middleware" → `express`
- "Tailwind dark mode" → `tailwind`

### 2. Resolve Library ID

```typescript
const resolved = await mcp_io_github_ups_resolve_library_id({
  libraryName: "library-name-here"
});

// Select best match based on:
// - Exact name match
// - High reputation
// - High benchmark score
// - Most code snippets
```

**Example:**
```typescript
// User asks: "How to use React useEffect?"
const resolved = await mcp_io_github_ups_resolve_library_id({
  libraryName: "react"
});

// Returns: [{ id: "/facebook/react", benchmarkScore: 99.2, ... }]
const libraryId = "/facebook/react";
```

### 3. Determine Mode and Topic

**Mode:**
- `"code"` (default) - For API references, code examples, syntax
- `"info"` - For conceptual guides, architecture, best practices

**Topic:**
Extract from user's question:
- "How to use hooks?" → `"hooks"`
- "Best practices for routing?" → `"routing best-practices"`
- "Authentication examples?" → `"authentication"`

**Example:**
```typescript
// User question: "Show me examples of React hooks"
const mode = "code";      // They want examples
const topic = "hooks";     // Specific focus
```

### 4. Fetch Documentation

```typescript
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: libraryId,  // From step 2
  mode: mode,                               // From step 3
  topic: topic,                             // From step 3
  page: 1                                   // Start with page 1
});
```

**Complete example:**
```typescript
// Full workflow for: "How do I use React useEffect?"
const resolved = await mcp_io_github_ups_resolve_library_id({
  libraryName: "react"
});

const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: resolved.libraries[0].id,
  mode: "code",
  topic: "hooks",
  page: 1
});

// Now answer using the retrieved documentation
```

### 5. Answer Using Retrieved Docs

- Use ONLY information from Context7 response
- Include code examples from docs
- Cite version if specified
- Mention best practices from docs
- If incomplete, try page 2 or broader topic

## Use Cases

### Use Case 1: Code Examples

**Scenario:** User needs examples of how to use a feature

**Steps:**
1. Resolve library ID
2. Use `mode: "code"`
3. Fetch with specific topic
4. Provide examples from response

**Example:**
```typescript
// User: "Show me Next.js API route examples"
const resolved = await mcp_io_github_ups_resolve_library_id({
  libraryName: "next.js"
});

const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: resolved.libraries[0].id,
  mode: "code",
  topic: "api-routes"
});

// Return: Code examples with proper syntax
```

---

### Use Case 2: Best Practices

**Scenario:** User asks about best practices or patterns

**Steps:**
1. Resolve library ID
2. Use `mode: "info"`
3. Fetch with topic + "best-practices"
4. Summarize recommendations

**Example:**
```typescript
// User: "Best practices for Next.js data fetching?"
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js",
  mode: "info",
  topic: "data-fetching best-practices"
});

// Return: Current recommendations (Server Components, etc.)
```

---

### Use Case 3: Migration Guidance

**Scenario:** User upgrading between versions

**Steps:**
1. Resolve both old and new versions
2. Fetch docs for each with `mode: "info"`
3. Compare and highlight changes
4. Provide migration steps

**Example:**
```typescript
// User: "Migrating from Next.js 12 to 14"
const oldDocs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js/v12",
  mode: "info",
  topic: "routing"
});

const newDocs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js/v14",
  mode: "info",
  topic: "routing"
});

// Compare and provide migration guide
```

---

### Use Case 4: Syntax Verification

**Scenario:** User shows code that might be outdated

**Steps:**
1. Resolve library ID (check their version if known)
2. Fetch current syntax with `mode: "code"`
3. Compare with user's code
4. Suggest updates if needed

**Example:**
```typescript
// User shows: getServerSideProps (Next.js 12 syntax)
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/vercel/next.js/v14",
  mode: "code",
  topic: "data-fetching"
});

// Show: Server Components (Next.js 14 syntax)
```

---

### Use Case 5: Troubleshooting

**Scenario:** User has error with library code

**Steps:**
1. Resolve library ID
2. Fetch docs for relevant area
3. Check for common pitfalls
4. Verify current API usage

**Example:**
```typescript
// User: "Why isn't my Express middleware working?"
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: "/expressjs/express",
  mode: "code",
  topic: "middleware"
});

// Check: Proper middleware signature, error handling, next()
```

## Common Topics by Library

### React
- `hooks` - useState, useEffect, useCallback, etc.
- `components` - Component patterns
- `context` - Context API
- `performance` - Memoization, optimization

### Next.js
- `routing` - File-based routing, dynamic routes
- `app-router` - App Router (Next.js 13+)
- `data-fetching` - Server/client patterns
- `api-routes` - REST endpoints
- `server-components` - RSC patterns

### Express
- `middleware` - Middleware patterns
- `routing` - Route handlers
- `error-handling` - Error middleware
- `authentication` - Auth strategies

### TypeScript
- `types` - Type definitions
- `generics` - Generic patterns
- `utility-types` - Built-in utilities
- `strictness` - Strict mode features

## Pagination Pattern

If initial response is incomplete:

```typescript
// Try page 2
const page2 = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: libraryId,
  topic: topic,
  page: 2
});

// Or try broader topic
const broader = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: libraryId,
  // remove specific topic for general docs
});
```

## Error Handling

```typescript
try {
  const resolved = await mcp_io_github_ups_resolve_library_id({
    libraryName: libraryName
  });

  if (!resolved.libraries || resolved.libraries.length === 0) {
    return "No Context7 documentation found for " + libraryName +
           ". Try alternative names or check official docs.";
  }

  const docs = await mcp_io_github_ups_get_library_docs({
    context7CompatibleLibraryID: resolved.libraries[0].id,
    mode: mode,
    topic: topic
  });

  if (!docs.content) {
    return "Documentation found but no content for topic: " + topic +
           ". Try broader topic or different mode.";
  }

  return docs;

} catch (error) {
  console.error("Context7 error:", error);
  return "Failed to fetch documentation. Using fallback sources.";
}
```

## Best Practices

1. **ALWAYS resolve first** - Never guess library IDs
2. **Use specific topics** - Better results than general queries
3. **Choose right mode** - Code for APIs, Info for concepts
4. **Check pagination** - Try page 2 if incomplete
5. **Cite sources** - Mention you're using Context7 docs
6. **Verify versions** - Check if user needs specific version

## Anti-Patterns (DO NOT)

❌ Answer from memory without calling Context7
❌ Guess library IDs instead of resolving
❌ Skip topic parameter (be specific)
❌ Use wrong mode (code vs info)
❌ Ignore version differences
❌ Cache across version changes

## Success Criteria

✅ Library ID resolved correctly
✅ Appropriate mode selected
✅ Relevant topic specified
✅ Documentation retrieved successfully
✅ Answer based on Context7 response
✅ Code examples included
✅ Version-specific if applicable

## Example Complete Workflow

```typescript
// User asks: "How do I create a Next.js API route that handles POST requests?"

// Step 1: Resolve
const resolved = await mcp_io_github_ups_resolve_library_id({
  libraryName: "next.js"
});

// Step 2: Determine parameters
const libraryId = resolved.libraries[0].id; // "/vercel/next.js"
const mode = "code";                        // Need examples
const topic = "api-routes POST";            // Specific topic

// Step 3: Fetch docs
const docs = await mcp_io_github_ups_get_library_docs({
  context7CompatibleLibraryID: libraryId,
  mode: mode,
  topic: topic
});

// Step 4: Answer with examples
const answer = `
Based on current Next.js documentation from Context7:

${docs.content}

Key points:
- Use export async function POST(request: Request)
- Access body with await request.json()
- Return NextResponse.json()

Example:
${docs.codeExamples[0].code}
`;
```

## Troubleshooting

### No results for library
- Try alternative names ("nextjs" vs "next.js")
- Search for org name ("vercel", "facebook")
- Check spelling

### No results for topic
- Make topic more general ("routing" vs "dynamic routing")
- Try different mode
- Check page 2-3
- Remove topic for general docs

### Outdated examples
- Verify version in library ID
- Check user's package.json version
- Resolve again for latest

---

**Remember:** Context7 provides current, accurate documentation. ALWAYS use it instead of potentially outdated training data.
