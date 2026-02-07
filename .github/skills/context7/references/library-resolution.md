# Library Resolution Guide

Comprehensive guide for resolving library names to Context7-compatible IDs.

## Overview

The `mcp_io_github_ups_resolve-library-id` tool converts human-readable library names into Context7 IDs. This is the required first step before fetching documentation.

## Selection Algorithm

When multiple libraries match a name, select based on these criteria (in priority order):

### 1. Name Similarity

Match the library name as closely as possible:

| User Input   | Best Match                  | Why                         |
| ------------ | --------------------------- | --------------------------- |
| `react`      | `/facebook/react`           | Exact match                 |
| `nextjs`     | `/vercel/next.js`           | Common alternative spelling |
| `typescript` | `/microsoft/typescript`     | Official package name       |
| `tailwind`   | `/tailwindlabs/tailwindcss` | Official org + package      |

### 2. Benchmark Score

Context7 provides a quality score (0-100) for each library's documentation:

- **90-100**: Excellent documentation coverage
- **70-89**: Good documentation coverage
- **50-69**: Moderate documentation coverage
- **Below 50**: Limited documentation coverage

**Always prefer higher scores** when choosing between similar libraries.

### 3. Reputation

Libraries are rated by Context7:

- **High**: Official, well-maintained, widely-used
- **Medium**: Community-maintained, decent usage
- **Low**: Experimental, niche, or deprecated

**Prefer High > Medium > Low** when all else is equal.

### 4. Documentation Coverage

The `codeSnippets` count indicates how many executable examples exist:

- **200+**: Comprehensive examples
- **100-199**: Good example coverage
- **50-99**: Moderate examples
- **Below 50**: Limited examples

**More examples = better documentation** for code-focused queries.

## Resolution Examples

### Example 1: Single Match

**Input**: `react`

**Response**:

```json
{
  "libraries": [
    {
      "id": "/facebook/react",
      "name": "React",
      "benchmarkScore": 98,
      "reputation": "High",
      "codeSnippets": 450
    }
  ]
}
```

**Selection**: Obvious choice - only one match with excellent scores.

### Example 2: Multiple Matches

**Input**: `router`

**Response**:

```json
{
  "libraries": [
    {
      "id": "/remix-run/react-router",
      "name": "React Router",
      "benchmarkScore": 92,
      "reputation": "High",
      "codeSnippets": 280
    },
    {
      "id": "/vuejs/router",
      "name": "Vue Router",
      "benchmarkScore": 89,
      "reputation": "High",
      "codeSnippets": 230
    },
    {
      "id": "/angular/router",
      "name": "Angular Router",
      "benchmarkScore": 85,
      "reputation": "High",
      "codeSnippets": 190
    }
  ]
}
```

**Selection**: Choose based on user's project context:

- If React project → `/remix-run/react-router`
- If Vue project → `/vuejs/router`
- If Angular project → `/angular/router`
- If unknown → Highest score (`/remix-run/react-router`)

### Example 3: Version-Specific

**Input**: `next.js`

**Response**:

```json
{
  "libraries": [
    {
      "id": "/vercel/next.js",
      "name": "Next.js",
      "version": "15.0.0",
      "benchmarkScore": 96,
      "reputation": "High",
      "codeSnippets": 380
    },
    {
      "id": "/vercel/next.js/v14.3.0-canary.87",
      "name": "Next.js (v14 canary)",
      "version": "14.3.0-canary.87",
      "benchmarkScore": 94,
      "reputation": "High",
      "codeSnippets": 350
    }
  ]
}
```

**Selection**:

- Check user's `package.json` version
- If user on v14 → use v14-specific docs
- If user on v15 or unknown → use latest

## Common Libraries

Pre-resolved IDs for frequently-used libraries:

| Library    | Official Name | Context7 ID                 | Aliases               |
| ---------- | ------------- | --------------------------- | --------------------- |
| React      | React         | `/facebook/react`           | react, reactjs        |
| Next.js    | Next.js       | `/vercel/next.js`           | nextjs, next          |
| Express    | Express       | `/expressjs/express`        | express, expressjs    |
| TypeScript | TypeScript    | `/microsoft/typescript`     | ts, typescript        |
| Tailwind   | Tailwind CSS  | `/tailwindlabs/tailwindcss` | tailwind, tailwindcss |
| Vue        | Vue.js        | `/vuejs/core`               | vue, vuejs            |
| Angular    | Angular       | `/angular/angular`          | angular, ng           |
| Svelte     | Svelte        | `/sveltejs/svelte`          | svelte                |
| FastAPI    | FastAPI       | `/tiangolo/fastapi`         | fastapi               |
| pytest     | pytest        | `/pytest-dev/pytest`        | pytest                |

