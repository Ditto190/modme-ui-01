import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { matchGlob, matchRoles, allRoleIds } from "../lib/agent-codeowners.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG = resolve(__dirname, "../../.github/agent-codeowners.yml");

describe("matchGlob", () => {
  it("matches prefix/**", () => {
    assert.equal(matchGlob("next-forge/**", "next-forge/apps/app/page.tsx"), true);
    assert.equal(matchGlob("next-forge/**", "GenerativeUI_monorepo/x"), false);
  });

  it("matches **/auth/**", () => {
    assert.equal(matchGlob("**/auth/**", "next-forge/packages/auth/src/x.ts"), true);
    assert.equal(matchGlob("**/auth/**", "docs/readme.md"), false);
  });
});

describe("matchRoles", () => {
  it("routes forge-only paths to forge + merge", () => {
    const r = matchRoles(["next-forge/apps/app/page.tsx"], CONFIG);
    assert.deepEqual(r.roles.sort(), ["forge", "merge"].sort());
    assert.ok(r.labels.includes("review:forge"));
    assert.ok(r.requiredChecks.includes("modme/agent-forge"));
    assert.ok(r.requiredChecks.includes("modme/agent-merge"));
  });

  it("routes multi-stack paths to forge + generative + merge", () => {
    const r = matchRoles(
      [
        "next-forge/packages/ui/button.tsx",
        "GenerativeUI_monorepo/apps/web-dashboard/src/app/page.tsx",
      ],
      CONFIG
    );
    assert.ok(r.roles.includes("forge"));
    assert.ok(r.roles.includes("generative"));
    assert.ok(r.roles.includes("merge"));
  });

  it("routes security paths", () => {
    const r = matchRoles(["next-forge/packages/database/prisma/schema.prisma"], CONFIG);
    assert.ok(r.roles.includes("security"));
    assert.ok(r.roles.includes("forge"));
    assert.ok(r.labels.includes("review:security"));
  });

  it("routes docs-only as advisory docs + merge", () => {
    const r = matchRoles(["docs/agent-index.md"], CONFIG);
    assert.ok(r.roles.includes("docs"));
    assert.ok(r.roles.includes("merge"));
    const docsCheck = r.checks.find((c) => c.role === "docs");
    assert.equal(docsCheck?.required, false);
  });

  it("returns empty roles for unrelated paths", () => {
    const r = matchRoles(["LICENSE"], CONFIG);
    assert.deepEqual(r.roles, []);
  });

  it("lists all role ids from config", () => {
    const ids = allRoleIds(CONFIG);
    assert.ok(ids.includes("forge"));
    assert.ok(ids.includes("merge"));
    assert.ok(ids.includes("devops"));
  });
});
