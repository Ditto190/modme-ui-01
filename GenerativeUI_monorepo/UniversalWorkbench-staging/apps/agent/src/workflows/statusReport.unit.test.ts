import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeTool } from '../tools/index.js';
import { statusReportWorkflow } from './statusReport.js';

vi.mock('../tools/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../tools/index.js')>();

  return {
    ...actual,
    executeTool: vi.fn(actual.executeTool),
  };
});

describe('statusReportWorkflow', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns healthy status when tool reports ok', async () => {
    const mockedExecute = vi.mocked(executeTool);

    mockedExecute.mockResolvedValue({
      service: 'api',
      status: 'ok',
      durationMs: 10,
      checkedAt: '2024-01-01T00:00:00Z',
      payload: { status: 'ok' },
    });

    const result = await statusReportWorkflow({ baseUrl: 'http://localhost:3000' });

    expect(mockedExecute).toHaveBeenCalledWith('apiHealthCheck', {
      baseUrl: 'http://localhost:3000',
    });
    expect(result.status).toBe('healthy');
  });

  it('returns degraded status when tool reports error', async () => {
    const mockedExecute = vi.mocked(executeTool);

    mockedExecute.mockResolvedValue({
      service: 'api',
      status: 'error',
      durationMs: 25,
      checkedAt: '2024-01-01T00:00:00Z',
      error: 'timeout',
    });

    const result = await statusReportWorkflow({});

    expect(result.status).toBe('degraded');
  });

  it('throws when using unsupported tool override', async () => {
    await expect(statusReportWorkflow({}, { tool: 'nonexistent' as never })).rejects.toThrowError(
      /not configured/
    );
  });
});
