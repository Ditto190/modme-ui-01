import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  canonicalizeUnderRoot,
  detectProfile,
  evaluateDecisionTree,
  resolveRepoRoot,
} from "../lib/resolve-path-profile.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = resolve(__dirname, "../..");

const PROFILES = {
  "main-checkout": {
    id: "main-checkout",
    detect: { notUnder: ".worktrees/" },
    requirePaths: ["package.json", "yarn.lock"],
    allowPrefixes: ["scripts/"],
  },
  "agent-worktree": {
    id: "agent-worktree",
    detect: { under: ".worktrees/" },
    requirePaths: ["package.json", "yarn.lock", ".worktree-ports.env"],
    allowPrefixes: ["scripts/", ".cache/"],
  },
};

const TREE = [
  {
    id: "missing-yarn-lock",
    when: { missing: "yarn.lock" },
    severity: "error",
    message: "yarn.lock missing",
    remediation: ["Copy yarn.lock from main checkout"],
  },
  {
    id: "missing-ports-env",
    when: { profile: "agent-worktree", missing: ".worktree-ports.env" },
    severity: "error",
    message: "Worktree ports env missing",
    remediation: ["yarn worktree:ports"],
  },
];

describe("resolve-path-profile.mjs", () => {
  /** @type {string[]} */
  let tempDirs = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs = [];
  });

  function makeRepo(layout) {
    const dir = mkdtempSync(join(tmpdir(), "modme-path-profile-"));
    tempDirs.push(dir);
    mkdirSync(join(dir, "scripts"), { recursive: true });
    writeFileSync(join(dir, "package.json"), "{}", "utf8");
    writeFileSync(join(dir, "scripts/control-cli-harness.mjs"), "// stub\n", "utf8");
    for (const [rel, content] of Object.entries(layout)) {
      const full = join(dir, rel);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content, "utf8");
    }
    return dir;
  }

  it("rejects path traversal outside repo root", () => {
    const root = makeRepo({});
    const escaped = canonicalizeUnderRoot(root, "../../../etc/passwd");
    expect(escaped.ok).toBe(false);
    if (!escaped.ok) {
      expect(escaped.error).toMatch(/escapes repo root/);
    }
  });

  it("detects main-checkout vs agent-worktree profiles", () => {
    const mainLike = makeRepo({ "yarn.lock": "" });
    expect(detectProfile(mainLike, PROFILES)?.id).toBe("main-checkout");

    const worktreeLike = makeRepo({ "yarn.lock": "" });
    const underWorktrees = join(FIXTURE_ROOT, ".worktrees", "dev-agent-test");
    expect(detectProfile(underWorktrees, PROFILES)?.id).toBe("agent-worktree");
  });

  it("emits missing-yarn-lock finding in decision tree", () => {
    const root = makeRepo({});
    const profile = detectProfile(root, PROFILES);
    const findings = evaluateDecisionTree(root, profile, TREE, {
      commandCache: new Map([["devbox", false], ["mprocs", true], ["bash", true]]),
    });
    expect(findings.some((f) => f.id === "missing-yarn-lock")).toBe(true);
  });

  it("resolveRepoRoot walks up to harness marker", () => {
    const root = makeRepo({ "yarn.lock": "" });
    const nested = join(root, "scripts", "lib");
    mkdirSync(nested, { recursive: true });
    expect(resolveRepoRoot(nested)).toBe(resolve(root));
  });
});
