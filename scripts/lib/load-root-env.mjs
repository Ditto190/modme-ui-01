/**
 * Shared root .env loader for intake/scrape scripts.
 * Supabase keys from .env file win over stale shell exports.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '../..');

export const SUPABASE_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_KEY',
];

/** @param {string} content */
export function parseEnvContent(content) {
  const text = content.replace(/^\uFEFF/, '');
  /** @type {Record<string, string>} */
  const vars = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }

  return vars;
}

/** @param {string} path */
export function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  return parseEnvContent(readFileSync(path, 'utf8'));
}

/**
 * @param {{ root?: string, fileWins?: boolean, paths?: string[] }} [options]
 */
export function loadRootEnv(options = {}) {
  const root = options.root ?? REPO_ROOT;
  const fileWins = options.fileWins ?? true;
  const paths = options.paths ?? [resolve(root, '.env')];

  for (const envPath of paths) {
    const vars = parseEnvFile(envPath);
    for (const [key, value] of Object.entries(vars)) {
      if (fileWins && SUPABASE_ENV_KEYS.includes(key)) {
        process.env[key] = value;
      } else if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

/** @param {string} [value] */
export function maskSecret(value) {
  if (!value) return '(empty)';
  if (value.length <= 12) return `*** (${value.length} chars)`;
  return `${value.slice(0, 8)}…${value.slice(-4)} (${value.length} chars)`;
}

/** @param {string} jwt */
export function decodeJwtRole(jwt) {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    );
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

/** @param {string} [url] */
export function classifySupabaseUrl(url) {
  if (!url) return 'missing';
  if (/127\.0\.0\.1|localhost:54321/.test(url)) return 'local';
  if (/aevemmmmouxqlfyxthzf\.supabase\.co/.test(url)) return 'cloud-modme';
  if (/\.supabase\.co/.test(url)) return 'cloud-other';
  return 'unknown';
}

export const KNOWN_ENV_FILES = [
  { id: 'root', path: (root) => resolve(root, '.env'), consumer: 'intake/scrape scripts' },
  {
    id: 'forge-local',
    path: (root) => resolve(root, 'next-forge/.env.local'),
    consumer: 'next-forge (optional)',
  },
  {
    id: 'app-local',
    path: (root) => resolve(root, 'next-forge/apps/app/.env.local'),
    consumer: 'Next.js app',
  },
  {
    id: 'api-local',
    path: (root) => resolve(root, 'next-forge/apps/api/.env.local'),
    consumer: 'Next.js api',
  },
  {
    id: 'web-local',
    path: (root) => resolve(root, 'next-forge/apps/web/.env.local'),
    consumer: 'Next.js web',
  },
  {
    id: 'database',
    path: (root) => resolve(root, 'next-forge/packages/database/.env'),
    consumer: 'Prisma / supabase CLI',
  },
];
