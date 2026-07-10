import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const COPILOT_SCRIPTS = [
  "scripts/copilot-workspace/lifecycle.ps1",
  "scripts/copilot-workspace/bootstrap.ps1",
  "scripts/copilot-workspace/generate-env.ps1",
  "scripts/copilot-workspace/generate-env.mjs",
  "scripts/copilot-workspace/session-start.ps1",
  "scripts/copilot-workspace/session-archive.ps1",
  "scripts/copilot-workspace/run-workbench.ps1",
  "scripts/copilot-workspace/lib/paths.ps1",
  "scripts/lib/worktree-bootstrap.ps1",
  "scripts/worktree-session-end.ps1",
  "scripts/setup-workspace-windows.ps1",
  "scripts/worktree-relink-deps.ps1",
  "scripts/resolve-lean-ctx-hook.mjs",
];

describe("copilot-workspace config", () => {
  it("has .worktreeinclude with env and lockfile patterns", () => {
    const path = join(ROOT, ".worktreeinclude");
    expect(existsSync(path)).toBe(true);
    const text = readFileSync(path, "utf8");
    expect(text).toMatch(/^\.env$/m);
    expect(text).toMatch(/yarn\.lock/);
    expect(text).toMatch(/next-forge\/bun\.lock/);
  });

  it("github-app.yml declares scripts and branch prefix", () => {
    const path = join(ROOT, ".github/github-app.yml");
    const text = readFileSync(path, "utf8");
    expect(text).toMatch(/branch:/);
    expect(text).toMatch(/prefix:\s*feature\/copilot\//);
    expect(text).toMatch(/session\.create:/);
    expect(text).toMatch(/session\.archive:/);
    expect(text).toMatch(/copilot-workspace\/lifecycle\.ps1/);
  });

  it("all copilot-workspace scripts exist", () => {
    for (const rel of COPILOT_SCRIPTS) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("bootstrap.ps1 references implemented worktree-bootstrap module", () => {
    const bootstrap = readFileSync(
      join(ROOT, "scripts/copilot-workspace/bootstrap.ps1"),
      "utf8"
    );
    expect(bootstrap).toMatch(/worktree-bootstrap\.ps1/);
    expect(bootstrap).toMatch(/Invoke-WorktreeBootstrap/);
    const moduleText = readFileSync(
      join(ROOT, "scripts/lib/worktree-bootstrap.ps1"),
      "utf8"
    );
    expect(moduleText).toMatch(/function Invoke-WorktreeBootstrap/);
  });

  it("hooks.json uses portable lean-ctx resolver", () => {
    const hooks = JSON.parse(
      readFileSync(join(ROOT, ".github/hooks/hooks.json"), "utf8")
    );
    const pre = hooks.hooks?.preToolUse ?? [];
    expect(pre.some((h) => h.bash?.includes("resolve-lean-ctx-hook.mjs"))).toBe(
      true
    );
    expect(hooks.hooks?.sessionStart?.length).toBeGreaterThan(0);
    expect(hooks.hooks?.sessionEnd?.length).toBeGreaterThan(0);
  });
});
