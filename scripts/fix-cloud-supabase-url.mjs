#!/usr/bin/env node
/** Point root NEXT_PUBLIC_SUPABASE_URL at hosted Supabase when it is still localhost. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');
if (!existsSync(envPath)) {
  console.error('No root .env');
  process.exit(1);
}

function parseEnv(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq);
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    map.set(k, v);
  }
  return map;
}

const text = readFileSync(envPath, 'utf8');
const env = parseEnv(text);
const current = env.get('NEXT_PUBLIC_SUPABASE_URL') || '';
const isLocal =
  current.includes('127.0.0.1') ||
  current.includes('localhost') ||
  current.startsWith('http://1');

if (!isLocal) {
  console.log('NEXT_PUBLIC_SUPABASE_URL already points at hosted Supabase — no change.');
  process.exit(0);
}

const rest =
  env.get('SUPABASE_RESTFUL_ENDPOIN') ||
  env.get('SUPABASE_RESTFUL_ENDPOINT') ||
  env.get('SUPABASE_SERVER_URL') ||
  '';
let cloudUrl = rest.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
if (!cloudUrl.startsWith('https://')) {
  cloudUrl = 'https://aevemmmmouxqlfyxthzf.supabase.co';
}

const updated = text.replace(
  /^NEXT_PUBLIC_SUPABASE_URL=.*$/m,
  `NEXT_PUBLIC_SUPABASE_URL="${cloudUrl}"`
);
writeFileSync(envPath, updated, 'utf8');
console.log(`Updated NEXT_PUBLIC_SUPABASE_URL → hosted (${cloudUrl.length} chars)`);
