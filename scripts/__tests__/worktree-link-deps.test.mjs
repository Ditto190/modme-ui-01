import { describe, expect, it } from "vitest";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  BOOTSTRAP_LOCK_PATHS,
  HEAVY_DEP_SPECS,
  getLockfileFingerprint,
  lockfilesMatch,
} from "../lib/worktree-link-deps.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const COPY_ENV_PS1 = resolve(ROOT, "scripts/worktree-copy-env.ps1");

describe("worktree-link-deps contract", () => {
  it("getLockfileFingerprint returns null for missing file", () => {
    expect(getLockfileFingerprint(join(tmpdir(), "missing-lock-xyz.lock"))).toBeNull();
  });

  it("lockfilesMatch returns false when bun.lock differs", () => {
    const dir = mkdtempSync(join(tmpdir(), "wt-lock-"));
    try {
      mkdirSync(join(dir, "next-forge"), { recursive: true });
      writeFileSync(join(dir, "next-forge/bun.lock"), "lock-a\n");
      const target = mkdtempSync(join(tmpdir(), "wt-lock-tgt-"));
      mkdirSync(join(target, "next-forge"), { recursive: true });
      writeFileSync(join(target, "next-forge/bun.lock"), "lock-b\n");
      expect(
        lockfilesMatch(dir, target, ["next-forge/bun.lock"])
      ).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("lockfilesMatch returns true when lockfiles match", () => {
    const dir = mkdtempSync(join(tmpdir(), "wt-lock-match-"));
    try {
      mkdirSync(join(dir, "next-forge"), { recursive: true });
      writeFileSync(join(dir, "next-forge/bun.lock"), "same-lock\n");
      const target = mkdtempSync(join(tmpdir(), "wt-lock-match-tgt-"));
      mkdirSync(join(target, "next-forge"), { recursive: true });
      writeFileSync(join(target, "next-forge/bun.lock"), "same-lock\n");
      expect(
        lockfilesMatch(dir, target, ["next-forge/bun.lock"])
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("HEAVY_DEP_SPECS has four entries with correct lock paths", () => {
    expect(HEAVY_DEP_SPECS).toHaveLength(4);
    expect(HEAVY_DEP_SPECS.map((s) => s.rel)).toEqual([
      "node_modules",
      "GenerativeUI_monorepo/node_modules",
      "next-forge/node_modules",
      "GenerativeUI_monorepo/apps/agent-server/.venv",
    ]);
    expect(HEAVY_DEP_SPECS[2].locks).toEqual(["next-forge/bun.lock"]);
    expect(HEAVY_DEP_SPECS[3].locks).toEqual([
      "GenerativeUI_monorepo/apps/agent-server/poetry.lock",
    ]);
  });

  it("BOOTSTRAP_LOCK_PATHS includes bun.lock and poetry.lock", () => {
    expect(BOOTSTRAP_LOCK_PATHS).toContain("next-forge/bun.lock");
    expect(BOOTSTRAP_LOCK_PATHS).toContain(
      "GenerativeUI_monorepo/apps/agent-server/poetry.lock"
    );
  });
});

describe("worktree-copy-env.ps1", () => {
  it("copies bun.lock and poetry.lock from source to target", () => {
    const source = mkdtempSync(join(tmpdir(), "wt-copy-src-"));
    const target = mkdtempSync(join(tmpdir(), "wt-copy-tgt-"));
    try {
      mkdirSync(join(source, "next-forge"), { recursive: true });
      mkdirSync(
        join(source, "GenerativeUI_monorepo/apps/agent-server"),
        { recursive: true }
      );
      writeFileSync(join(source, "next-forge/bun.lock"), "bun-lock-content\n");
      writeFileSync(
        join(source, "GenerativeUI_monorepo/apps/agent-server/poetry.lock"),
        "poetry-lock-content\n"
      );
      writeFileSync(join(source, "yarn.lock"), "yarn-lock\n");
      writeFileSync(join(source, ".yarnrc.yml"), "nmMode: hardlinks-global\n");

      const result = spawnSync(
        "powershell",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          COPY_ENV_PS1,
          "-SourceRoot",
          source,
          "-TargetRoot",
          target,
        ],
        { encoding: "utf8" }
      );
      expect(result.status, result.stderr || result.stdout).toBe(0);

      for (const rel of [
        "next-forge/bun.lock",
        "GenerativeUI_monorepo/apps/agent-server/poetry.lock",
      ]) {
        const copied = join(target, rel);
        expect(existsSync(copied), `missing ${rel}`).toBe(true);
        expect(readFileSync(copied, "utf8")).toBe(
          readFileSync(join(source, rel), "utf8")
        );
      }
    } finally {
      rmSync(source, { recursive: true, force: true });
      rmSync(target, { recursive: true, force: true });
    }
  });
});

describe("worktree bootstrap scripts exist", () => {
  it("link-deps and bootstrap PS1 are present", () => {
    expect(existsSync(resolve(ROOT, "scripts/lib/worktree-link-deps.ps1"))).toBe(
      true
    );
    expect(existsSync(resolve(ROOT, "scripts/lib/worktree-bootstrap.ps1"))).toBe(
      true
    );
  });
});
