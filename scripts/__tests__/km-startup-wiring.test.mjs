/**
 * Contract tests: every KM entry point references km-session-bootstrap (no Dolt required).
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("km-startup-wiring", () => {
  it("worktree setup scripts call km-session-bootstrap", () => {
    expect(read(".cursor/setup-worktree-windows.ps1")).toMatch(/km-session-bootstrap\.ps1/);
    expect(read(".cursor/setup-worktree-unix.sh")).toMatch(/km-session-bootstrap\.ps1/);
  });

  it("agent-session-start calls km-session-bootstrap", () => {
    expect(read("scripts/agent-session-start.ps1")).toMatch(/km-session-bootstrap\.ps1/);
  });

  it("shared worktree-bootstrap lib exists and calls KM", () => {
    const rel = "scripts/lib/worktree-bootstrap.ps1";
    expect(existsSync(join(ROOT, rel))).toBe(true);
    expect(read(rel)).toMatch(/km-session-bootstrap\.ps1/);
    expect(read(rel)).toMatch(/function Invoke-WorktreeBootstrap/);
  });

  it("copilot bootstrap dotsources worktree-bootstrap; session-start hits agent-session-start", () => {
    expect(read("scripts/copilot-workspace/bootstrap.ps1")).toMatch(
      /scripts\/lib\/worktree-bootstrap\.ps1/
    );
    expect(read("scripts/copilot-workspace/bootstrap.ps1")).toMatch(/Invoke-WorktreeBootstrap/);
    expect(read("scripts/copilot-workspace/session-start.ps1")).toMatch(/agent-session-start\.ps1/);
  });

  it("new-agent-worktree calls km-session-bootstrap", () => {
    expect(read("scripts/new-agent-worktree.ps1")).toMatch(/km-session-bootstrap\.ps1/);
  });

  it("mprocs generator emits km_bootstrap with autostart true", () => {
    const src = read("scripts/generate-mprocs-config.mjs");
    expect(src).toMatch(/km_bootstrap/);
    expect(src).toMatch(/autostart:\s*true/);
    const gen = spawnSync(process.execPath, ["scripts/generate-mprocs-config.mjs", "--stdout"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(gen.status).toBe(0);
    expect(gen.stdout).toMatch(/km_bootstrap:/);
    expect(gen.stdout).toMatch(/km-session-bootstrap\.ps1/);
    expect(gen.stdout).toMatch(/autostart: true/);
  });

  it("VS Code tasks wire soft KM into next-forge:dev core", () => {
    const tasks = JSON.parse(read(".vscode/tasks.json"));
    const labels = new Set(tasks.tasks.map((t) => t.label));
    expect(labels.has("modme: KM data plane up")).toBe(true);
    expect(labels.has("modme: KM data plane up (strict)")).toBe(true);
    const forge = tasks.tasks.find((t) => t.label === "next-forge: dev core");
    expect(forge?.dependsOn).toContain("modme: KM data plane up");
  });

  it("VS Code launch has strict KM config and forge compound", () => {
    const launch = JSON.parse(read(".vscode/launch.json"));
    const names = new Set(launch.configurations.map((c) => c.name));
    expect(names.has("Agent Data Plane: bootstrap (strict)")).toBe(true);
    const compound = launch.compounds?.find(
      (c) => c.name === "Full Stack: Forge Core + Agent Data Plane"
    );
    expect(compound).toBeTruthy();
    expect(compound.configurations).toContain("Agent Data Plane: bootstrap (strict)");
  });

  it("package.json exposes km:bootstrap facades", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts["km:bootstrap"]).toMatch(/km-session-bootstrap\.ps1/);
    expect(pkg.scripts["km:bootstrap:strict"]).toMatch(/-Strict/);
    expect(pkg.scripts["km:bootstrap:smoke"]).toMatch(/km-bootstrap-smoke/);
  });
});
