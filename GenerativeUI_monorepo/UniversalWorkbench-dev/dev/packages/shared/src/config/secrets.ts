/**
 * Secret management with Infisical SDK integration
 *
 * This module provides a unified interface for secret management across environments:
 *
 * LOCAL DEVELOPMENT:
 * - Option 1: Use Infisical CLI: `infisical login` then `infisical export > .env`
 * - Option 2: Use env variables from .env files
 * - Option 3: Use Infisical SDK with service token
 *
 * CI/CD & PRODUCTION:
 * - Uses Infisical SDK with machine identity (INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET)
 * - Secrets fetched directly from Infisical API with caching
 * - Hierarchical resolution: app-specific -> apps shared -> platform -> env vars
 */

import { type InfisicalManager, infisical } from './infisical.js';

/**
 * Common secret keys used across the application
 */
export const SecretKeys = {
  // Database
  DATABASE_URL: 'DATABASE_URL',
  DATABASE_POOL_MIN: 'DATABASE_POOL_MIN',
  DATABASE_POOL_MAX: 'DATABASE_POOL_MAX',

  // API Configuration
  PORT: 'PORT',
  HOST: 'HOST',
  API_KEY: 'API_KEY',
  JWT_SECRET: 'JWT_SECRET',
  CORS_ORIGIN: 'CORS_ORIGIN',

  // Redis
  REDIS_URL: 'REDIS_URL',
  REDIS_HOST: 'REDIS_HOST',
  REDIS_PORT: 'REDIS_PORT',
  REDIS_PASSWORD: 'REDIS_PASSWORD',

  // External Services
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  STRIPE_SECRET_KEY: 'STRIPE_SECRET_KEY',
  STRIPE_WEBHOOK_SECRET: 'STRIPE_WEBHOOK_SECRET',
  SENDGRID_API_KEY: 'SENDGRID_API_KEY',

  // AWS
  AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
  AWS_REGION: 'AWS_REGION',
  AWS_S3_BUCKET: 'AWS_S3_BUCKET',

  // Monitoring
  SENTRY_DSN: 'SENTRY_DSN',
  DATADOG_API_KEY: 'DATADOG_API_KEY',
  NEW_RELIC_LICENSE_KEY: 'NEW_RELIC_LICENSE_KEY',
} as const;

export type SecretKey = (typeof SecretKeys)[keyof typeof SecretKeys];

/**
 * Enhanced SecretManager that wraps Infisical integration
 * Provides backward compatibility with existing code while adding new capabilities
 */
export class SecretManager {
  private infisicalManager: InfisicalManager;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(infisicalManager?: InfisicalManager) {
    this.infisicalManager = infisicalManager || infisical;
  }

  /**
   * Initialize the secret manager
   * This is called automatically on first secret access
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    await this.initPromise;
    this.initPromise = null;
  }

  private async _initialize(): Promise<void> {
    try {
      await this.infisicalManager.initialize();
      this.initialized = true;
    } catch (error) {
      // Log error in development, but don't fail - fall back to env vars
      if (process.env['NODE_ENV'] === 'development') {
        // In development, log a warning but continue
        // biome-ignore lint/suspicious/noConsole: Development-only warning for Infisical fallback
        console.warn('Infisical initialization failed, using environment variables:', error);
      }
      // Mark as initialized to prevent retry attempts
      // This allows graceful degradation to environment variables
      this.initialized = true;
    }
  }

  /**
   * Get a secret synchronously (for backward compatibility)
   * Note: This only checks environment variables. Use getSecretAsync for full functionality.
   * @deprecated Use getSecretAsync for full Infisical integration
   */
  getSecret(key: string): string {
    const value = process.env[key];
    if (value === undefined || value === '') {
      throw new Error(
        `Secret '${key}' not found in environment variables. ` +
          `Use getSecretAsync() for Infisical integration or ensure the variable is set.`
      );
    }
    return value;
  }

  /**
   * Get a secret asynchronously with full Infisical integration
   */
  async getSecretAsync(
    key: string,
    options?: { projectId?: string; path?: string; required?: boolean }
  ): Promise<string | undefined> {
    await this.initialize();

    const value = await this.infisicalManager.getSecret(key, options);

    if (options?.required && !value) {
      throw new Error(
        `Required secret '${key}' not found. ` +
          `Ensure it exists in Infisical or environment variables.`
      );
    }

    return value;
  }

  /**
   * Get a required secret (throws if not found)
   */
  async getRequiredSecret(
    key: string,
    options?: { projectId?: string; path?: string }
  ): Promise<string> {
    await this.initialize();
    return this.infisicalManager.getRequiredSecret(key, options);
  }

  /**
   * Get multiple secrets at once
   */
  async getSecrets(
    keys: string[],
    options?: { projectId?: string; path?: string }
  ): Promise<Record<string, string | undefined>> {
    await this.initialize();
    return this.infisicalManager.getSecrets(keys, options);
  }

