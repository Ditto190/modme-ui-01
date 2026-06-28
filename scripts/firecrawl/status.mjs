#!/usr/bin/env node
/**
 * Health check for self-hosted Firecrawl.
 * Usage: yarn firecrawl:status [--json]
 *
 * Exit: 0=healthy, 1=unreachable, 2=vendor/Docker not set up
 */
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  checkHealth,
  getFirecrawlBaseUrl,
  DEFAULT_FIRECRAWL_BASE_URL,
} from '../lib/firecrawl-local-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const VENDOR = join(ROOT, '.vendor', 'firecrawl');
const JSON_OUT = process.argv.includes('--json');

function dockerAvailable() {
  const probe = spawnSync('docker', ['info'], { encoding: 'utf8', timeout: 10_000 });
  return probe.status === 0;
}

async function main() {
  const vendorInstalled = existsSync(VENDOR);
  const dockerOk = dockerAvailable();
  const baseUrl = getFirecrawlBaseUrl();
  const health = await checkHealth(baseUrl);

  const report = {
    vendor_installed: vendorInstalled,
    vendor_path: VENDOR,
    docker_ok: dockerOk,
    base_url: baseUrl,
    default_url: DEFAULT_FIRECRAWL_BASE_URL,
    api_reachable: health.ok,
    http_status: health.status ?? null,
    error: health.error ?? null,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('Firecrawl self-host status');
    console.log(`  vendor:  ${vendorInstalled ? 'installed' : 'missing'} (${VENDOR})`);
    console.log(`  docker:  ${dockerOk ? 'running' : 'unavailable'}`);
    console.log(`  api:     ${baseUrl}`);
    if (health.ok) {
      console.log(`  health:  reachable (HTTP ${health.status})`);
    } else {
      console.log(`  health:  unreachable${health.error ? ` — ${health.error}` : ''}`);
    }
    if (!vendorInstalled) {
      console.log('\nSetup: yarn firecrawl:setup');
    } else if (!dockerOk) {
      console.log('\nStart Docker Desktop, then: yarn firecrawl:up');
    } else if (!health.ok) {
      console.log('\nStart stack: yarn firecrawl:up');
    }
  }

  if (!vendorInstalled) process.exit(2);
  if (!health.ok) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
