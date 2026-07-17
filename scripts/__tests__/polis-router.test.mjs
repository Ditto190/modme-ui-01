import { describe, it, expect } from 'vitest';
import { routeContract } from '../lib/polis-router.mjs';

describe('polis-router', () => {
  it('routes ci-cd + selfHeal to devops-ci-champion', () => {
    const route = routeContract({
      labels: ['ci-cd', 'devops-autofix'],
      selfHeal: 'Yes',
      changedPaths: ['.github/workflows/ci.yml'],
    });
    expect(route.citizenId).toBe('devops-ci-champion');
    expect(route.verifyCommands.length).toBeGreaterThan(0);
  });

  it('routes generative stack paths to generative-reviewer when labeled', () => {
    const route = routeContract({
      labels: ['stack:generative'],
      changedPaths: ['GenerativeUI_monorepo/UniversalWorkbench/apps/web/src/foo.ts'],
    });
    expect(route.citizenId).toBe('generative-reviewer');
  });
});
