import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT_DIR = join(ROOT, ".cache/builders/rolldown");
const ANALYZE = join(OUT_DIR, "analyze-data.json");

function runBuilders(...args) {
  return spawnSync(process.execPath, ["scripts/builders-orchestrator.mjs", ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

describe("rolldown builder", () => {
  it("manifest registers rolldown with config and pipeline steps", () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "scripts/builders.manifest.json"), "utf8"),
    );
    const rolldown = manifest.builders.find((b) => b.id === "rolldown");
    expect(rolldown).toBeDefined();
    expect(rolldown.config).toBe("config/builders/rolldown.config.mjs");
    expect(rolldown.rootDevDeps).toContain("rolldown");
    expect(manifest.pipelines["preflight-builders"]).toContain("rolldown:verify");
    expect(manifest.pipelines["preflight-builders"]).toContain("rolldown:build");
  });

  it("rolldown config file exists", () => {
    expect(existsSync(join(ROOT, "config/builders/rolldown.config.mjs"))).toBe(true);
  });

  it("verify reports rolldown version", () => {
    const r = runBuilders("verify", "--builder", "rolldown");
    expect(r.status).toBe(0);
    expect(`${r.stdout}${r.stderr}`).toMatch(/rolldown/i);
  });

  it("build emits ESM chunks and analyze-data.json", () => {
    const r = runBuilders("build", "--builder", "rolldown");
    expect(r.status).toBe(0);

    expect(existsSync(join(OUT_DIR, "agent-status.mjs"))).toBe(true);
    expect(existsSync(join(OUT_DIR, "control-cli-harness.mjs"))).toBe(true);
    expect(existsSync(ANALYZE)).toBe(true);

    const harness = readFileSync(join(OUT_DIR, "control-cli-harness.mjs"), "utf8");
    expect(harness.length).toBeGreaterThan(0);

    const analyze = JSON.parse(readFileSync(ANALYZE, "utf8"));
    expect(analyze.meta?.bundler).toBe("rolldown");
    expect(typeof analyze.meta?.version).toBe("string");
    expect(Array.isArray(analyze.chunks)).toBe(true);
    expect(analyze.chunks.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(analyze.modules)).toBe(true);
    expect(analyze.modules.some((m) => String(m.path).includes("agent-status"))).toBe(
      true,
    );
    expect(
      analyze.modules.some((m) => String(m.path).includes("control-cli-harness")),
    ).toBe(true);
  });
});
