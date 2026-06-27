import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPreflightReport,
  failureClassForStep,
  REPORT_SCHEMA_VERSION,
} from "../lib/preflight-report.mjs";
import { labelsFromPreflightReport } from "../lib/preflight-labels.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("preflight pipeline", () => {
  it("manifest defines core profiles and steps", () => {
    const manifestPath = join(root, "scripts/preflight.manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    for (const profile of [
      "env",
      "fast",
      "forge",
      "full",
      "ci",
      "tdd-red",
      "tdd-green",
      "tdd-refactor",
    ]) {
      expect(manifest.profiles[profile]).toBeDefined();
      expect(manifest.profiles[profile].stages.length).toBeGreaterThan(0);
    }

    for (const step of [
      "secret-guard",
      "forge-check",
      "forge-test",
      "forge-build",
      "generative-verify",
      "tdd-red-test",
      "tdd-green-test",
    ]) {
      expect(manifest.steps[step]).toBeDefined();
    }

    expect(existsSync(join(root, "scripts/preflight.mjs"))).toBe(true);
    expect(existsSync(join(root, "scripts/lib/run-forge.mjs"))).toBe(true);
    expect(existsSync(join(root, "scripts/lib/preflight-report.mjs"))).toBe(true);
    expect(existsSync(join(root, "docs/devops/preflight-report.schema.json"))).toBe(true);
  });

  it("forge profile runs lint, test, and build stages", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "scripts/preflight.manifest.json"), "utf8"),
    );
    const stages = manifest.profiles.forge.stages;
    expect(stages).toContain("forge-lint");
    expect(stages).toContain("forge-test");
    expect(stages).toContain("forge-build");
  });

  it("buildPreflightReport maps failureClass per step", () => {
    const report = buildPreflightReport({
      profile: "fast",
      branch: "dev",
      affected: { forge: true, generative: false, inbox: false },
      ok: false,
      durationMs: 100,
      results: [
        { name: "scripts-test", ok: false, ms: 50, error: "assertion failed" },
        { name: "forge-check", ok: true, ms: 50 },
      ],
      stepsMeta: {
        "scripts-test": { title: "Root script unit tests" },
        "forge-check": { title: "next-forge ultracite check" },
      },
    });

    expect(report.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
    expect(report.summary.failureClasses).toContain("unit-test");
    expect(failureClassForStep("forge-build")).toBe("build");
    expect(report.steps[0].failureClass).toBe("unit-test");
    expect(report.steps[0].logExcerpt).toBe("assertion failed");
  });

  it("quality orchestrator manifest exists", () => {
    expect(existsSync(join(root, "scripts/quality-orchestrator.manifest.json"))).toBe(true);
    expect(existsSync(join(root, "scripts/quality-orchestrator.mjs"))).toBe(true);
    expect(existsSync(join(root, "scripts/quality-skills-roster.json"))).toBe(true);
    expect(existsSync(join(root, "scripts/apply-preflight-labels.mjs"))).toBe(true);
  });

  it("labelsFromPreflightReport maps failure classes to labels", () => {
    const labels = labelsFromPreflightReport({
      ok: false,
      affected: { forge: true, generative: false, inbox: false },
      summary: { failureClasses: ["lint", "unit-test"] },
      steps: [{ id: "forge-check", status: "failed" }],
    });
    expect(labels).toContain("ci:failed");
    expect(labels).toContain("needs-triage");
    expect(labels).toContain("failure:lint");
    expect(labels).toContain("failure:test");
    expect(labels).toContain("stack:forge");
  });
});
