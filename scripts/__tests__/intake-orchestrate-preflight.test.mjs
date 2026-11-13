/**
 * Intake orchestrator preflight — actionable errors when Supabase env missing.
 * KM/Dolt is a separate plane; this test does not require Dolt.
 */
import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

describe("intake-orchestrate-preflight", () => {
  it("source documents KM ≠ intake plane separation", () => {
    const src = readFileSync(resolve(ROOT, "scripts/intake-orchestrator.mjs"), "utf8");
    expect(src).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(src).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).toMatch(/km:status/);
  });

  it("fails fast with actionable message when Supabase env stripped", () => {
    const env = { ...process.env };
    delete env.NEXT_PUBLIC_SUPABASE_URL;
    delete env.SUPABASE_SERVICE_ROLE_KEY;
    env.MODME_INTAKE_SKIP_DOTENV = "1";
    env.NEXT_PUBLIC_SUPABASE_URL = "";
    env.SUPABASE_SERVICE_ROLE_KEY = "";

    const result = spawnSync(
      process.execPath,
      ["scripts/intake-orchestrator.mjs", "--mode=pr-validate"],
      {
        cwd: ROOT,
        encoding: "utf8",
        env,
        timeout: 30_000,
      }
    );

    const out = `${result.stdout || ""}${result.stderr || ""}`;
    expect(result.status).not.toBe(0);
    expect(out).toMatch(/missing Supabase env/);
    expect(out).toMatch(/supabase:env:diagnose/);
    expect(out).toMatch(/km:status/);
  });
});
