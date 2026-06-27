/**
 * Derive GitHub labels from a preflight report JSON artifact.
 */

/** @type {Record<string, string>} */
const FAILURE_CLASS_LABELS = {
  lint: "failure:lint",
  "unit-test": "failure:test",
  build: "failure:build",
  boundary: "failure:build",
  env: "failure:env",
  guard: "failure:guard",
  infra: "failure:infra",
};

const FORGE_STEPS = new Set([
  "forge-env-verify",
  "forge-check",
  "forge-test",
  "forge-build",
  "forge-boundaries",
  "tdd-red-test",
  "tdd-green-test",
  "tdd-refactor-test",
]);

/**
 * @param {object} report
 */
export function labelsFromPreflightReport(report) {
  /** @type {Set<string>} */
  const labels = new Set();

  labels.add(report.ok ? "ci:passed" : "ci:failed");

  if (!report.ok) {
    labels.add("needs-triage");
  }

  for (const failureClass of report.summary?.failureClasses ?? []) {
    const label = FAILURE_CLASS_LABELS[failureClass];
    if (label) labels.add(label);
  }

  if (report.affected?.forge) {
    labels.add("stack:forge");
  }
  if (report.affected?.generative) {
    labels.add("stack:generative");
  }

  const failedSteps = (report.steps ?? []).filter((step) => step.status === "failed");
  for (const step of failedSteps) {
    if (step.id === "generative-verify") {
      labels.add("stack:generative");
    }
    if (FORGE_STEPS.has(step.id)) {
      labels.add("stack:forge");
    }
  }

  return [...labels].sort();
}
