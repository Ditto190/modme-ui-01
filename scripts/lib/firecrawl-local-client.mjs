/**
 * HTTP client for self-hosted Firecrawl (local-only, no cloud login).
 * Default: http://127.0.0.1:3022 (avoids GenerativeUI port 3002 conflict).
 */
import { loadRootEnv } from './load-root-env.mjs';

export const DEFAULT_FIRECRAWL_BASE_URL = 'http://127.0.0.1:3022';

/** @returns {string} */
export function getFirecrawlBaseUrl() {
  loadRootEnv({ fileWins: true });
  const raw =
    process.env.FIRECRAWL_API_URL ??
    process.env.FIRECRAWL_BASE_URL ??
    DEFAULT_FIRECRAWL_BASE_URL;
  return raw.replace(/\/$/, '');
}

/** @returns {string | undefined} */
export function getFirecrawlApiKey() {
  return process.env.FIRECRAWL_API_KEY || undefined;
}

/**
 * @param {string} [baseUrl]
 * @param {{ timeoutMs?: number }} [options]
 */
export async function checkHealth(baseUrl = getFirecrawlBaseUrl(), options = {}) {
  const timeoutMs = options.timeoutMs ?? 5000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/`, { signal: controller.signal });
    return { ok: res.ok, status: res.status, baseUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, baseUrl, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} url
 * @param {{
 *   baseUrl?: string;
 *   apiKey?: string;
 *   timeoutMs?: number;
 *   onlyMainContent?: boolean;
 * }} [options]
 */
export async function scrapeUrl(url, options = {}) {
  const baseUrl = options.baseUrl ?? getFirecrawlBaseUrl();
  const apiKey = options.apiKey ?? getFirecrawlApiKey();
  const timeoutMs = options.timeoutMs ?? 120_000;

  const body = {
    url,
    formats: ['markdown'],
    onlyMainContent: options.onlyMainContent ?? true,
  };

  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/v1/scrape`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    /** @type {Record<string, unknown>} */
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      const errMsg =
        (typeof data.error === 'string' && data.error) ||
        (typeof data.message === 'string' && data.message) ||
        `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: errMsg, raw: data };
    }

    const payload = /** @type {Record<string, unknown>} */ (data.data ?? data);
    const markdown =
      (typeof payload.markdown === 'string' && payload.markdown) ||
      (typeof data.markdown === 'string' && data.markdown) ||
      '';

    return { ok: true, markdown, raw: data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
