#!/usr/bin/env node
/**
 * yarn km:status — aggregate health for Entire / Dolt / Beads / inbox funnel
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const powershell = process.platform === "win32" ? "powershell" : "pwsh";

function run(label, cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    ...opts,
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  const ok = r.status === 0;
  console.log(`\n=== ${label} ${ok ? "OK" : "FAIL"} ===`);
  if (out) console.log(out.split("\n").slice(0, 40).join("\n"));
  return ok;
}

console.log("ModMe knowledge / agent data plane status");
console.log(`root: ${ROOT}`);

let ok = true;

ok =
  run(
    "Entire",
    powershell,
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(ROOT, "scripts/entire/status.ps1"),
    ],
  ) && ok;

ok =
  run(
    "Dolt",
    powershell,
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(ROOT, "scripts/dolt/status.ps1"),
    ],
  ) && ok;

ok = run("Beads", "npx", ["--yes", "@beads/bd", "ready"]) && ok;

const inboxDir = join(ROOT, "GenerativeUI_monorepo/docs/inbox");
if (existsSync(inboxDir)) {
  ok =
    run("Inbox funnel", "node", [
      join(ROOT, "scripts/inbox-audit.mjs"),
      "--lens",
      "funnel",
    ]) && ok;
} else {
  console.log("\n=== Inbox SKIP (path missing) ===");
}

console.log(`\nkm:status ${ok ? "PASS" : "PARTIAL/FAIL"}`);
process.exit(ok ? 0 : 1);
