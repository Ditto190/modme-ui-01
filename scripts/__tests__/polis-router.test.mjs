import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { routeContract } from "../lib/polis-router.mjs";

describe("polis-router", () => {
  it("routes ci-cd + selfHeal to devops-ci-champion", () => {
    const route = routeContract({
      labels: ["ci-cd", "devops-autofix"],
      selfHeal: "Yes",
      changedPaths: [".github/workflows/ci.yml"],
    });
    assert.equal(route.citizenId, "devops-ci-champion");
    assert.ok(route.verifyCommands.length > 0);
  });

  it("routes forge paths to forge-reviewer", () => {
    const route = routeContract({
      labels: ["stack:forge"],
      changedPaths: ["next-forge/apps/app/page.tsx"],
    });
    assert.equal(route.citizenId, "forge-reviewer");
  });
});
