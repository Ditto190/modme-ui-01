# Feature Flags (next-forge)

This package provides a small feature-flag abstraction used by `next-forge` apps.

## What flags exist

Flags are created via `createFlag(key)` and exported from `index.ts`.

Example:

- `showBetaFeature` is exported as `showBetaFeature` and created as `createFlag("showBetaFeature")`.
- `showGenerativeUi` gates the `/generative-ui` route in `apps/app` (Phase 4 cutover prep). Default off until enabled in PostHog/analytics.

## Access control & decision source

When evaluating a flag, `createFlag(key)`:

1. Calls `auth()` to get `userId`.
2. If there is no `userId`, returns the flag default (currently `false`).
3. If there is no `analytics` client, returns the flag default.
4. Otherwise asks `analytics.isFeatureEnabled(key, userId)` and falls back to default if the result is `null/undefined`.

## Environment variables

The package defines `keys()` via `createEnv()` (see `keys.ts`).

Relevant variables:

- `FLAGS_SECRET` (read as `process.env.FLAGS_SECRET`)
- `SKIP_ENV_VALIDATION` (when set to `"true"`, skips env validation)

## Server endpoint used by apps

The package includes a handler that returns the flag definitions and their metadata (keys, description, options). When using the definitions API, ensure the caller includes an `Authorization` header accepted by `verifyAccess()`.

