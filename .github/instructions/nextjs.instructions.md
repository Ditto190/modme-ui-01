---
<<<<<<< HEAD
applyTo: '**'
---

# Next.js Best Practices for LLMs (2025)

_Last updated: July 2025_
=======
description: "Best practices for building Next.js (App Router) apps with modern caching, tooling, and server/client boundaries (aligned with Next.js 16.1.1)."
applyTo: "**/*.tsx, **/*.ts, **/*.jsx, **/*.js, **/*.css"
---

# Next.js Best Practices for LLMs (2026)

_Last updated: January 2026 (aligned to Next.js 16.1.1)_
>>>>>>> chore/adr-readme-pipeline

This document summarizes the latest, authoritative best practices for building, structuring, and maintaining Next.js applications. It is intended for use by LLMs and developers to ensure code quality, maintainability, and scalability.

---

## 1. Project Structure & Organization

- **Use the `app/` directory** (App Router) for all new projects. Prefer it over the legacy `pages/` directory.
- **Top-level folders:**
  - `app/` — Routing, layouts, pages, and route handlers
  - `public/` — Static assets (images, fonts, etc.)
  - `lib/` — Shared utilities, API clients, and logic
  - `components/` — Reusable UI components
  - `contexts/` — React context providers
  - `styles/` — Global and modular stylesheets
  - `hooks/` — Custom React hooks
  - `types/` — TypeScript type definitions
- **Colocation:** Place files (components, styles, tests) near where they are used, but avoid deeply nested structures.
- **Route Groups:** Use parentheses (e.g., `(admin)`) to group routes without affecting the URL path.
- **Private Folders:** Prefix with `_` (e.g., `_internal`) to opt out of routing and signal implementation details.
<<<<<<< HEAD

- **Feature Folders:** For large apps, group by feature (e.g., `app/dashboard/`, `app/auth/`).
- **Use `src/`** (optional): Place all source code in `src/` to separate from config files.

## 2.1. Server and Client Component Integration (App Router)
=======
- **Feature Folders:** For large apps, group by feature (e.g., `app/dashboard/`, `app/auth/`).
- **Use `src/`** (optional): Place all source code in `src/` to separate from config files.

## 2. Next.js 16+ App Router Best Practices

### 2.1. Server and Client Component Integration (App Router)
>>>>>>> chore/adr-readme-pipeline

**Never use `next/dynamic` with `{ ssr: false }` inside a Server Component.** This is not supported and will cause a build/runtime error.

**Correct Approach:**
<<<<<<< HEAD
=======

>>>>>>> chore/adr-readme-pipeline
- If you need to use a Client Component (e.g., a component that uses hooks, browser APIs, or client-only libraries) inside a Server Component, you must:
  1. Move all client-only logic/UI into a dedicated Client Component (with `'use client'` at the top).
  2. Import and use that Client Component directly in the Server Component (no need for `next/dynamic`).
  3. If you need to compose multiple client-only elements (e.g., a navbar with a profile dropdown), create a single Client Component that contains all of them.

**Example:**

```tsx
// Server Component
<<<<<<< HEAD
import DashboardNavbar from '@/components/DashboardNavbar';
=======
import DashboardNavbar from "@/components/DashboardNavbar";
>>>>>>> chore/adr-readme-pipeline

export default async function DashboardPage() {
  // ...server logic...
  return (
    <>
      <DashboardNavbar /> {/* This is a Client Component */}
      {/* ...rest of server-rendered page... */}
    </>
  );
}
```

**Why:**
<<<<<<< HEAD
=======

>>>>>>> chore/adr-readme-pipeline
- Server Components cannot use client-only features or dynamic imports with SSR disabled.
- Client Components can be rendered inside Server Components, but not the other way around.

**Summary:**
Always move client-only UI into a Client Component and import it directly in your Server Component. Never use `next/dynamic` with `{ ssr: false }` in a Server Component.

<<<<<<< HEAD
---

