export const BASE_RECONNECT_MS = 3000;
export const MAX_RECONNECT_MS = 30_000;
export const MAX_RECONNECT_ATTEMPTS = 10;

export function getReconnectDelay(attempt: number): number {
  return Math.min(BASE_RECONNECT_MS * 2 ** attempt, MAX_RECONNECT_MS);
}
