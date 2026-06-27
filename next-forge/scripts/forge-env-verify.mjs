#!/usr/bin/env node
/**
 * Verify next-forge has required env keys after ModMe bootstrap stack.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModMeEnv } from "../../scripts/lib/load-modme-env.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const forgeRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(forgeRoot, "..");

const REQUIRED = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

const RECOMMENDED = [
  "AUTH_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_WEB_URL",
  "NEXT_PUBLIC_API_URL",
];

loadModMeEnv(repoRoot);

const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
const weak = RECOMMENDED.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error("forge env verify: missing required keys:");
  for (const key of missing) {
    console.error(`  - ${key}`);
  }
  console.error("\nRun from repo root: yarn setup:env && yarn session:start");
  process.exit(1);
}

const dbEnv = path.join(forgeRoot, "packages/database/.env");
if (!fs.existsSync(dbEnv)) {
  console.error(`forge env verify: create ${dbEnv} from .env.example`);
  process.exit(1);
}

console.log("forge env verify: ok");
if (weak.length > 0) {
  console.warn("recommended keys unset:", weak.join(", "));
}
