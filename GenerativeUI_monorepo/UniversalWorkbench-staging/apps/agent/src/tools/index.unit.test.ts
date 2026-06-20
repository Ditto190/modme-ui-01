import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeTool, listTools } from './index.js';

describe('agent tools', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists available tools', () => {
    const tools = listTools();

    expect(tools).toEqual([
      {
        name: 'api_health_check',
        description: 'Checks the API /health endpoint and returns timing + payload information.',
      },
    ]);
  });

  it('executes the api health check tool', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', timestamp: '2024-01-01T00:00:00Z' }),
    });

    const result = await executeTool('apiHealthCheck', { baseUrl: 'http://localhost:1234' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:1234/health');
    expect(result.status).toBe('ok');
    expect(result.service).toBe('api');
  });

  it('validates tool input', async () => {
    await expect(
      executeTool('apiHealthCheck', { baseUrl: 'not-a-valid-url' })
    ).rejects.toThrowError(/Invalid url/);
  });
});
