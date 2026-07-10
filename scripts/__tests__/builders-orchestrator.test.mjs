import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

describe("builders-orchestrator", () => {
  it("builders.manifest.json defines swc, vite, dolt", () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "scripts/builders.manifest.json"), "utf8")
    );
    const ids = manifest.builders.map((b) => b.id);
    expect(ids).toContain("swc");
    expect(ids).toContain("vite");
    expect(ids).toContain("dolt");
    expect(manifest.pipelines["copilot-session-create"]).toBeDefined();
  });

  it("swc config exists", () => {
    expect(existsSync(join(ROOT, "config/builders/swc.swcrc"))).toBe(true);
  });

  it("dolt catalog schema exists", () => {
    expect(existsSync(join(ROOT, "config/dolt/catalog/schema.sql"))).toBe(true);
  });

  it("list action runs", () => {
    const r = spawnSync(
      process.execPath,
      ["scripts/builders-orchestrator.mjs", "list"],
      { cwd: ROOT, encoding: "utf8" }
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/swc/);
    expect(r.stdout).toMatch(/vite/);
  });

  it("github-app.yml exposes builder run scripts", () => {
    const yml = readFileSync(join(ROOT, ".github/github-app.yml"), "utf8");
    expect(yml).toMatch(/builders:ensure/);
    expect(yml).toMatch(/builders:vite:dev/);
    expect(yml).toMatch(/builders:dolt:status/);
  });
});
