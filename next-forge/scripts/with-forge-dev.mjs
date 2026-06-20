/**
 * Prepares next-forge dev: loads packages/database/.env, hides parent Yarn PnP
 * (.pnp.cjs) that breaks Storybook/esbuild, then runs the given command.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const forgeRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(forgeRoot, "..");
const databaseEnvPath = path.join(forgeRoot, "packages/database/.env");
const pnpPath = path.join(repoRoot, ".pnp.cjs");
const hiddenPnpPath = `${pnpPath}.forge-hidden`;

const LINE_BREAK_RE = /\r?\n/;
const ENV_KEY_VALUE_RE = /^([A-Z_][A-Z0-9_]*)=(.*)$/;
const DOUBLE_QUOTED_VALUE_RE = /^"(.*)"$/;
const SINGLE_QUOTED_VALUE_RE = /^'(.*)'$/;

let pnpHidden = false;

function hidePnp() {
  if (fs.existsSync(hiddenPnpPath) && !fs.existsSync(pnpPath)) {
    fs.renameSync(hiddenPnpPath, pnpPath);
  }
  if (fs.existsSync(pnpPath)) {
    fs.renameSync(pnpPath, hiddenPnpPath);
    pnpHidden = true;
  }
}

function restorePnp() {
  if (pnpHidden && fs.existsSync(hiddenPnpPath)) {
    fs.renameSync(hiddenPnpPath, pnpPath);
    pnpHidden = false;
  }
}

function loadDatabaseEnv() {
  if (!fs.existsSync(databaseEnvPath)) {
    console.warn(
      `warn: ${databaseEnvPath} not found — app/api need DATABASE_URL and DIRECT_URL`
    );
    return;
  }

  for (const line of fs
    .readFileSync(databaseEnvPath, "utf8")
    .split(LINE_BREAK_RE)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const match = trimmed.match(ENV_KEY_VALUE_RE);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    const value = rawValue
      .replace(DOUBLE_QUOTED_VALUE_RE, "$1")
      .replace(SINGLE_QUOTED_VALUE_RE, "$1");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function run() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("usage: node scripts/with-forge-dev.mjs <command> [args...]");
    process.exit(1);
  }

  const [command, ...commandArgs] = args;
  hidePnp();
  loadDatabaseEnv();

  const child =
    process.platform === "win32"
      ? spawn([command, ...commandArgs].join(" "), {
          cwd: forgeRoot,
          env: process.env,
          stdio: "inherit",
          shell: true,
        })
      : spawn(command, commandArgs, {
          cwd: forgeRoot,
          env: process.env,
          stdio: "inherit",
          shell: false,
        });

  const cleanup = () => {
    restorePnp();
  };

  child.on("exit", (code, signal) => {
    cleanup();
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    cleanup();
    console.error(error);
    process.exit(1);
  });

  process.on("SIGINT", () => {
    child.kill("SIGINT");
  });
  process.on("SIGTERM", () => {
    child.kill("SIGTERM");
  });
}

run();
