import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildPreflightReport,
  failureClassForStep,
  writePreflightReport,
  REPORT_SCHEMA_VERSION,
  FAILURE_CLASSES,
} from "../lib/preflight-report.mjs";

describe("preflight-report.mjs", () => {
  it("failureClassForStep maps known steps and defaults to infra", () => {
    expect(failureClassForStep("forge-check")).toBe("lint");
    expect(failureClassForStep("forge-build")).toBe("build");
    expect(failureClassForStep("unknown-step")).toBe("infra");
    expect(FAILURE_CLASSES).toContain("unit-test");
  });

  it("buildPreflightReport produces schemaVersion, summary, and step metadata", () => {
    const report = buildPreflightReport({
      profile: "ci",
      branch: "feature/test",
      affected: { forge: true, generative: false, inbox: true },
      ok: false,
      durationMs: 250,
      results: [
        { name: "secret-guard", ok: true, ms: 10 },
        { name: "forge-test", ok: false, ms: 120, error: "vitest exit 1" },
        { name: "generative-verify", ok: false, ms: 120, skipped: false, error: "build failed" },
      ],
      stepsMeta: {
        "forge-test": { title: "next-forge test" },
      },
    });

    expect(report.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
    expect(report.profile).toBe("ci");
    expect(report.ok).toBe(false);
    expect(report.summary.total).toBe(3);
    expect(report.summary.passed).toBe(1);
    expect(report.summary.failed).toBe(2);
    expect(report.summary.skipped).toBe(0);
    expect(report.summary.failureClasses.sort()).toEqual(["build", "unit-test"].sort());

    const forgeTest = report.steps.find((step) => step.id === "forge-test");
    expect(forgeTest?.title).toBe("next-forge test");
    expect(forgeTest?.status).toBe("failed");
    expect(forgeTest?.failureClass).toBe("unit-test");
    expect(forgeTest?.logExcerpt).toBe("vitest exit 1");
  });

  it("buildPreflightReport marks skipped steps", () => {
    const report = buildPreflightReport({
      profile: "fast",
      ok: true,
      durationMs: 50,
      results: [{ name: "forge-build", ok: true, ms: 50, skipped: true }],
    });

    expect(report.steps[0].status).toBe("skipped");
    expect(report.summary.skipped).toBe(1);
    expect(report.ok).toBe(true);
  });

  describe("writePreflightReport", () => {
    /** @type {string | undefined} */
    let tempDir;

    afterEach(() => {
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it("writes JSON to the requested relative path", () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "preflight-report-"));
      const report = buildPreflightReport({
        profile: "env",
        ok: true,
        durationMs: 10,
        results: [{ name: "session-verify", ok: true, ms: 10 }],
      });

      const written = writePreflightReport(report, tempDir, "reports/preflight-latest.json");
      expect(fs.existsSync(written)).toBe(true);

      const parsed = JSON.parse(fs.readFileSync(written, "utf8"));
      expect(parsed.schemaVersion).toBe(REPORT_SCHEMA_VERSION);
      expect(parsed.profile).toBe("env");
    });
  });
});
