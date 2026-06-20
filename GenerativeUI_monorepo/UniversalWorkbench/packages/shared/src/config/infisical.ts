/**
 * Infisical SDK integration for secret management
 *
 * This module provides a comprehensive secret management system with:
 * - Hierarchical secret resolution (app-specific -> worx-apps -> env)
 * - Dynamic secret management (CRUD operations)
 * - Application-level caching (SDK v4 doesn't provide caching for regular secrets)
 * - Type-safe secret access
 * - Automatic retries and error handling
 *
 * Note: We implement our own caching layer because Infisical SDK v4 doesn't
 * cache regular secrets. This reduces API calls and improves performance.
 *
 * The worx-platform project is for infrastructure/platform secrets and is
 * managed separately, not part of the application secret hierarchy.
 */

import {
  InfisicalSDK,
  type CreateSecretOptions as SDKCreateSecretOptions,
  type DeleteSecretOptions as SDKDeleteSecretOptions,
  type GetSecretOptions as SDKGetSecretOptions,
  type ListSecretsOptions as SDKListSecretsOptions,
  type UpdateSecretOptions as SDKUpdateSecretOptions,
  type Secret,
  SecretType,
} from '@infisical/sdk';

export interface InfisicalConfig {
  // Client authentication
  clientId?: string | undefined;
  clientSecret?: string | undefined;
  siteUrl?: string | undefined;

  // Application secret hierarchy
  appProjectId?: string | undefined; // App-specific secrets (highest priority, optional)
  appsProjectId?: string | undefined; // Shared app secrets (default for all apps)

  // Infrastructure/platform secrets (separate from app hierarchy)
  platformProjectId?: string | undefined; // Platform secrets (AWS, monitoring, etc.)

  // Environment settings
  environment: string;
  projectSlug?: string | undefined;

  // Cache settings
  cacheTTL?: number | undefined; // Cache TTL in milliseconds (default: 5 minutes)
  enableCache?: boolean | undefined; // Enable caching (default: true)

  // Retry settings
  maxRetries?: number | undefined; // Max retry attempts (default: 3)
  retryDelay?: number | undefined; // Delay between retries in ms (default: 1000)
}

export interface CachedSecret {
  value: string;
  timestamp: number;
  ttl: number;
}

export interface SecretMetadata {
  key: string;
  value: string;
  type: 'shared' | 'personal';
  version: number;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[] | undefined;
  comment?: string | undefined;
}

export interface CreateSecretOptions {
  key: string;
  value: string;
  projectId?: string;
  path?: string;
  type?: 'shared' | 'personal';
  tags?: string[];
  comment?: string;
}

export interface UpdateSecretOptions extends CreateSecretOptions {
  skipMultilineEncoding?: boolean;
}

export interface DeleteSecretOptions {
  key: string;
  projectId?: string;
  path?: string;
  type?: 'shared' | 'personal';
}

export interface ListSecretsOptions {
  projectId?: string;
  path?: string;
  environment?: string;
  includeImports?: boolean;
  recursive?: boolean;
}

/**
 * Enhanced Infisical manager with hierarchical resolution and caching
 */
export class InfisicalManager {
  private sdk: InfisicalSDK | null = null;
  private config: InfisicalConfig;
  private cache: Map<string, CachedSecret> = new Map();
  private initPromise: Promise<void> | null = null;
  private isInitialized = false;

