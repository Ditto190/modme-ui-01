import { z } from 'zod';

export const ApiHealthCheckInputSchema = z.object({
  baseUrl: z.string().url().default('http://localhost:3000'),
  timeoutMs: z.number().int().positive().max(30_000).default(5_000),
});

export type ApiHealthCheckInput = z.infer<typeof ApiHealthCheckInputSchema>;

export type ApiHealthCheckResult =
  | {
      service: 'api';
      status: 'ok';
      durationMs: number;
      checkedAt: string;
      payload: unknown;
    }
  | {
      service: 'api';
      status: 'error';
      durationMs: number;
      checkedAt: string;
      error: string;
    };

export async function apiHealthCheck(input: ApiHealthCheckInput): Promise<ApiHealthCheckResult> {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await fetch(`${input.baseUrl.replace(/\/$/, '')}/health`, {
      signal: controller.signal,
    });
    const durationMs = Math.round(performance.now() - start);

    if (!response.ok) {
      return {
        service: 'api',
        status: 'error',
        durationMs,
        checkedAt: new Date().toISOString(),
        error: `Unexpected status: ${response.status}`,
      };
    }

    const payload = await response.json().catch(() => null);

    return {
      service: 'api',
      status: 'ok',
      durationMs,
      checkedAt: new Date().toISOString(),
      payload,
    };
  } catch (error) {
    const durationMs = Math.round(performance.now() - start);
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'Request timed out'
        : ((error as Error).message ?? 'Unknown error');

    return {
      service: 'api',
      status: 'error',
      durationMs,
      checkedAt: new Date().toISOString(),
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}