## 2. Component Best Practices
=======
### 2.2. Next.js 16+ async request APIs (App Router)

- **Assume request-bound data is async in Server Components and Route Handlers.** In Next.js 16, APIs like `cookies()`, `headers()`, and `draftMode()` are async in the App Router.
- **Be careful with route props:** `params` / `searchParams` may be Promises in Server Components. Prefer `await`ing them instead of treating them as plain objects.
- **Avoid dynamic rendering by accident:** Accessing request data (cookies/headers/searchParams) opts the route into dynamic behavior. Read them intentionally and isolate dynamic parts behind `Suspense` boundaries when appropriate.

---

## 3. Component Best Practices
>>>>>>> chore/adr-readme-pipeline

- **Component Types:**
  - **Server Components** (default): For data fetching, heavy logic, and non-interactive UI.
  - **Client Components:** Add `'use client'` at the top. Use for interactivity, state, or browser APIs.
- **When to Create a Component:**
  - If a UI pattern is reused more than once.
  - If a section of a page is complex or self-contained.
  - If it improves readability or testability.
- **Naming Conventions:**
  - Use `PascalCase` for component files and exports (e.g., `UserCard.tsx`).
  - Use `camelCase` for hooks (e.g., `useUser.ts`).
  - Use `snake_case` or `kebab-case` for static assets (e.g., `logo_dark.svg`).
  - Name context providers as `XyzProvider` (e.g., `ThemeProvider`).
- **File Naming:**
  - Match the component name to the file name.
  - For single-export files, default export the component.
  - For multiple related components, use an `index.ts` barrel file.
- **Component Location:**
  - Place shared components in `components/`.
  - Place route-specific components inside the relevant route folder.
- **Props:**
  - Use TypeScript interfaces for props.
  - Prefer explicit prop types and default values.
- **Testing:**
  - Co-locate tests with components (e.g., `UserCard.test.tsx`).

<<<<<<< HEAD
## 3. Naming Conventions (General)
=======
## 4. Naming Conventions (General)
>>>>>>> chore/adr-readme-pipeline

