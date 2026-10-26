import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { routeContract, routeContracts } from "../lib/polis-router.mjs";

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

  it("routeContracts returns all matching citizens for multi-stack", () => {
    const routes = routeContracts({
      labels: ["stack:forge", "stack:generative", "review:forge", "review:generative"],
      changedPaths: [
        "next-forge/apps/app/page.tsx",
        "GenerativeUI_monorepo/apps/web-dashboard/src/app/page.tsx",
      ],
    });
    const ids = routes.map((r) => r.citizenId);
    assert.ok(ids.includes("forge-reviewer"));
    assert.ok(ids.includes("generative-reviewer"));
    assert.ok(routes.length >= 2);
  });

  it("routeContracts matches security reviewer on auth paths", () => {
    const routes = routeContracts({
      labels: ["review:security"],
      changedPaths: ["next-forge/packages/auth/src/index.ts"],
    });
    assert.ok(routes.some((r) => r.citizenId === "security-reviewer"));
  });
});
