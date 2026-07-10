#!/usr/bin/env node
/**
 * Resolve lean-ctx binary and run a hook subcommand (rewrite | redirect | observe).
 * Used by .github/hooks/hooks.json for portable Copilot CLI hooks.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function shouldUseShellString(cmd) {
  return (
    process.platform === "win32" &&
    !/[\\/]/.test(cmd) &&
    !/\.(exe|bat)$/i.test(cmd)
  );
}

const subcommand = process.argv[2];
if (!subcommand) {
  console.error("Usage: node scripts/resolve-lean-ctx-hook.mjs <rewrite|redirect|observe>");
  process.exit(1);
}

const candidates = [
  process.env.LEAN_CTX_BIN,
  "lean-ctx",
  join(homedir(), ".gemini", "antigravity", "bin", "lean-ctx.exe"),
  join(homedir(), ".local", "bin", "lean-ctx"),
].filter(Boolean);

let bin = null;
for (const c of candidates) {
  if (c === "lean-ctx" || existsSync(c)) {
    const exe = c;
    const probe = shouldUseShellString(exe)
      ? spawnSync(`${exe} --version`, { encoding: "utf8", shell: true })
      : spawnSync(exe, ["--version"], { encoding: "utf8", shell: false });
    if (probe.status === 0) {
      bin = exe;
      break;
    }
  }
}

if (!bin) {
  // Non-fatal: hooks should not block Copilot when lean-ctx is absent
  process.exit(0);
}

const result = shouldUseShellString(bin)
  ? spawnSync(`"${bin.replace(/"/g, '""')}" hook ${subcommand}`, {
      stdio: "inherit",
      shell: true,
    })
  : spawnSync(bin, ["hook", subcommand], {
      stdio: "inherit",
      shell: false,
    });

if (result.signal) {
  process.exit(1);
}
process.exit(result.status ?? 0);
