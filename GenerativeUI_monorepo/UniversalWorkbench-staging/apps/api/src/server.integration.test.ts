import { SecretKeys, secretManager } from '@adaptiveworx/shared';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let skipReason: string | null = null;
let server: FastifyInstance | null = null;

async function resolveDatabaseUrl(): Promise<string | undefined> {
  if (process.env['DATABASE_URL'] && process.env['DATABASE_URL'] !== '') {
    return process.env['DATABASE_URL'];
  }

  try {
    return await secretManager.getSecretAsync(SecretKeys.DATABASE_URL);
  } catch (error) {
    console.warn('Failed to resolve DATABASE_URL via Infisical:', error);
    return undefined;
  }
}

describe('API server integration (requires DATABASE_URL)', () => {
  beforeAll(async () => {
    const databaseUrl = await resolveDatabaseUrl();

    if (databaseUrl === undefined) {
      skipReason =
        'Skipping integration tests: DATABASE_URL not set and no Infisical secret available.';
      return;
    }

    process.env['DATABASE_URL'] = databaseUrl;

    const { buildServer } = await import('./server.js');
    server = await buildServer({ logger: false });
  });

  afterAll(async () => {
    if (server !== null) {
      await server.close();
      server = null;
    }
  });

  it('responds to /health using real database connection', async (context) => {
    if (skipReason !== null || server === null) {
      context.skip(skipReason ?? 'Skipping integration test');
      return;
    }

    const response = await server.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as { status?: string };
    expect(payload.status).toBe('ok');
  });
});
