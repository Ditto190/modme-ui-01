# Build Tools & Utilities

Modern build utilities for the ModMe GenUI Workbench using `ofetch` and `unplugin`.

## 🚀 Tools Included

### 1. ofetch - Better Fetch API

A modern fetch wrapper with auto-retry, interceptors, and better error handling.

**Key Features**:

- ✅ Auto-retry on failure (configurable)
- ✅ Request/response interceptors
- ✅ Timeout handling
- ✅ Type-safe responses
- ✅ GraphQL support
- ✅ File upload helpers
- ✅ Streaming responses

**Location**: `src/utils/fetch.ts`

**Usage**:

```typescript
import { $fetch, $api } from "@/utils/fetch";

// Simple GET
const user = await $api<User>("/users/123");

// POST with body
const newUser = await $api("/users", {
  method: "POST",
  body: { name: "John", email: "john@example.com" },
});

// GraphQL
const data = await $graphql(
  `
  query GetUser($id: ID!) {
    user(id: $id) { name email }
  }
`,
  { id: "123" }
);
```

**Examples**: See `src/utils/fetch-examples.ts` for 15 detailed examples

### 2. unplugin - Unified Plugin System

Write build plugins once, use everywhere (Vite, Rollup, Webpack, esbuild).

**Key Features**:

- ✅ Transform source code
- ✅ Virtual modules
- ✅ Auto-imports
- ✅ Custom file types (CSS modules, Markdown)
- ✅ Environment variable injection
- ✅ Bundle analysis
- ✅ Hot module reload

**Location**: `build-utils/unplugin.config.ts`

**Usage**:

```typescript
// In vite.config.ts
import {
  transformPlugin,
  virtualModulesPlugin,
} from "./build-utils/unplugin.config";

export default defineConfig({
  plugins: [transformPlugin.vite(), virtualModulesPlugin.vite()],
});
```

**Examples**: 10 plugin examples in `build-utils/unplugin.config.ts`

## 📦 Installation

Already installed! Dependencies added to `package.json`:

```json
{
  "devDependencies": {
    "ofetch": "^1.4.x",
    "unplugin": "^2.0.x"
  }
}
```

## 🎯 Quick Start

### Using ofetch

1. **Basic API calls**:

```typescript
import { $api } from "@/utils/fetch";

// GET request
const users = await $api<User[]>("/users");

// POST request
const created = await $api("/users", {
  method: "POST",
  body: { name: "Alice" },
});
```

2. **With authentication**:

```typescript
// Already configured in $api instance
// Add NEXT_PUBLIC_API_TOKEN to .env
const data = await $api("/protected-endpoint");
```

3. **File uploads**:

```typescript
import { $upload } from "@/utils/fetch";

const result = await $upload("/upload", file);
```

4. **Streaming LLM responses**:

```typescript
import { $stream } from "@/utils/fetch";

for await (const chunk of $stream("/llm/stream", {
  method: "POST",
  body: { prompt: "Hello AI" },
})) {
  console.log(chunk);
}
```

### Using unplugin

1. **Create a custom plugin**:

```typescript
import { createUnplugin } from "unplugin";

export const myPlugin = createUnplugin(() => ({
  name: "my-plugin",
  transform(code, id) {
    // Transform code here
    return { code, map: null };
  },
}));
```

2. **Use in Vite**:

```typescript
// vite.config.ts
import { myPlugin } from "./plugins/my-plugin";

export default defineConfig({
  plugins: [myPlugin.vite()],
});
```

3. **Use in Next.js (webpack)**:

```typescript
// next.config.ts
import { myPlugin } from "./plugins/my-plugin";

export default {
  webpack: (config) => {
    config.plugins.push(myPlugin.webpack());
    return config;
  },
};
```

## 🧪 Examples Provided

### ofetch Examples (`src/utils/fetch-examples.ts`)

1. ✅ Basic GET request
2. ✅ POST with body
3. ✅ Query parameters
4. ✅ Custom headers
5. ✅ Error handling
6. ✅ Retry on specific status codes
7. ✅ Interceptor pattern
8. ✅ GraphQL query
9. ✅ File upload
10. ✅ Streaming responses
11. ✅ Abort controller
12. ✅ Parallel requests
13. ✅ External API calls
14. ✅ Blob responses (file downloads)
15. ✅ Text/HTML responses

### unplugin Examples (`build-utils/unplugin.config.ts`)

