#!/usr/bin/env node
/**
 * Builder orchestration — SWC, Vite, Dolt per scripts/builders.manifest.json
 *
 * Usage:
 *   node scripts/builders-orchestrator.mjs list
 *   node scripts/builders-orchestrator.mjs ensure [--builder swc|vite|dolt|all]
 *   node scripts/builders-orchestrator.mjs verify [--builder ...]
 *   node scripts/builders-orchestrator.mjs build [--builder ...]
 *   node scripts/builders-orchestrator.mjs dev --target vibe-web-app
 *   node scripts/builders-orchestrator.mjs pipeline copilot-session-create
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = resolve(__dirname, "builders.manifest.json");

function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

/** Quote arg for Windows cmd shell string (avoids shell:true + args deprecation). */
function quoteForCmd(arg) {
  const s = String(arg);
  if (/[\s"&|<>^]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Windows .cmd shims (npx, yarn) need shell string spawn — not shell:true + args. */
function shouldUseShellString(cmd) {
  return (
    process.platform === "win32" &&
    !/[\\/]/.test(cmd) &&
    !/\.(exe|bat)$/i.test(cmd)
  );
}

function parseArgs(argv) {
  const out = {
    action: argv[0] ?? "list",
    builder: "all",
    target: null,
    pipeline: null,
    json: argv.includes("--json"),
  };
  const bIdx = argv.indexOf("--builder");
  if (bIdx >= 0 && argv[bIdx + 1]) out.builder = argv[bIdx + 1];
  const tIdx = argv.indexOf("--target");
  if (tIdx >= 0 && argv[tIdx + 1]) out.target = argv[tIdx + 1];
  if (out.action === "pipeline" && argv[1]) out.pipeline = argv[1];
  if (out.action === "dev" && argv[1] && !argv[1].startsWith("-")) {
    out.target = argv[1];
  }
  return out;
}

function runStep(cmd, args, cwd = ROOT, opts = {}) {
  const cwdResolved = resolve(ROOT, cwd);
  const argv = args ?? [];
  const result = shouldUseShellString(cmd)
    ? spawnSync([cmd, ...argv].map(quoteForCmd).join(" "), {
        cwd: cwdResolved,
        stdio: opts.silent ? "pipe" : "inherit",
        shell: true,
        encoding: "utf8",
      })
    : spawnSync(cmd, argv, {
        cwd: cwdResolved,
        stdio: opts.silent ? "pipe" : "inherit",
        shell: false,
        encoding: "utf8",
      });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function getBuilder(manifest, id) {
  return manifest.builders.find((b) => b.id === id);
}

function selectBuilders(manifest, filter) {
  if (filter === "all") return manifest.builders;
  const b = getBuilder(manifest, filter);
  if (!b) {
    console.error(`Unknown builder: ${filter}`);
    process.exit(1);
  }
  return [b];
}

function ensureRootDeps(deps) {
  const pkgPath = join(ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.devDependencies = pkg.devDependencies ?? {};
  let changed = false;
  for (const dep of deps) {
    if (!pkg.devDependencies[dep]) {
      pkg.devDependencies[dep] = "latest";
      changed = true;
      console.log(`builders: adding devDependency ${dep} to package.json`);
    }
  }
  if (changed) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
    console.log("builders: run yarn install to fetch new devDependencies");
    const install = runStep("yarn", ["install"], ROOT);
    if (!install.ok) return false;
  }
  return true;
}

function actionEnsure(manifest, filter) {
  let ok = true;
  for (const builder of selectBuilders(manifest, filter)) {
    console.log(`\n[builders] ensure ${builder.id}`);
    if (builder.rootDevDeps?.length) {
      if (!ensureRootDeps(builder.rootDevDeps)) ok = false;
    }
    if (builder.verify) {
      const v = builder.verify;
      const cwd = v.cwd ?? ".";
      const r = runStep(v.cmd, v.args, cwd, { silent: false });
      if (!r.ok && builder.optional) {
        console.warn(`[builders] ${builder.id} optional — ${builder.installHint ?? builder.docs}`);
      } else if (!r.ok) {
        ok = false;
      }
    }
  }
  return ok;
}

function actionVerify(manifest, filter) {
  let ok = true;
  for (const builder of selectBuilders(manifest, filter)) {
    if (!builder.verify) continue;
    console.log(`\n[builders] verify ${builder.id}`);
    const v = builder.verify;
    const r = runStep(v.cmd, v.args, v.cwd ?? ".");
    if (!r.ok) {
      if (builder.optional) {
        console.warn(`[builders] ${builder.id} skipped (optional)`);
      } else {
        ok = false;
      }
    }
  }
  return ok;
}

function actionBuild(manifest, filter) {
  let ok = true;
  for (const builder of selectBuilders(manifest, filter)) {
    if (!builder.build?.steps) continue;
    console.log(`\n[builders] build ${builder.id}`);
    mkdirSync(join(ROOT, ".cache/builders"), { recursive: true });
    for (const step of builder.build.steps) {
      if (step.target) {
        const target = builder.targets?.find((t) => t.id === step.target);
        if (!target) {
          console.error(`Unknown vite target: ${step.target}`);
          ok = false;
          continue;
        }
        const script = step.script ?? "build";
        const r = runStep("yarn", [script], target.cwd);
        if (!r.ok) ok = false;
        continue;
      }
      const r = runStep(step.cmd, step.args, step.cwd ?? ".");
      if (!r.ok) ok = false;
    }
  }
  return ok;
}

function actionDev(manifest, targetId) {
  const vite = getBuilder(manifest, "vite");
  const target = vite?.targets?.find((t) => t.id === targetId);
  if (!target) {
    console.error(`Unknown dev target: ${targetId}. Use: ${vite?.targets?.map((t) => t.id).join(", ")}`);
    process.exit(1);
  }
  const port = process.env[target.portEnv];
  const env = port ? { ...process.env, PORT: port } : process.env;
  console.log(`[builders] vite dev ${target.label} (${target.cwd})`);
  const devCmd = target.devScript ?? "dev";
  const result = shouldUseShellString("yarn")
    ? spawnSync(`yarn ${quoteForCmd(devCmd)}`, {
        cwd: resolve(ROOT, target.cwd),
        stdio: "inherit",
        shell: true,
        env,
      })
    : spawnSync("yarn", [devCmd], {
        cwd: resolve(ROOT, target.cwd),
        stdio: "inherit",
        shell: false,
        env,
      });
  process.exit(result.status ?? 0);
}

function doltCatalogStatus(builder) {
  const catalogPath = resolve(ROOT, builder.catalog.path);
  if (!existsSync(catalogPath)) {
    console.log(`[builders] dolt catalog path missing: ${builder.catalog.path}`);
    return true;
  }
  const hasDolt = runStep("dolt", ["version"], ROOT, { silent: true });
  if (!hasDolt.ok) {
    console.warn(`[builders] dolt not installed — ${builder.installHint}`);
    return true;
  }
  const status = runStep("dolt", ["status"], catalogPath, { silent: true });
  if (status.ok) {
    console.log(status.stdout || "[builders] dolt catalog repo present");
  } else {
    console.log(`[builders] dolt catalog not initialized — see ${builder.catalog.path}/README.md`);
  }
  return true;
}

function actionPipeline(manifest, pipelineId) {
  const steps = manifest.pipelines?.[pipelineId];
  if (!steps) {
    console.error(`Unknown pipeline: ${pipelineId}`);
    process.exit(1);
  }
  console.log(`[builders] pipeline ${pipelineId} (${steps.length} steps)`);
  let ok = true;
  for (const step of steps) {
    const [builderId, action] = step.split(":");
    if (action === "ensure" && !actionEnsure(manifest, builderId)) ok = false;
    if (action === "verify" && !actionVerify(manifest, builderId)) ok = false;
    if (action === "build" && !actionBuild(manifest, builderId)) ok = false;
    if (action === "catalog-status") {
      const b = getBuilder(manifest, builderId);
      if (b && !doltCatalogStatus(b)) ok = false;
    }
  }
  return ok;
}

function actionList(manifest) {
  console.log("ModMe builders:\n");
  for (const b of manifest.builders) {
    console.log(`  ${b.id.padEnd(6)} ${b.name}`);
    console.log(`         ${b.docs}`);
    if (b.targets) {
      for (const t of b.targets) {
        console.log(`         target: ${t.id} → ${t.cwd}`);
      }
    }
  }
  console.log("\nPipelines:");
  for (const [id, steps] of Object.entries(manifest.pipelines ?? {})) {
    console.log(`  ${id}: ${steps.join(" → ")}`);
  }
}

function main() {
  const manifest = loadManifest();
  const args = parseArgs(process.argv.slice(2));

  let ok = true;
  switch (args.action) {
    case "list":
      actionList(manifest);
      return;
    case "ensure":
      ok = actionEnsure(manifest, args.builder);
      break;
    case "verify":
      ok = actionVerify(manifest, args.builder);
      break;
    case "build":
      ok = actionBuild(manifest, args.builder);
      break;
    case "dev":
      actionDev(manifest, args.target ?? "vibe-web-app");
      return;
    case "pipeline":
      ok = actionPipeline(manifest, args.pipeline);
      break;
    case "dolt-status":
      ok = doltCatalogStatus(getBuilder(manifest, "dolt"));
      break;
    default:
      console.error(`Unknown action: ${args.action}`);
      process.exit(1);
  }

  if (!ok) {
    console.error("\nbuilders: FAIL");
    process.exit(1);
  }
  console.log("\nbuilders: OK");
}

main();
