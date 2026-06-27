#!/usr/bin/env node
/**
 * Monorepo toolchain audit — deterministic snapshot for Rush vs Turbo evaluations.
 * Rerun: node scripts/research/monorepo-tool-audit.mjs [--json|--md]
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

const STACKS = [
  {
    id: "root",
    path: ".",
    role: "orchestration",
    expectedPm: "yarn",
  },
  {
    id: "next-forge",
    path: "next-forge",
    role: "primary-apps",
    expectedPm: "bun",
  },
  {
    id: "generative-ui",
    path: "GenerativeUI_monorepo",
    role: "legacy-agent-stack",
    expectedPm: "yarn",
  },
];

function readJson(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8"));
  } catch {
    return null;
  }
}

function detectLockfiles(stackPath) {
  const names = ["bun.lock", "yarn.lock", "pnpm-lock.yaml", "package-lock.json"];
  return names.filter((n) => existsSync(join(ROOT, stackPath, n)));
}

function detectRush() {
  const rushJson = join(ROOT, "rush.json");
  const commonScripts = join(ROOT, "common/scripts/install-run-rush.js");
  return {
    hasRushJson: existsSync(rushJson),
    hasInstallRunRush: existsSync(commonScripts),
    hasCommonConfig: existsSync(join(ROOT, "common/config/rush")),
  };
}

function countWorkspacePackages(stackPath) {
  const pkgPath = join(ROOT, stackPath, "package.json");
  const pkg = readJson(join(stackPath, "package.json"));
  if (!pkg?.workspaces) return { declared: 0, onDisk: 0 };

  const patterns = Array.isArray(pkg.workspaces)
    ? pkg.workspaces
    : pkg.workspaces.packages ?? [];

  let onDisk = 0;
  for (const pattern of patterns) {
    const base = pattern.replace(/\/?\*+$/, "");
    const abs = join(ROOT, stackPath, base);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs)) {
      const p = join(abs, entry);
      if (statSync(p).isDirectory() && existsSync(join(p, "package.json"))) {
        onDisk += 1;
      }
    }
  }
  return { declared: patterns.length, onDisk };
}

function readTurbo(stackPath) {
  const turbo = readJson(join(stackPath, "turbo.json"));
  if (!turbo) return null;
  const tasks = turbo.tasks ?? turbo.pipeline ?? {};
  return {
    taskNames: Object.keys(tasks),
    hasRemoteCacheHints: Boolean(
      process.env.TURBO_TOKEN || process.env.TURBO_TEAM
    ),
    envMode: turbo.envMode ?? null,
  };
}

function readCiSignals() {
  const ciPath = join(ROOT, ".github/workflows/ci.yml");
  if (!existsSync(ciPath)) return { exists: false };
  const text = readFileSync(ciPath, "utf8");
  return {
    exists: true,
    pathFilters: /paths-filter|dorny\/paths-filter/.test(text),
    turboCache: /actions\/cache@v4[\s\S]*\.turbo|path:.*\.turbo/.test(text),
    turboRemoteEnv: /TURBO_API|TURBO_TOKEN/.test(text),
    setupBun: /setup-bun|oven-sh\/setup-bun/.test(text),
    installRunRush: /install-run-rush/.test(text),
  };
}

function scoreRushFit(audit) {
  const blockers = [];
  const warnings = [];

  if (audit.stacks.some((s) => s.lockfiles.includes("bun.lock"))) {
    blockers.push("Bun lockfile present — Rush has no bunVersion / bun install integration");
  }
  if (audit.stacks.filter((s) => s.lockfiles.length > 0).length > 1) {
    warnings.push(
      "Multiple independent lockfiles — Rush subspaces require pnpm; current model uses boundary rules"
    );
  }
  if (audit.stacks.filter((s) => s.turbo).length >= 2) {
    warnings.push("Multiple Turborepo roots — Rush would duplicate orchestration layer");
  }
  if (!audit.rush.hasRushJson) {
    warnings.push("No rush.json — adoption is greenfield migration (XL cost)");
  }
  const rootStack = audit.stacks.find((s) => s.id === "root");
  if (rootStack?.packageManager?.includes("yarn@3")) {
    warnings.push("Root Yarn 3 PnP can conflict with Bun/Storybook (run-forge-bun.ps1 workaround exists)");
  }

  const blockerCount = blockers.length;
  const recommendation =
    blockerCount >= 1
      ? "REJECT"
      : warnings.length >= 3
        ? "REVISE"
        : warnings.length >= 1
          ? "PARTIAL"
          : "ADOPT";

  return { recommendation, blockers, warnings };
}

function buildAudit() {
  const stacks = STACKS.map((stack) => {
    const pkg = readJson(join(stack.path, "package.json"));
    const lockfiles = detectLockfiles(stack.path);
    const workspaces = countWorkspacePackages(stack.path);
    const turbo = readTurbo(stack.path);
    return {
      id: stack.id,
      path: stack.path,
      role: stack.role,
      packageManager: pkg?.packageManager ?? null,
      lockfiles,
      workspaces,
      turbo,
      scripts: pkg?.scripts
        ? Object.keys(pkg.scripts).filter((k) =>
          /^(dev|build|test|check|verify)/.test(k)
        )
        : [],
    };
  });

  const rush = detectRush();
  const ci = readCiSignals();
  const esbuild = {
    rootConfig: existsSync(join(ROOT, "esbuild.config.mjs")),
    rootDevDep: Boolean(readJson("package.json")?.devDependencies?.esbuild),
  };

  const elysiaApp = existsSync(join(ROOT, "next-forge/apps/elysia/package.json"));
  const scoring = scoreRushFit({ stacks, rush });

  return {
    generatedAt: new Date().toISOString(),
    repoRoot: ROOT,
    stacks,
    rush,
    ci,
    esbuild,
    elysiaApp,
    scoring,
    highRoiAlternatives: [
      "Enable Turbo remote cache (Vercel or self-hosted S3) on next-forge CI",
      "Add GHA actions/cache for .turbo in GenerativeUI job",
      "Keep dual-stack boundary rules; do not unify lockfiles via Rush subspaces",
      "Optional Nix flake for toolchain pins (complements, does not replace, Turbo)",
    ],
  };
}

function toMarkdown(audit) {
  const lines = [
    `# Monorepo toolchain audit`,
    ``,
    `Generated: ${audit.generatedAt}`,
    ``,
    `> Rerun: \`node scripts/research/monorepo-tool-audit.mjs --md\``,
    ``,
    `## Rush fit score: **${audit.scoring.recommendation}**`,
    ``,
  ];

  if (audit.scoring.blockers.length) {
    lines.push(`### Blockers`, ``);
    for (const b of audit.scoring.blockers) lines.push(`- ${b}`);
    lines.push(``);
  }
  if (audit.scoring.warnings.length) {
    lines.push(`### Warnings`, ``);
    for (const w of audit.scoring.warnings) lines.push(`- ${w}`);
    lines.push(``);
  }

  lines.push(`## Stacks`, ``);
  lines.push(`| Stack | PM | Lockfiles | Turbo tasks | Workspaces |`);
  lines.push(`|-------|-----|-----------|-------------|------------|`);
  for (const s of audit.stacks) {
    lines.push(
      `| ${s.id} | ${s.packageManager ?? "—"} | ${s.lockfiles.join(", ") || "—"} | ${s.turbo?.taskNames?.join(", ") ?? "—"} | ${s.workspaces.onDisk} pkgs |`
    );
  }
  lines.push(``);

  lines.push(`## Rush presence`, ``);
  lines.push(`- rush.json: ${audit.rush.hasRushJson}`);
  lines.push(`- install-run-rush.js: ${audit.rush.hasInstallRunRush}`);
  lines.push(`- common/config/rush: ${audit.rush.hasCommonConfig}`);
  lines.push(``);

  lines.push(`## CI signals`, ``);
  for (const [k, v] of Object.entries(audit.ci)) {
    if (k === "exists") continue;
    lines.push(`- ${k}: ${v}`);
  }
  lines.push(``);

  lines.push(`## Higher-ROI alternatives (vs Rush migration)`, ``);
  for (const alt of audit.highRoiAlternatives) lines.push(`- ${alt}`);
  lines.push(``);

  return lines.join("\n");
}

const args = process.argv.slice(2);
const audit = buildAudit();

if (args.includes("--json")) {
  console.log(JSON.stringify(audit, null, 2));
} else if (args.includes("--md")) {
  console.log(toMarkdown(audit));
} else {
  console.log(toMarkdown(audit));
  console.log("\n---\nJSON: node scripts/research/monorepo-tool-audit.mjs --json");
}
