import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

describe("agent-status.mjs", () => {
  it("defaults to JSON with repoRoot and worktrees", () => {
    const r = spawnSync("node", ["scripts/agent-status.mjs"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    const payload = JSON.parse(r.stdout);
    expect(payload.repoRoot).toBeTruthy();
    expect(Array.isArray(payload.worktrees)).toBe(true);
  });

  it("--human emits text output", () => {
    const r = spawnSync("node", ["scripts/agent-status.mjs", "--human"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/branch:/);
    expect(() => JSON.parse(r.stdout)).toThrow();
  });

  it("--ci exits 0 on smoke path", () => {
    const r = spawnSync("node", ["scripts/agent-status.mjs", "--ci"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("agent-status: ok");
  });
});
