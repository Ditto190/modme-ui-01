/**
 * Normalize preflight step results into a versioned report artifact.
 */
import fs from "node:fs";
import path from "node:path";

/** @typedef {"env"|"lint"|"unit-test"|"build"|"boundary"|"guard"|"infra"} FailureClass */

export const FAILURE_CLASSES = /** @type {const} */ ([
  "env",
  "lint",
  "unit-test",
  "build",
  "boundary",
  "guard",
  "infra",
]);

export const REPORT_SCHEMA_VERSION = "1.0.0";

export const DEFAULT_REPORT_PATH = "docs/devops/reports/preflight-latest.json";

/** @type {Record<string, FailureClass>} */
const STEP_FAILURE_CLASS = {
  "session-verify": "env",
  "forge-env-verify": "env",
  "secret-guard": "guard",
  "worktree-doctor": "guard",
  "scripts-test": "unit-test",
  changelog: "lint",
  "changelog-strict": "lint",
  "launch-json": "lint",
  "launch-json-sync": "lint",
  "cursor-skills": "lint",
  "forge-check": "lint",
  "forge-test": "unit-test",
  "forge-build": "build",
  "forge-boundaries": "boundary",
  "generative-verify": "build",
  "inbox-audit": "lint",
  "tdd-red-test": "unit-test",
  "tdd-green-test": "unit-test",
  "tdd-refactor-test": "unit-test",
};

/**
 * @param {string} stepId
 * @returns {FailureClass}
 */
export function failureClassForStep(stepId) {
  return STEP_FAILURE_CLASS[stepId] ?? "infra";
}

/**
 * @param {{
 *   profile: string;
 *   branch?: string;
 *   affected?: { forge: boolean; generative: boolean; inbox: boolean };
 *   ok: boolean;
 *   durationMs: number;
 *   results: Array<{
 *     name: string;
 *     ok: boolean;
 *     ms: number;
 *     skipped?: boolean;
 *     error?: string;
 *   }>;
 *   stepsMeta?: Record<string, { title?: string }>;
 * }} input
 */
export function buildPreflightReport(input) {
  const steps = input.results.map((result) => {
    const title = input.stepsMeta?.[result.name]?.title ?? result.name;
    /** @type {"passed"|"failed"|"skipped"} */
    let status = "passed";
    if (result.skipped) {
      status = "skipped";
    } else if (!result.ok) {
      status = "failed";
    }

    return {
      id: result.name,
      title,
      status,
      durationMs: result.ms,
      failureClass: failureClassForStep(result.name),
      logExcerpt: result.error ?? "",
    };
  });

  const failedSteps = steps.filter((step) => step.status === "failed");

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    profile: input.profile,
    branch: input.branch ?? "",
    affected: input.affected ?? { forge: false, generative: false, inbox: false },
    ok: input.ok,
    durationMs: input.durationMs,
    summary: {
      total: steps.length,
      passed: steps.filter((step) => step.status === "passed").length,
      failed: failedSteps.length,
      skipped: steps.filter((step) => step.status === "skipped").length,
      failureClasses: [...new Set(failedSteps.map((step) => step.failureClass))],
    },
    steps,
  };
}

/**
 * @param {ReturnType<typeof buildPreflightReport>} report
 * @param {string} repoRoot
 * @param {string} [relativePath]
 * @returns {string} absolute path written
 */
export function writePreflightReport(report, repoRoot, relativePath = DEFAULT_REPORT_PATH) {
  const reportPath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}