## Handling Edge Cases

### No Matches Found

```json
{
  "libraries": []
}
```

**Solutions**:

1. Try alternative spellings:
   - `nextjs` → `next.js`
   - `node` → `nodejs`
   - `ts` → `typescript`
2. Search by organization:
   - `vercel` → shows Next.js
   - `facebook` → shows React, Jest
3. Use official package name from npm/PyPI

### Ambiguous Names

For generic names like "router", "utils", "helpers":

1. **Check project context**: Look at `package.json` or imports
2. **Ask user**: "Which router: React Router, Vue Router, or Angular Router?"
3. **Default to most popular**: React Router (highest benchmark score)

### Deprecated Libraries

If a library shows:

```json
{
  "id": "/old-library",
  "deprecated": true,
  "supersededBy": "/new-library"
}
```

**Action**: Warn user and suggest migration:

- "This library is deprecated. Consider migrating to [new-library]."
- Offer to fetch docs for both old and new versions

## Scoring Heuristics

When choosing between similar libraries, calculate a selection score:

```
Score = (benchmarkScore × 0.5) + (reputation_points × 0.3) + (snippets_normalized × 0.2)

reputation_points:
  - High: 100
  - Medium: 60
  - Low: 20

snippets_normalized:
  - Scale codeSnippets count to 0-100 range
```

**Example**:

Library A:

- benchmarkScore: 85
- reputation: High (100)
- codeSnippets: 200 (normalized: 80)
- **Final Score**: (85 × 0.5) + (100 × 0.3) + (80 × 0.2) = 88.5

Library B:

- benchmarkScore: 90
- reputation: Medium (60)
- codeSnippets: 150 (normalized: 60)
- **Final Score**: (90 × 0.5) + (60 × 0.3) + (60 × 0.2) = 75.0

**Select Library A** (higher final score despite lower benchmark).

## Caching Resolved IDs

Cache resolved IDs within a session to avoid repeated resolutions:

```typescript
const resolvedCache = new Map<string, string>();

function getCachedLibraryId(libraryName: string): string | null {
  return resolvedCache.get(libraryName) || null;
}

function cacheLibraryId(libraryName: string, libraryId: string): void {
  resolvedCache.set(libraryName, libraryId);
}
```

**Cache invalidation**: Clear cache when:

- User changes project dependencies
- User explicitly requests latest docs
- Session ends

## API Response Structure

Full response format from `mcp_io_github_ups_resolve-library-id`:

```typescript
interface ResolveResponse {
  libraries: Array<{
    id: string; // Context7-compatible ID (e.g., "/vercel/next.js")
    name: string; // Human-readable name
    version?: string; // Version (if version-specific)
    benchmarkScore: number; // Quality score (0-100)
    reputation: "High" | "Medium" | "Low";
    codeSnippets: number; // Number of code examples
    deprecated?: boolean; // If deprecated
    supersededBy?: string; // Replacement library ID
    description?: string; // Short description
    tags?: string[]; // Category tags
  }>;
}
```

## Troubleshooting

| Issue            | Cause                | Solution                          |
| ---------------- | -------------------- | --------------------------------- |
| Empty results    | Typo in library name | Try alternative spellings         |
| Too many results | Generic name         | Be more specific or check context |
| Wrong library    | Name collision       | Check organization/author         |
| Outdated version | Cached old data      | Clear cache and re-resolve        |

## Best Practices

1. **Always resolve first** - Never guess library IDs
2. **Cache aggressively** - Store resolved IDs for session
3. **Check context** - Use project files to disambiguate
4. **Prefer official** - Choose org-verified libraries
5. **Score-based selection** - Use the scoring heuristic
6. **Handle errors** - Gracefully fall back if resolution fails

## Related Tools

- **resolve-bulk.py**: Resolve multiple libraries at once
- **validate-cache.py**: Validate cached library IDs
- **Library Migration Guide**: For handling deprecated libraries

---

**Remember**: Resolution is required before fetching docs. Always cache the results.
