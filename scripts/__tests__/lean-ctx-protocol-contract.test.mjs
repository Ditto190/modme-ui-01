/**
 * lean-ctx protocol stack contract — proxy vs A2A vs MCP gateway boundaries.
 * Run: yarn vitest run scripts/__tests__/lean-ctx-protocol-contract.test.mjs
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

const SEED = JSON.parse(
  readFileSync(join(ROOT, 'scripts/collections/lean-ctx-agent-catalog.seed.json'), 'utf8')
);

const REQUIRED_PROTOCOL_DOCS = [
  'docs/lean-ctx/proxy-and-protocols.md',
  'docs/lean-ctx/testing-strategy.md',
];

describe('lean-ctx protocol contract', () => {
  it('documents proxy vs A2A vs gateway stack', () => {
    for (const rel of REQUIRED_PROTOCOL_DOCS) {
      expect(existsSync(join(ROOT, rel))).toBe(true);
    }
    const proxyDoc = readFileSync(join(ROOT, REQUIRED_PROTOCOL_DOCS[0]), 'utf8');
    expect(proxyDoc).toMatch(/proxy/i);
    expect(proxyDoc).toMatch(/A2A|agent-to-agent/i);
    expect(proxyDoc).toMatch(/MCP|gateway/i);
  });

  it('seed catalog separates agents from mcp_gateways', () => {
    expect(Array.isArray(SEED.agents)).toBe(true);
    expect(Array.isArray(SEED.mcp_gateways)).toBe(true);
    const agentIds = new Set(SEED.agents.map((a) => a.id));
    for (const gw of SEED.mcp_gateways) {
      expect(agentIds.has(gw.namespace)).toBe(false);
    }
  });

  it('mcp_gateways use find_hint routing contract', () => {
    for (const gw of SEED.mcp_gateways) {
      expect(gw.namespace).toBeTruthy();
      expect(gw.find_hint).toBeTruthy();
      expect(gw.mcp_server).toMatch(/plugin-|user-/);
    }
  });

  it('agents declare ctx_* intelligence tools', () => {
    for (const agent of SEED.agents) {
      expect(agent.intelligence?.length).toBeGreaterThan(0);
      for (const tool of agent.intelligence) {
        expect(tool).toMatch(/^ctx_/);
      }
    }
  });

  it('.lean-ctx.toml enables proxy without replacing MCP', () => {
    const toml = readFileSync(join(ROOT, '.lean-ctx.toml'), 'utf8');
    expect(toml).toMatch(/proxy_enabled\s*=\s*true/);
    expect(toml).toMatch(/\[proxy\]/);
  });
});
