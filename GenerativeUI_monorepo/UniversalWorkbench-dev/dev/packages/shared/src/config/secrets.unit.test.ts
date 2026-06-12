import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InfisicalManager } from './infisical.js';
import { SecretKeys, SecretManager } from './secrets.js';

// Helper to safely access mocked methods (all methods are defined in mock)
function getMock<T>(fn: T | undefined): T {
  // biome-ignore lint/style/noNonNullAssertion: Test helper - all mock methods are defined
  return fn!;
}

describe('SecretManager', () => {
  let secretManager: SecretManager;
  let mockInfisicalManager: Partial<InfisicalManager>;

  beforeEach(() => {
    // Clear environment variables
    vi.resetModules();
    for (const key of Object.keys(process.env)) {
      if (key.includes('TEST') || key.includes('SECRET')) {
        delete process.env[key];
      }
    }

    // Create mock Infisical manager
    mockInfisicalManager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getSecret: vi.fn(),
      getRequiredSecret: vi.fn(),
      getSecrets: vi.fn(),
      createSecret: vi.fn(),
      updateSecret: vi.fn(),
      deleteSecret: vi.fn(),
      listSecrets: vi.fn(),
      refreshCache: vi.fn(),
      clearCache: vi.fn(),
      getCacheStats: vi.fn().mockReturnValue({ size: 0, keys: [] }),
    };

    secretManager = new SecretManager(mockInfisicalManager as InfisicalManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('backward compatibility', () => {
    it('getSecret should work synchronously with environment variables', () => {
      process.env['TEST_SECRET'] = 'test-value';
      const result = secretManager.getSecret('TEST_SECRET');
      expect(result).toBe('test-value');
    });

    it('getSecret should throw when env var is missing', () => {
      expect(() => secretManager.getSecret('MISSING_SECRET')).toThrow(
        "Secret 'MISSING_SECRET' not found in environment variables"
      );
    });

    it('getSecretOrDefault should return default when env var is missing', () => {
      const result = secretManager.getSecretOrDefault('MISSING', 'default-value');
      expect(result).toBe('default-value');
    });

    it('getSecretOrDefault should return env var when present', () => {
      process.env['PRESENT'] = 'env-value';
      const result = secretManager.getSecretOrDefault('PRESENT', 'default-value');
      expect(result).toBe('env-value');
    });

    it('hasSecret should check environment variables', () => {
      process.env['EXISTS'] = 'value';
      expect(secretManager.hasSecret('EXISTS')).toBe(true);
      expect(secretManager.hasSecret('NOT_EXISTS')).toBe(false);
    });
  });

  describe('async methods with Infisical integration', () => {
    it('should initialize on first async call', async () => {
      vi.mocked(getMock(mockInfisicalManager.getSecret)).mockResolvedValue('async-value');

      await secretManager.getSecretAsync('TEST_KEY');

      expect(mockInfisicalManager.initialize).toHaveBeenCalledOnce();
    });

    it('should only initialize once', async () => {
      vi.mocked(getMock(mockInfisicalManager.getSecret)).mockResolvedValue('value');

      await secretManager.getSecretAsync('KEY1');
      await secretManager.getSecretAsync('KEY2');
      await secretManager.getSecretAsync('KEY3');

      expect(mockInfisicalManager.initialize).toHaveBeenCalledOnce();
    });

    it('getSecretAsync should use Infisical manager', async () => {
      vi.mocked(getMock(mockInfisicalManager.getSecret)).mockResolvedValue('infisical-value');

      const result = await secretManager.getSecretAsync('TEST_KEY', { path: '/api' });

      expect(mockInfisicalManager.getSecret).toHaveBeenCalledWith('TEST_KEY', { path: '/api' });
      expect(result).toBe('infisical-value');
    });

    it('getSecretAsync should throw when required and missing', async () => {
      vi.mocked(getMock(mockInfisicalManager.getSecret)).mockResolvedValue(undefined);

      await expect(secretManager.getSecretAsync('MISSING', { required: true })).rejects.toThrow(
        "Required secret 'MISSING' not found"
      );
    });

    it('getRequiredSecret should delegate to Infisical manager', async () => {
      vi.mocked(getMock(mockInfisicalManager.getRequiredSecret)).mockResolvedValue(
        'required-value'
      );

      const result = await secretManager.getRequiredSecret('REQUIRED_KEY');

      expect(mockInfisicalManager.getRequiredSecret).toHaveBeenCalledWith(
        'REQUIRED_KEY',
        undefined
      );
      expect(result).toBe('required-value');
    });

    it('getSecrets should fetch multiple secrets', async () => {
      vi.mocked(getMock(mockInfisicalManager.getSecrets)).mockResolvedValue({
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: undefined,
      });

      const result = await secretManager.getSecrets(['KEY1', 'KEY2', 'KEY3']);

      expect(mockInfisicalManager.getSecrets).toHaveBeenCalledWith(
        ['KEY1', 'KEY2', 'KEY3'],
        undefined
      );
      expect(result).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: undefined,
      });
    });

    it('getSecretOrDefaultAsync should return default for missing secret', async () => {
      vi.mocked(getMock(mockInfisicalManager.getSecret)).mockResolvedValue(undefined);

      const result = await secretManager.getSecretOrDefaultAsync('MISSING', 'fallback');

      expect(result).toBe('fallback');
    });

    it('hasSecretAsync should check via Infisical', async () => {
      vi.mocked(getMock(mockInfisicalManager.getSecret))
        .mockResolvedValueOnce('exists')
        .mockResolvedValueOnce(undefined);

      const exists = await secretManager.hasSecretAsync('EXISTS');
      const notExists = await secretManager.hasSecretAsync('NOT_EXISTS');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('secret management operations', () => {
    it('should create a new secret', async () => {
      await secretManager.createSecret('NEW_KEY', 'new-value', {
        comment: 'Created in test',
        tags: ['test'],
      });

      expect(mockInfisicalManager.createSecret).toHaveBeenCalledWith({
        key: 'NEW_KEY',
        value: 'new-value',
        comment: 'Created in test',
        tags: ['test'],
      });
    });

    it('should update an existing secret', async () => {
      await secretManager.updateSecret('UPDATE_KEY', 'updated-value', {
        path: '/prod',
      });

      expect(mockInfisicalManager.updateSecret).toHaveBeenCalledWith({
        key: 'UPDATE_KEY',
        value: 'updated-value',
        path: '/prod',
      });
    });

    it('should delete a secret', async () => {
      await secretManager.deleteSecret('DELETE_KEY', { path: '/test' });

      expect(mockInfisicalManager.deleteSecret).toHaveBeenCalledWith({
        key: 'DELETE_KEY',
        path: '/test',
      });
    });

    it('should list secrets', async () => {
      const date1 = new Date();
      const date2 = new Date();
      const mockSecrets = [
        {
          key: 'KEY1',
          value: 'value1',
          type: 'shared' as const,
          version: 1,
          createdAt: date1,
          updatedAt: date1,
          tags: undefined,
          comment: undefined,
        },
        {
          key: 'KEY2',
          value: 'value2',
          type: 'personal' as const,
          version: 1,
          createdAt: date2,
          updatedAt: date2,
          tags: undefined,
          comment: undefined,
        },
      ];

      vi.mocked(getMock(mockInfisicalManager.listSecrets)).mockResolvedValue(mockSecrets);

      const result = await secretManager.listSecrets({ environment: 'prod' });

      expect(mockInfisicalManager.listSecrets).toHaveBeenCalledWith({ environment: 'prod' });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        key: 'KEY1',
        value: 'value1',
        updatedAt: date1,
      });
    });
  });

  describe('validation and utilities', () => {
    it('should validate required secrets', async () => {
      vi.mocked(getMock(mockInfisicalManager.getSecrets)).mockResolvedValue({
        REQUIRED1: 'value1',
        REQUIRED2: 'value2',
        REQUIRED3: undefined,
        REQUIRED4: undefined,
      });

      const result = await secretManager.validateRequiredSecrets([
        'REQUIRED1',
        'REQUIRED2',
        'REQUIRED3',
        'REQUIRED4',
      ]);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['REQUIRED3', 'REQUIRED4']);
    });

    it('should load common application secrets', async () => {
      vi.mocked(getMock(mockInfisicalManager.getSecrets)).mockImplementation(async (keys) => {
        const mockValues: Record<string, string | undefined> = {
          [SecretKeys.DATABASE_URL]: 'postgres://localhost:5432/db',
          [SecretKeys.PORT]: '3000',
          [SecretKeys.HOST]: '0.0.0.0',
          [SecretKeys.REDIS_HOST]: 'localhost',
          [SecretKeys.REDIS_PORT]: '6379',
        };

        const result: Record<string, string | undefined> = {};
        for (const key of keys) {
          result[key] = mockValues[key];
        }
        return result;
      });

      const secrets = await secretManager.loadCommonSecrets();

      expect(secrets.database.url).toBe('postgres://localhost:5432/db');
      expect(secrets.api.port).toBe('3000');
      expect(secrets.api.host).toBe('0.0.0.0');
      expect(secrets.redis.host).toBe('localhost');
      expect(secrets.redis.port).toBe('6379');
      expect(secrets.api.jwtSecret).toBeUndefined();
    });
  });

  describe('cache operations', () => {
    it('should refresh cache', async () => {
      await secretManager.refreshCache();
      expect(mockInfisicalManager.refreshCache).toHaveBeenCalledOnce();
    });

    it('should clear cache', () => {
      secretManager.clearCache();
      expect(mockInfisicalManager.clearCache).toHaveBeenCalledOnce();
    });

    it('should get cache stats', () => {
      const mockStats = { size: 5, keys: ['KEY1', 'KEY2'] };
      vi.mocked(getMock(mockInfisicalManager.getCacheStats)).mockReturnValue(mockStats);

      const stats = secretManager.getCacheStats();

      expect(stats).toEqual(mockStats);
    });
  });

  describe('initialization error handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const errorManager = {
        ...mockInfisicalManager,
        initialize: vi.fn().mockRejectedValue(new Error('Init failed')),
      };

      const secretManagerWithError = new SecretManager(errorManager as any);

      // Should not throw, but log warning
      await expect(secretManagerWithError.getSecretAsync('KEY')).resolves.not.toThrow();

      expect(errorManager.initialize).toHaveBeenCalled();
    });
  });
});
