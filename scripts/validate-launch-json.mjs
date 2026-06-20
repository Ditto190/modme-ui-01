#!/usr/bin/env node
/**
 * Validates .vscode/launch.json against scripts/launch-manifest.json.
 * Usage: node scripts/validate-launch-json.mjs [--require-manifest-sync]
 *
 * --require-manifest-sync  Fail when launch.json drifts from the manifest
 *                          (required app names, tasks, compounds, paths).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const LAUNCH_JSON = join(ROOT, ".vscode", "launch.json");
const TASKS_JSON = join(ROOT, ".vscode", "tasks.json");
const MANIFEST = join(ROOT, "scripts", "launch-manifest.json");

function fail(message) {
  console.error(`launch-json-check: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`launch-json-check: ${message}`);
}

function parseJson(path, label) {
  if (!existsSync(path)) {
    fail(`${label} not found at ${path}`);
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
  }
}

function stripVars(value) {
  return value
    .replaceAll("${workspaceFolder}", ROOT)
    .replaceAll("${workspaceRoot}", ROOT)
    .replaceAll("\\", "/");
}

function assertPathExists(relativeOrAbsolute, context) {
  const normalized = stripVars(relativeOrAbsolute).replaceAll("${file}", "placeholder");
  if (normalized.includes("${")) {
    return;
  }
  const absolute = normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)
    ? normalized
    : join(ROOT, normalized);
  if (!existsSync(absolute)) {
    const isOptionalArtifact =
      /[/\\]dist[/\\]/.test(normalized) || /[/\\]node_modules[/\\]/.test(normalized);
    if (isOptionalArtifact) {
      console.warn(
        `launch-json-check: warning — build output not present yet for ${context}: ${relativeOrAbsolute}`,
      );
      return;
    }
    fail(`Missing path for ${context}: ${relativeOrAbsolute}`);
  }
}

const launch = parseJson(LAUNCH_JSON, "launch.json");
const manifest = parseJson(MANIFEST, "launch-manifest.json");
const tasks = existsSync(TASKS_JSON) ? parseJson(TASKS_JSON, "tasks.json") : { tasks: [] };

if (launch.version !== "0.2.0") {
  fail(`launch.json version must be "0.2.0" (got ${JSON.stringify(launch.version)})`);
}

const configurations = launch.configurations ?? [];
const compounds = launch.compounds ?? [];

if (configurations.length === 0) {
  fail("launch.json must define at least one configuration");
}

const names = new Set();
for (const config of configurations) {
  if (!config.name) {
    fail("Every launch configuration must have a name");
  }
  if (names.has(config.name)) {
    fail(`Duplicate launch configuration name: ${config.name}`);
  }
  names.add(config.name);

  if (config.cwd) {
    assertPathExists(config.cwd, `configuration "${config.name}" cwd`);
  }
  if (config.program && !/\$\{[^}]+\}/.test(config.program)) {
    assertPathExists(config.program, `configuration "${config.name}" program`);
  }
  if (config.preLaunchTask) {
    const taskLabels = new Set((tasks.tasks ?? []).map((task) => task.label));
    if (!taskLabels.has(config.preLaunchTask)) {
      fail(
        `Configuration "${config.name}" references missing preLaunchTask "${config.preLaunchTask}"`,
      );
    }
  }
}

for (const compound of compounds) {
  if (!compound.name) {
    fail("Every compound must have a name");
  }
  for (const configName of compound.configurations ?? []) {
    if (!names.has(configName)) {
      fail(`Compound "${compound.name}" references unknown configuration "${configName}"`);
    }
  }
}

const requireManifestSync = process.argv.includes("--require-manifest-sync");
if (requireManifestSync) {
  for (const requiredName of manifest.requiredLaunchNames ?? []) {
    if (!names.has(requiredName)) {
      fail(`Missing required launch configuration from manifest: ${requiredName}`);
    }
  }

  for (const app of manifest.apps ?? []) {
    if (app.packageJson) {
      assertPathExists(app.packageJson, `manifest app "${app.id}" packageJson`);
    }
    if (app.entry) {
      assertPathExists(app.entry, `manifest app "${app.id}" entry`);
    }
    assertPathExists(app.cwd, `manifest app "${app.id}" cwd`);

    const matchingConfig = configurations.find((config) => config.name === app.name);
    if (matchingConfig?.cwd && !stripVars(matchingConfig.cwd).endsWith(app.cwd.replaceAll("\\", "/"))) {
      fail(
        `Configuration "${app.name}" cwd does not match manifest cwd "${app.cwd}"`,
      );
    }

    if (app.port && matchingConfig) {
      const envPort = matchingConfig.env?.PORT ?? matchingConfig.env?.port;
      const argsPort = Array.isArray(matchingConfig.args)
        ? matchingConfig.args[matchingConfig.args.indexOf("--port") + 1]
        : undefined;
      const configuredPort = envPort ?? argsPort;
      if (configuredPort && String(configuredPort) !== String(app.port)) {
        fail(
          `Configuration "${app.name}" port ${configuredPort} does not match manifest port ${app.port}`,
        );
      }
    }
  }

  const taskLabels = new Set((tasks.tasks ?? []).map((task) => task.label));
  for (const requiredTask of manifest.requiredTasks ?? []) {
    if (!taskLabels.has(requiredTask)) {
      fail(`Missing required task from manifest: ${requiredTask}`);
    }
  }

  const compoundNames = new Set(compounds.map((compound) => compound.name));
  for (const requiredCompound of manifest.requiredCompounds ?? []) {
    if (!compoundNames.has(requiredCompound)) {
      fail(`Missing required compound from manifest: ${requiredCompound}`);
    }
  }
}

ok(
  `Validated ${configurations.length} configurations, ${compounds.length} compounds` +
    (requireManifestSync ? " (manifest sync enforced)" : ""),
);