- **Folders:** `kebab-case` (e.g., `user-profile/`)
- **Files:** `PascalCase` for components, `camelCase` for utilities/hooks, `kebab-case` for static assets
- **Variables/Functions:** `camelCase`
- **Types/Interfaces:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`

<<<<<<< HEAD
## 4. API Routes (Route Handlers)
=======
## 5. API Routes (Route Handlers)
>>>>>>> chore/adr-readme-pipeline

- **Prefer API Routes over Edge Functions** unless you need ultra-low latency or geographic distribution.
- **Location:** Place API routes in `app/api/` (e.g., `app/api/users/route.ts`).
- **HTTP Methods:** Export async functions named after HTTP verbs (`GET`, `POST`, etc.).
- **Request/Response:** Use the Web `Request` and `Response` APIs. Use `NextRequest`/`NextResponse` for advanced features.
- **Dynamic Segments:** Use `[param]` for dynamic API routes (e.g., `app/api/users/[id]/route.ts`).
- **Validation:** Always validate and sanitize input. Use libraries like `zod` or `yup`.
- **Error Handling:** Return appropriate HTTP status codes and error messages.
- **Authentication:** Protect sensitive routes using middleware or server-side session checks.

<<<<<<< HEAD
## 5. General Best Practices

- **TypeScript:** Use TypeScript for all code. Enable `strict` mode in `tsconfig.json`.
- **ESLint & Prettier:** Enforce code style and linting. Use the official Next.js ESLint config.
- **Environment Variables:** Store secrets in `.env.local`. Never commit secrets to version control.
=======
### Route Handler usage note (performance)

- **Do not call your own Route Handlers from Server Components** (e.g., `fetch('/api/...')`) just to reuse logic. Prefer extracting shared logic into modules (e.g., `lib/`) and calling it directly to avoid extra server hops.

## 6. General Best Practices

- **TypeScript:** Use TypeScript for all code. Enable `strict` mode in `tsconfig.json`.
- **ESLint & Prettier:** Enforce code style and linting. Use the official Next.js ESLint config. In Next.js 16, prefer running ESLint via the ESLint CLI (not `next lint`).
- **Environment Variables:** Store secrets in `.env.local`. Never commit secrets to version control.
  - In Next.js 16, `serverRuntimeConfig` / `publicRuntimeConfig` are removed. Use environment variables instead.
  - `NEXT_PUBLIC_` variables are **inlined at build time** (changing them after build won’t affect a deployed build).
  - If you truly need runtime evaluation of env in a dynamic context, follow Next.js guidance (e.g., call `connection()` before reading `process.env`).
>>>>>>> chore/adr-readme-pipeline
- **Testing:** Use Jest, React Testing Library, or Playwright. Write tests for all critical logic and components.
- **Accessibility:** Use semantic HTML and ARIA attributes. Test with screen readers.
- **Performance:**
  - Use built-in Image and Font optimization.
<<<<<<< HEAD
=======
  - Prefer **Cache Components** (`cacheComponents` + `use cache`) over legacy caching patterns.
>>>>>>> chore/adr-readme-pipeline
  - Use Suspense and loading states for async data.
  - Avoid large client bundles; keep most logic in Server Components.
- **Security:**
  - Sanitize all user input.
  - Use HTTPS in production.
  - Set secure HTTP headers.
<<<<<<< HEAD
=======
  - Prefer server-side authorization for Server Actions and Route Handlers; never trust client input.
>>>>>>> chore/adr-readme-pipeline
- **Documentation:**
  - Write clear README and code comments.
  - Document public APIs and components.

<<<<<<< HEAD
# Avoid Unnecessary Example Files

Do not create example/demo files (like ModalExample.tsx) in the main codebase unless the user specifically requests a live example, Storybook story, or explicit documentation component. Keep the repository clean and production-focused by default.

# Always use the latest documentation and guides
- For every nextjs related request, begin by searching for the most current nextjs documentation, guides, and examples.
- Use the following tools to fetch and search documentation if they are available:
  - `resolve_library_id` to resolve the package/library name in the docs.
  - `get_library_docs` for up to date documentation.


=======
## 7. Caching & Revalidation (Next.js 16 Cache Components)

- **Prefer Cache Components for memoization/caching** in the App Router.
  - Enable in `next.config.*` via `cacheComponents: true`.
  - Use the **`use cache` directive** to opt a component/function into caching.
- **Use cache tagging and lifetimes intentionally:**
  - Use `cacheTag(...)` to associate cached results with tags.
  - Use `cacheLife(...)` to control cache lifetime (presets or configured profiles).
- **Revalidation guidance:**
  - Prefer `revalidateTag(tag, 'max')` (stale-while-revalidate) for most cases.
  - The single-argument form `revalidateTag(tag)` is legacy/deprecated.
  - Use `updateTag(...)` inside **Server Actions** when you need “read-your-writes” / immediate consistency.
- **Avoid `unstable_cache`** for new code; treat it as legacy and migrate toward Cache Components.

## 8. Tooling updates (Next.js 16)

- **Turbopack is the default dev bundler.** Configure via the top-level `turbopack` field in `next.config.*` (do not use the removed `experimental.turbo`).
- **Typed routes are stable** via `typedRoutes` (TypeScript required).

## 9. Avoid Unnecessary Example Files

Do not create example/demo files (like ModalExample.tsx) in the main codebase unless the user specifically requests a live example, Storybook story, or explicit documentation component. Keep the repository clean and production-focused by default.

## 10. Always Use the Latest Documentation and Guides

- For every Next.js related request, begin by searching for the most up-to-date Next.js documentation, guides, and examples.
- Use the following tools to fetch and search documentation if they are available:
  - `resolve_library_id` to resolve the package/library name in the docs.
  - `get_library_docs` for up-to-date documentation.
>>>>>>> chore/adr-readme-pipeline