  constructor(config?: Partial<InfisicalConfig>) {
    this.config = {
      environment: process.env['NODE_ENV'] || 'development',
      appProjectId: process.env['INFISICAL_APP_PROJECT_ID'],
      appsProjectId: process.env['INFISICAL_APPS_PROJECT_ID'],
      platformProjectId: process.env['INFISICAL_PLATFORM_PROJECT_ID'],
      projectSlug: process.env['INFISICAL_PROJECT_SLUG'],
      clientId: process.env['INFISICAL_CLIENT_ID'],
      clientSecret: process.env['INFISICAL_CLIENT_SECRET'],
      siteUrl: process.env['INFISICAL_SITE_URL'] || 'https://app.infisical.com',
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      enableCache: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Initialize the Infisical client
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Use existing initialization promise if in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    await this.initPromise;
    this.initPromise = null;
  }

  private assertSDK(): void {
    if (!this.sdk) {
      throw new Error(
        'Infisical SDK not initialized. Provide INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET.'
      );
    }
  }

  private async _initialize(): Promise<void> {
    try {
      // Skip initialization if no credentials
      if (!this.config.clientId || !this.config.clientSecret) {
        // No Infisical credentials - will use environment variables only
        // This is common in local development
        this.isInitialized = true;
        return;
      }

      // Create SDK instance
      this.sdk = new InfisicalSDK(
        this.config.siteUrl ? { siteUrl: this.config.siteUrl } : undefined
      );

      // Authenticate using Universal Auth (machine identity)
      const authResult = await this.sdk.auth().universalAuth.login({
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
      });

      // Store the authenticated SDK instance
      this.sdk = authResult;
      this.isInitialized = true;
    } catch (error) {
      // Re-throw with more context
      throw new Error(
        `Infisical SDK initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a secret with hierarchical resolution
   * Tries: app-specific -> apps shared -> platform -> environment variable
   */
  async getSecret(
    key: string,
    options?: { projectId?: string; path?: string; noCache?: boolean }
  ): Promise<string | undefined> {
    await this.initialize();

    // Check cache first
    if (this.config.enableCache && !options?.noCache) {
      const cached = this.getCachedSecret(key);
      if (cached) return cached;
    }

    // If no SDK (local dev without credentials), use env vars only
    if (!this.sdk) {
      return process.env[key];
    }

    // Try hierarchical resolution (app-specific -> worx-apps)
    const projectIds = options?.projectId
      ? [options.projectId]
      : ([this.config.appProjectId, this.config.appsProjectId].filter(Boolean) as string[]);

    for (const projectId of projectIds) {
      try {
        const value = await this.fetchSecretWithRetry(key, projectId, options?.path);
        if (value) {
          this.cacheSecret(key, value);
          return value;
        }
      } catch {
        // Continue to next project in hierarchy
        // Secret not found in this project, try next
      }
    }

    // Fallback to environment variable
    return process.env[key];
  }

  /**
   * Get a required secret (throws if not found)
   */
  async getRequiredSecret(
    key: string,
    options?: { projectId?: string; path?: string }
  ): Promise<string> {
    const value = await this.getSecret(key, options);
    if (!value) {
      throw new Error(
        `Required secret '${key}' not found. ` +
          `Checked: Infisical projects (${[this.config.appProjectId, this.config.appsProjectId].filter(Boolean).join(', ')}) and environment variables.`
      );
    }
    return value;
  }

  /**
   * Get a platform/infrastructure secret (from worx-platform project)
   * Use this for AWS credentials, monitoring keys, etc.
   */
  async getPlatformSecret(key: string, options?: { path?: string }): Promise<string | undefined> {
    if (!this.config.platformProjectId) {
      // Fall back to environment variables if platform project not configured
      return process.env[key];
    }

    return this.getSecret(key, {
      projectId: this.config.platformProjectId,
      ...(options?.path && { path: options.path }),
    });
  }

  /**
   * Get multiple secrets at once
   */
  async getSecrets(
    keys: string[],
    options?: { projectId?: string; path?: string }
  ): Promise<Record<string, string | undefined>> {
    const results: Record<string, string | undefined> = {};

    // Fetch in parallel for better performance
    await Promise.all(
      keys.map(async (key) => {
        results[key] = await this.getSecret(key, options);
      })
    );

    return results;
  }

  /**
   * Create a new secret
   */
  async createSecret(options: CreateSecretOptions): Promise<void> {
    await this.initialize();

    if (!this.sdk) {
      throw new Error(
        'Infisical SDK not initialized. Provide INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET.'
      );
    }

    const projectId = options.projectId || this.config.appProjectId || this.config.appsProjectId;
    if (!projectId) {
      throw new Error('No project ID specified for secret creation');
    }

    this.assertSDK();
    await this.retryOperation(async () => {
      const createOptions: SDKCreateSecretOptions = {
        projectId,
        environment: this.config.environment,
        secretPath: options.path || '/',
        secretValue: options.value,
        type: SecretType.Shared,
        ...(options.comment && { secretComment: options.comment }),
      };

      // biome-ignore lint/style/noNonNullAssertion: SDK existence checked by assertSDK()
      await this.sdk!.secrets().createSecret(options.key, createOptions);
    });

    // Invalidate cache for this key
    this.cache.delete(options.key);
  }

  /**
   * Update an existing secret
   */
  async updateSecret(options: UpdateSecretOptions): Promise<void> {
    await this.initialize();

    if (!this.sdk) {
      throw new Error(
        'Infisical SDK not initialized. Provide INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET.'
      );
    }

    const projectId = options.projectId || this.config.appProjectId || this.config.appsProjectId;
    if (!projectId) {
      throw new Error('No project ID specified for secret update');
    }

    this.assertSDK();
    await this.retryOperation(async () => {
      const updateOptions: SDKUpdateSecretOptions = {
        projectId,
        environment: this.config.environment,
        secretPath: options.path || '/',
        secretValue: options.value,
        type: SecretType.Shared,
        ...(options.skipMultilineEncoding !== undefined && {
          skipMultilineEncoding: options.skipMultilineEncoding,
        }),
      };

      // biome-ignore lint/style/noNonNullAssertion: SDK existence checked by assertSDK()
      await this.sdk!.secrets().updateSecret(options.key, updateOptions);
    });

    // Invalidate cache for this key
    this.cache.delete(options.key);
  }

  /**
   * Delete a secret
   */
  async deleteSecret(options: DeleteSecretOptions): Promise<void> {
    await this.initialize();

    this.assertSDK();

    const projectId = options.projectId || this.config.appProjectId || this.config.appsProjectId;
    if (!projectId) {
      throw new Error('No project ID specified for secret deletion');
    }

    await this.retryOperation(async () => {
      const deleteOptions: SDKDeleteSecretOptions = {
        projectId,
        environment: this.config.environment,
        secretPath: options.path || '/',
        type: SecretType.Shared,
      };

      // biome-ignore lint/style/noNonNullAssertion: SDK existence checked by assertSDK()
      await this.sdk!.secrets().deleteSecret(options.key, deleteOptions);
    });

    // Invalidate cache for this key
    this.cache.delete(options.key);
  }

  /**
   * List all secrets in a project
   */
  async listSecrets(options?: ListSecretsOptions): Promise<SecretMetadata[]> {
    await this.initialize();

    if (!this.sdk) {
      // Return env vars if no SDK
      return Object.keys(process.env).map((key) => ({
        key,
        value: process.env[key] || '',
        type: 'shared' as const,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }

    this.assertSDK();

    const projectId = options?.projectId || this.config.appProjectId || this.config.appsProjectId;
    if (!projectId) {
      throw new Error('No project ID specified for listing secrets');
    }

    const listOptions: SDKListSecretsOptions = {
      projectId,
      environment: options?.environment || this.config.environment,
      secretPath: options?.path || '/',
      ...(options?.includeImports !== undefined && { includeImports: options.includeImports }),
      ...(options?.recursive !== undefined && { recursive: options.recursive }),
    };

    const response = await this.retryOperation(async () => {
      // biome-ignore lint/style/noNonNullAssertion: SDK existence checked by assertSDK()
      return await this.sdk!.secrets().listSecrets(listOptions);
    });

    return response.secrets.map((secret: Secret) => ({
      key: secret.secretKey,
      value: secret.secretValue,
      type: secret.type as 'shared' | 'personal',
      version: secret.version,
      createdAt: new Date(secret.createdAt),
      updatedAt: new Date(secret.updatedAt),
      tags: secret.tags,
      comment: secret.secretComment || undefined,
    }));
  }

  /**
   * Refresh all cached secrets
   */
  async refreshCache(): Promise<void> {
    const keys = Array.from(this.cache.keys());
    this.cache.clear();

    // Re-fetch all previously cached secrets
    await Promise.all(keys.map((key) => this.getSecret(key)));
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[]; hitRate?: number } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Private helper methods

  private async fetchSecretWithRetry(
    key: string,
    projectId: string,
    path?: string
  ): Promise<string | undefined> {
    this.assertSDK();
    return this.retryOperation(async () => {
      const options: SDKGetSecretOptions = {
        projectId,
        environment: this.config.environment,
        secretPath: path || '/',
        secretName: key,
        type: SecretType.Shared,
      };

      // biome-ignore lint/style/noNonNullAssertion: SDK existence checked by assertSDK()
      const secret = await this.sdk!.secrets().getSecret(options);
      return secret.secretValue;
    });
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < (this.config.maxRetries || 3); i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (i < (this.config.maxRetries || 3) - 1) {
          await this.delay(this.config.retryDelay || 1000);
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getCachedSecret(key: string): string | undefined {
    const cached = this.cache.get(key);

    if (!cached) return undefined;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return cached.value;
  }

  private cacheSecret(key: string, value: string): void {
    if (!this.config.enableCache) return;

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL || 5 * 60 * 1000,
    });
  }
}

// Default singleton instance
export const infisical = new InfisicalManager();
