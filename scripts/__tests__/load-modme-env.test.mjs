import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadModMeEnv, restoreEnv, snapshotEnv } from "../lib/load-modme-env.mjs";

const ENV_KEYS = [
  "DATABASE_URL",
  "MONOREPO_MODME_ROOT",
  "FORGE_APP_PORT",
  "NEXT_PUBLIC_APP_URL",
  "SHARED_KEY",
];

describe("loadModMeEnv", () => {
  /** @type {string} */
  let tmpDir;
  /** @type {Record<string, string | undefined>} */
  let envSnapshot;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "modme-env-"));
    envSnapshot = snapshotEnv(ENV_KEYS);
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    restoreEnv(envSnapshot, ENV_KEYS);
  });

  it("loads root env and applies worktree port overrides", () => {
    fs.writeFileSync(
      path.join(tmpDir, ".env"),
      "FORGE_APP_PORT=3100\nSHARED_KEY=from-root\n"
    );
    fs.writeFileSync(
      path.join(tmpDir, ".worktree-ports.env"),
      "FORGE_APP_PORT=3110\n"
    );
    fs.mkdirSync(path.join(tmpDir, "next-forge/packages/database"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tmpDir, "next-forge/packages/database/.env"),
      "DATABASE_URL=postgres://local\n"
    );

    const loaded = loadModMeEnv(tmpDir, { forceFileIds: ["forge-db"] });
    expect(loaded.root).toBeGreaterThan(0);
    expect(loaded.ports).toBeGreaterThan(0);
    expect(process.env.FORGE_APP_PORT).toBe("3110");
    expect(process.env.SHARED_KEY).toBe("from-root");
    expect(process.env.DATABASE_URL).toBe("postgres://local");
    expect(process.env.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3110");
  });

  it("forceKeys overwrites pre-existing process.env values", () => {
    process.env.DATABASE_URL = "postgres://host-supabase";

    fs.mkdirSync(path.join(tmpDir, "next-forge/packages/database"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tmpDir, "next-forge/packages/database/.env"),
      "DATABASE_URL=postgres://local\n",
    );

    loadModMeEnv(tmpDir, { forceKeys: ["DATABASE_URL"] });
    expect(process.env.DATABASE_URL).toBe("postgres://local");
  });
});