  /**
   * Get a secret with a default fallback (synchronous, env vars only)
   * @deprecated Use getSecretOrDefaultAsync for full Infisical integration
   */
  getSecretOrDefault(key: string, defaultValue: string): string {
    const value = process.env[key];
    return value !== undefined && value !== '' ? value : defaultValue;
  }

  /**
   * Get a secret with a default fallback (asynchronous, full integration)
   */
  async getSecretOrDefaultAsync(
    key: string,
    defaultValue: string,
    options?: { projectId?: string; path?: string }
  ): Promise<string> {
    const value = await this.getSecretAsync(key, options);
    return value || defaultValue;
  }

  /**
   * Check if a secret exists (synchronous, env vars only)
   * @deprecated Use hasSecretAsync for full Infisical integration
   */
  hasSecret(key: string): boolean {
    const value = process.env[key];
    return value !== undefined && value !== '';
  }

  /**
   * Check if a secret exists (asynchronous, full integration)
   */
  async hasSecretAsync(
    key: string,
    options?: { projectId?: string; path?: string }
  ): Promise<boolean> {
    const value = await this.getSecretAsync(key, options);
    return value !== undefined && value !== '';
  }

  /**
   * Create a new secret in Infisical
   */
  async createSecret(
    key: string,
    value: string,
    options?: { projectId?: string; path?: string; comment?: string; tags?: string[] }
  ): Promise<void> {
    await this.initialize();
    await this.infisicalManager.createSecret({
      key,
      value,
      ...options,
    });
  }

  /**
   * Update an existing secret in Infisical
   */
  async updateSecret(
    key: string,
    value: string,
    options?: { projectId?: string; path?: string; comment?: string }
  ): Promise<void> {
    await this.initialize();
    await this.infisicalManager.updateSecret({
      key,
      value,
      ...options,
    });
  }

  /**
   * Delete a secret from Infisical
   */
  async deleteSecret(key: string, options?: { projectId?: string; path?: string }): Promise<void> {
    await this.initialize();
    await this.infisicalManager.deleteSecret({
      key,
      ...options,
    });
  }

  /**
   * List all available secrets
   */
  async listSecrets(options?: {
    projectId?: string;
    path?: string;
    environment?: string;
  }): Promise<Array<{ key: string; value: string; updatedAt: Date }>> {
    await this.initialize();
    const secrets = await this.infisicalManager.listSecrets(options);
    return secrets.map((s) => ({
      key: s.key,
      value: s.value,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Refresh all cached secrets
   */
  async refreshCache(): Promise<void> {
    await this.initialize();
    await this.infisicalManager.refreshCache();
  }

  /**
   * Clear the secret cache
   */
  clearCache(): void {
    this.infisicalManager.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return this.infisicalManager.getCacheStats();
  }

  /**
   * Validate that all required secrets are present
   */
  async validateRequiredSecrets(keys: string[]): Promise<{ valid: boolean; missing: string[] }> {
    await this.initialize();
    const secrets = await this.getSecrets(keys);
    const missing = keys.filter((key) => !secrets[key]);

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Load common application secrets
   */
  async loadCommonSecrets(): Promise<{
    database: {
      url?: string | undefined;
      poolMin?: string | undefined;
      poolMax?: string | undefined;
    };
    api: {
      port?: string | undefined;
      host?: string | undefined;
      corsOrigin?: string | undefined;
      jwtSecret?: string | undefined;
    };
    redis: {
      url?: string | undefined;
      host?: string | undefined;
      port?: string | undefined;
      password?: string | undefined;
    };
  }> {
    await this.initialize();

    const [database, api, redis] = await Promise.all([
      this.getSecrets([
        SecretKeys.DATABASE_URL,
        SecretKeys.DATABASE_POOL_MIN,
        SecretKeys.DATABASE_POOL_MAX,
      ]),
      this.getSecrets([
        SecretKeys.PORT,
        SecretKeys.HOST,
        SecretKeys.CORS_ORIGIN,
        SecretKeys.JWT_SECRET,
      ]),
      this.getSecrets([
        SecretKeys.REDIS_URL,
        SecretKeys.REDIS_HOST,
        SecretKeys.REDIS_PORT,
        SecretKeys.REDIS_PASSWORD,
      ]),
    ]);

    return {
      database: {
        url: database[SecretKeys.DATABASE_URL],
        poolMin: database[SecretKeys.DATABASE_POOL_MIN],
        poolMax: database[SecretKeys.DATABASE_POOL_MAX],
      },
      api: {
        port: api[SecretKeys.PORT],
        host: api[SecretKeys.HOST],
        corsOrigin: api[SecretKeys.CORS_ORIGIN],
        jwtSecret: api[SecretKeys.JWT_SECRET],
      },
      redis: {
        url: redis[SecretKeys.REDIS_URL],
        host: redis[SecretKeys.REDIS_HOST],
        port: redis[SecretKeys.REDIS_PORT],
        password: redis[SecretKeys.REDIS_PASSWORD],
      },
    };
  }
}

// Singleton instance with default Infisical manager
export const secretManager = new SecretManager();

// Export for testing and custom configurations
export { infisical } from './infisical.js';
