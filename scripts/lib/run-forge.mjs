/**
 * Cross-platform next-forge command runner (env + PnP isolation).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadModMeEnv } from "./load-modme-env.mjs";

/**
 * @param {string} repoRoot
 * @param {string[]} bunArgs
 * @returns {import("node:child_process").SpawnSyncReturns<string>}
 */
export function runForge(repoRoot, bunArgs) {
  const forgeRoot = path.join(repoRoot, "next-forge");
  const pnpPath = path.join(repoRoot, ".pnp.cjs");
  const hiddenPnpPath = `${pnpPath}.forge-hidden`;

  if (fs.existsSync(hiddenPnpPath) && !fs.existsSync(pnpPath)) {
    fs.renameSync(hiddenPnpPath, pnpPath);
  }

  let pnpHidden = false;
  if (fs.existsSync(pnpPath)) {
    fs.renameSync(pnpPath, hiddenPnpPath);
    pnpHidden = true;
  }

  loadModMeEnv(repoRoot);

  const restore = () => {
    if (pnpHidden && fs.existsSync(hiddenPnpPath)) {
      fs.renameSync(hiddenPnpPath, pnpPath);
      pnpHidden = false;
    }
  };

  try {
    if (process.platform === "win32") {
      const script = path.join(repoRoot, "scripts/run-forge-bun.ps1");
      return spawnSync(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, ...bunArgs],
        { cwd: repoRoot, stdio: "inherit", env: process.env },
      );
    }

    return spawnSync("bun", bunArgs, {
      cwd: forgeRoot,
      stdio: "inherit",
      env: process.env,
    });
  } finally {
    restore();
  }
}