1. ✅ Transform plugin
2. ✅ Virtual modules
3. ✅ Code injection
4. ✅ Environment variables
5. ✅ Auto-import
6. ✅ CSS modules
7. ✅ Markdown parser
8. ✅ Bundle analyzer
9. ✅ Hot reload
10. ✅ Path aliases

## 📚 Integration with Existing Stack

### With CopilotKit

```typescript
import { $api } from "@/utils/fetch";
import { useCopilotAction } from "@copilotkit/react-core";

useCopilotAction({
  name: "fetchData",
  handler: async ({ query }) => {
    const results = await $api("/search", { query: { q: query } });
    return results;
  },
});
```

### With Agent Workflows

```typescript
import { $api } from '@/utils/fetch';

// Call Python agent
const response = await $api('http://localhost:8000/', {
  method: 'POST',
  body: {
    tool: 'upsert_ui_element',
    params: { id: 'card1', type: 'StatCard', props: {...} }
  }
});
```

### With MCP Servers

```typescript
import { $fetch } from "@/utils/fetch";

// Call genai-toolbox MCP server
const summary = await $fetch("http://localhost:3001/tools/summarize", {
  method: "POST",
  body: { text: "Long text...", style: "concise" },
});
```

## 🔧 Configuration

### ofetch Configuration

Edit `src/utils/fetch.ts` to customize:

```typescript
const defaultOptions: FetchOptions = {
  retry: 3, // Number of retries
  retryDelay: 500, // Delay between retries (ms)
  timeout: 30000, // Request timeout (ms)
  baseURL: "http://localhost:8000", // API base URL

  // Add interceptors
  onRequest({ options }) {
    // Modify request
  },

  onResponse({ response }) {
    // Process response
  },
};
```

### unplugin Configuration

Create custom plugins in `build-utils/unplugin.config.ts`:

```typescript
export const myCustomPlugin = createUnplugin((options) => ({
  name: "my-custom-plugin",

  // Transform code
  transform(code, id) {
    return { code, map: null };
  },

  // Resolve modules
  resolveId(id) {
    // Custom resolution logic
  },

  // Load modules
  load(id) {
    // Custom loading logic
  },
}));
```

## 🎓 Advanced Patterns

### 1. Request Deduplication

```typescript
const cache = new Map();

export async function cachedFetch<T>(url: string): Promise<T> {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const promise = $api<T>(url);
  cache.set(url, promise);

  try {
    const result = await promise;
    cache.set(url, result);
    return result;
  } catch (error) {
    cache.delete(url);
    throw error;
  }
}
```

### 2. Optimistic Updates

```typescript
export async function optimisticUpdate<T>(
  url: string,
  newData: T,
  rollback: () => void
): Promise<T> {
  try {
    return await $api(url, { method: "PUT", body: newData });
  } catch (error) {
    rollback();
    throw error;
  }
}
```

### 3. Plugin Composition

```typescript
import { createUnplugin } from "unplugin";

export const composedPlugin = createUnplugin(() => {
  const plugins = [plugin1(), plugin2(), plugin3()];

  return {
    name: "composed",
    transform(code, id) {
      let result = code;
      for (const plugin of plugins) {
        result = plugin.transform(result, id) || result;
      }
      return { code: result, map: null };
    },
  };
});
```

## 🐛 Troubleshooting

### ofetch Issues

**Problem**: CORS errors

```typescript
// Add proxy in next.config.ts
module.exports = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },
};
```

**Problem**: Timeout errors

```typescript
// Increase timeout
const data = await $api("/slow-endpoint", {
  timeout: 60000, // 60 seconds
});
```

### unplugin Issues

**Problem**: Plugin not loading

- Check plugin is registered in config
- Verify plugin returns correct object structure
- Check console for plugin errors

**Problem**: Transform not applied

- Ensure file ID matches plugin filter
- Check transform returns valid code
- Verify plugin order in config

## 📖 References

- **ofetch GitHub**: https://github.com/unjs/ofetch
- **ofetch Examples**: https://github.com/unjs/ofetch/tree/main/examples
- **unplugin GitHub**: https://github.com/unjs/unplugin
- **unplugin README**: https://github.com/unjs/unplugin/blob/main/README.md

## 🤝 Contributing

When adding new utilities:

1. Add to appropriate directory (`src/utils/` or `build-utils/`)
2. Document with JSDoc comments
3. Add examples to `*-examples.ts` files
4. Update this README with new features
5. Test with existing stack (CopilotKit, Next.js, agents)

---

**Built with** ❤️ **for ModMe GenUI Workbench**

_Part of the ModifyMe Consulting GenUI R&D Laboratory_
