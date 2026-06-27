import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('modme session lifecycle', () => {
  it('manifest defines required phases', () => {
    const manifestPath = join(root, 'scripts/modme-session.manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const phase of [
      'terminal',
      'session-start',
      'pre-launch',
      'session-end',
      'verify',
    ]) {
      expect(manifest.phases[phase]).toBeDefined();
    }
    expect(manifest.runtimeEnvFile).toBe('.vscode/.env.runtime');
  });

  it('dispatcher scripts exist', () => {
    for (const file of [
      'scripts/modme-session.ps1',
      'scripts/modme-terminal.ps1',
      'scripts/lib/modme-env-bootstrap.ps1',
    ]) {
      expect(existsSync(join(root, file))).toBe(true);
    }
  });
});
