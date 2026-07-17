/**
 * Typed HTTP client boundary for cross-module network access.
 * Modules should wrap this client in feature-specific hooks/services.
 */
const defaultBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${defaultBaseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }
  return response.json() as Promise<T>;
}
