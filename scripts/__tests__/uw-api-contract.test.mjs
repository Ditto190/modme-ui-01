import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const UW_ROOT = resolve(ROOT, 'GenerativeUI_monorepo/UniversalWorkbench');

describe('UniversalWorkbench API contract smoke', () => {
  it('ships server smoke and integration test entrypoints', () => {
    const smoke = resolve(UW_ROOT, 'apps/api/src/server.smoke.test.ts');
    const integration = resolve(UW_ROOT, 'apps/api/src/server.integration.test.ts');
    expect(existsSync(smoke)).toBe(true);
    expect(existsSync(integration)).toBe(true);
  });

  it('documents health and users routes in server module', () => {
    const serverSource = readFileSync(resolve(UW_ROOT, 'apps/api/src/server.ts'), 'utf8');
    expect(serverSource).toContain('/health');
    expect(serverSource).toContain('/api/users');
    expect(serverSource).toContain('/api/posts');
  });
});
