import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  stackLabelsForPaths,
  labelsForPaths,
  labelsForIssueBody,
  globMatches,
} from "../lib/issue-autotag.mjs";

describe("issue-autotag", () => {
  it("labels next-forge paths as stack:forge", () => {
    const labels = stackLabelsForPaths(["next-forge/apps/app/page.tsx"]);
    assert.deepEqual(labels, ["stack:forge"]);
  });

  it("labels GenerativeUI paths as stack:generative", () => {
    const labels = stackLabelsForPaths(["GenerativeUI_monorepo/apps/web/package.json"]);
    assert.deepEqual(labels, ["stack:generative"]);
  });

  it("labels orchestration paths", () => {
    const labels = stackLabelsForPaths(["scripts/intake-orchestrator.mjs"]);
    assert.deepEqual(labels, ["stack:orchestration"]);
  });

  it("labelsForPaths adds ci-cd for workflow files", () => {
    const labels = labelsForPaths([".github/workflows/ci.yml"]);
    assert.ok(labels.includes("stack:orchestration"));
    assert.ok(labels.includes("ci-cd"));
  });

  it("labelsForIssueBody detects beads-linked", () => {
    const labels = labelsForIssueBody("Linked beads modme-aqu for session");
    assert.ok(labels.includes("beads-linked"));
  });

  it("globMatches supports **", () => {
    assert.ok(globMatches("next-forge/**", "next-forge/apps/app/x.ts"));
    assert.ok(!globMatches("next-forge/**", "GenerativeUI_monorepo/x.ts"));
  });
});
