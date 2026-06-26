/**
 * Prepares next-forge dev: loads ModMe env stack, hides parent Yarn PnP, runs command.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModMeEnv } from "../../scripts/lib/load-modme-env.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const forgeRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(forgeRoot, "..");
const pnpPath = path.join(repoRoot, ".pnp.cjs");
const hiddenPnpPath = `${pnpPath}.forge-hidden`;

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

function run() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("usage: node scripts/with-forge-dev.mjs <command> [args...]");
    process.exit(1);
  }

  const [command, ...commandArgs] = args;
  hidePnp();

  const loaded = loadModMeEnv(repoRoot);
  const summary = Object.entries(loaded)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  if (summary) {
    console.error(`[modme-env] forge dev loaded (${summary})`);
  }

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
