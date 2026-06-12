# Infisical Secret Management Integration

This package provides a comprehensive secret management solution using Infisical SDK v4 with additional features:

## Key Features

✅ **Hierarchical Secret Resolution** - App-specific → Apps shared → Environment variables
✅ **Application-level Caching** - Reduces API calls (Infisical SDK v4 doesn't cache regular secrets)
✅ **Dynamic Secret Management** - Full CRUD operations for secrets
✅ **Automatic Retries** - Built-in retry logic with configurable attempts
✅ **Type Safety** - Full TypeScript support with strict mode compatibility
✅ **Backward Compatibility** - Synchronous methods for legacy code

## Why Our Own Cache?

After investigating the Infisical SDK v4 source code, we confirmed that:
- The SDK **does not provide caching** for regular secret reads
- TTL settings in the SDK are only for dynamic secrets and leases
- Our application-level cache significantly improves performance by reducing API calls

## Setup

### Environment Variables

```bash
# Required for production/CI
INFISICAL_CLIENT_ID=your-machine-identity-client-id
INFISICAL_CLIENT_SECRET=your-machine-identity-client-secret

# Project hierarchy (optional)
INFISICAL_APP_PROJECT_ID=app-specific-project-id      # Highest priority
INFISICAL_APPS_PROJECT_ID=shared-apps-project-id      # Medium priority
INFISICAL_PLATFORM_PROJECT_ID=platform-project-id     # Lowest priority

# Environment
NODE_ENV=development  # or staging, production

# Optional
INFISICAL_SITE_URL=https://app.infisical.com  # For self-hosted instances
```

### Local Development

You have three options:

1. **Use Infisical CLI** (Recommended)
   ```bash
   infisical login
   infisical export > .env
   ```

2. **Use environment variables from .env files**
   ```bash
   # Create .env file with your secrets
   cp .env.example .env
   ```

3. **Use SDK with service token**
   ```bash
   # Set INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET
   # SDK will fetch secrets directly from Infisical
   ```

## Usage Examples

### Basic Usage

```typescript
import { secretManager, SecretKeys } from '@adaptiveworx/shared/config';

// Async usage (recommended - uses Infisical SDK)
const apiKey = await secretManager.getSecretAsync('API_KEY');
const dbUrl = await secretManager.getRequiredSecret(SecretKeys.DATABASE_URL);

// Get multiple secrets at once
const secrets = await secretManager.getSecrets([
  SecretKeys.DATABASE_URL,
  SecretKeys.REDIS_URL,
  SecretKeys.JWT_SECRET,
]);

// Backward compatible sync usage (env vars only)
const port = secretManager.getSecretOrDefault('PORT', '3000');
```

### Dynamic Secret Management

```typescript
// Create a new secret
await secretManager.createSecret('NEW_API_KEY', 'secret-value', {
  path: '/api',
  comment: 'API key for external service',
  tags: ['api', 'external'],
});

// Update an existing secret
await secretManager.updateSecret('API_KEY', 'new-value', {
  path: '/api',
  comment: 'Updated API key',
});

// Delete a secret
await secretManager.deleteSecret('OLD_KEY', {
  path: '/deprecated',
});

// List all secrets
const allSecrets = await secretManager.listSecrets({
  environment: 'production',
  path: '/',
});
```

### Validation

```typescript
// Validate required secrets at startup
const validation = await secretManager.validateRequiredSecrets([
  SecretKeys.DATABASE_URL,
  SecretKeys.JWT_SECRET,
  SecretKeys.REDIS_URL,
]);

if (!validation.valid) {
  console.error('Missing required secrets:', validation.missing);
  process.exit(1);
}
```

### Cache Management

```typescript
// Our application-level cache reduces API calls
const stats = secretManager.getCacheStats();
console.log(`Cached secrets: ${stats.size}`);

// Refresh all cached secrets
await secretManager.refreshCache();

// Clear cache (useful for testing)
secretManager.clearCache();
```

### Load Common Secrets

```typescript
// Load all common application secrets at once
const config = await secretManager.loadCommonSecrets();

// Returns structured config:
// {
//   database: { url, poolMin, poolMax },
//   api: { port, host, corsOrigin, jwtSecret },
//   redis: { url, host, port, password }
// }
```

## API Server Example

```typescript
// apps/api/src/index.ts
import { secretManager, SecretKeys } from '@adaptiveworx/shared/config';

async function startServer() {
  // Validate required secrets
  const validation = await secretManager.validateRequiredSecrets([
    SecretKeys.DATABASE_URL,
    SecretKeys.JWT_SECRET,
  ]);

  if (!validation.valid) {
    console.error('Missing secrets:', validation.missing);
    process.exit(1);
  }

  // Load configuration
  const config = await secretManager.loadCommonSecrets();

  // Use secrets
  const app = fastify({
    logger: true,
  });

  await app.listen({
    port: parseInt(config.api.port || '3000'),
    host: config.api.host || '0.0.0.0',
  });
}

startServer().catch(console.error);
```

## Testing

The integration includes comprehensive unit tests that mock the Infisical SDK:

```typescript
// Example test
import { SecretManager } from '@adaptiveworx/shared/config';
import { vi } from 'vitest';

const mockInfisicalManager = {
  initialize: vi.fn(),
  getSecret: vi.fn().mockResolvedValue('test-value'),
  // ... other methods
};

const secretManager = new SecretManager(mockInfisicalManager);
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     SecretManager                        │
│  (High-level API with backward compatibility)            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   InfisicalManager                       │
│  (SDK integration + caching + hierarchical resolution)   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Infisical SDK v4                      │
│  (Direct API communication, no caching)                  │
└─────────────────────────────────────────────────────────┘
```

## Migration from Environment Variables

```typescript
// Before (env vars only)
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('API_KEY not found');

// After (with Infisical)
const apiKey = await secretManager.getRequiredSecret('API_KEY');
```

## Best Practices

1. **Use async methods** - They provide full Infisical integration
2. **Validate at startup** - Check all required secrets before starting
3. **Use SecretKeys constants** - Type-safe secret key references
4. **Handle missing secrets gracefully** - Provide helpful error messages
5. **Don't log secret values** - Only log that secrets were loaded
6. **Use hierarchical projects** - Organize secrets by scope
7. **Leverage caching** - Our cache reduces API calls significantly

## Troubleshooting

### No credentials provided warning
```
Infisical: No credentials provided, using environment variables only
```
**Solution**: Set `INFISICAL_CLIENT_ID` and `INFISICAL_CLIENT_SECRET` for production.

### Secret not found
```
Required secret 'KEY' not found
```
**Solution**: Ensure the secret exists in Infisical or environment variables.

### Initialization failed
```
Infisical initialization failed: [error message]
```
**Solution**: Check your credentials and network connectivity.

## Performance

Our caching layer provides significant performance benefits:
- **First access**: ~100-200ms (API call)
- **Cached access**: <1ms (memory lookup)
- **Cache TTL**: 5 minutes (configurable)
- **Parallel fetching**: Multiple secrets fetched concurrently

## Security

- Secrets are never logged or exposed in error messages
- Machine identity authentication for production
- Hierarchical access control via project IDs
- Automatic credential rotation support
- Environment-based secret isolation