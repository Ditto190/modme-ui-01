#!/usr/bin/env node
/**
 * Match changed paths against .github/agent-codeowners.yml → review roles.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG = resolve(__dirname, "../../.github/agent-codeowners.yml");

/**
 * @param {string} pattern
 * @param {string} filePath
 */
export function matchGlob(pattern, filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const pat = pattern.replace(/\\/g, "/");

  if (pat.startsWith("**/")) {
    const rest = pat.slice(3);
    if (rest.endsWith("/**")) {
      const mid = rest.slice(0, -3);
      return normalized.includes(`/${mid}/`) || normalized.startsWith(`${mid}/`);
    }
    if (rest.includes("*")) {
      const re = new RegExp(`^(.*/)?${rest.replace(/\./g, "\\.").replace(/\*/g, "[^/]*")}$`);
      return re.test(normalized);
    }
    return (
      normalized === rest ||
      normalized.endsWith(`/${rest}`) ||
      normalized.includes(`/${rest}/`) ||
      normalized.startsWith(`${rest}/`)
    );
  }

  if (pat.endsWith("/**")) {
    const prefix = pat.slice(0, -3);
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  }

  if (pat.includes("*")) {
    const re = new RegExp(
      `^${pat.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*")}$`
    );
    return re.test(normalized);
  }

  return normalized === pat || normalized.startsWith(`${pat}/`);
}

/**
 * @param {string} [configPath]
 */
export function loadAgentCodeowners(configPath = DEFAULT_CONFIG) {
  const raw = readFileSync(configPath, "utf8");
  const doc = /** @type {Record<string, unknown>} */ (yaml.load(raw));
  if (!doc || typeof doc !== "object" || !doc.roles) {
    throw new Error(`Invalid agent-codeowners config: ${configPath}`);
  }
  return doc;
}

/**
 * @param {string[]} changedPaths
 * @param {string} [configPath]
 * @returns {{
 *   roles: string[],
 *   labels: string[],
 *   checks: { role: string, check: string, required: boolean, citizen: string }[],
 *   requiredChecks: string[],
 * }}
 */
export function matchRoles(changedPaths, configPath = DEFAULT_CONFIG) {
  const doc = loadAgentCodeowners(configPath);
  const rolesMap = /** @type {Record<string, Record<string, unknown>>} */ (doc.roles);
  const paths = (changedPaths ?? []).map((p) => p.replace(/\\/g, "/"));

  /** @type {string[]} */
  const matched = [];
  /** @type {{ role: string, check: string, required: boolean, citizen: string }[]} */
  const checks = [];

  for (const [roleId, cfg] of Object.entries(rolesMap)) {
    const always = cfg.always === true;
    const globs = Array.isArray(cfg.paths) ? cfg.paths.map(String) : [];
    const hits =
      always || (globs.length > 0 && paths.some((file) => globs.some((g) => matchGlob(g, file))));

    if (!hits) continue;
    // `merge` with always:true is added only when at least one other role matched
    if (always && roleId === "merge") continue;

    matched.push(roleId);
    checks.push({
      role: roleId,
      check: String(cfg.check ?? `modme/agent-${roleId}`),
      required: cfg.required !== false,
      citizen: String(cfg.citizen ?? ""),
    });
  }

  if (matched.length > 0 && rolesMap.merge) {
    const mergeCfg = rolesMap.merge;
    if (!matched.includes("merge")) {
      matched.push("merge");
      checks.push({
        role: "merge",
        check: String(mergeCfg.check ?? "modme/agent-merge"),
        required: mergeCfg.required !== false,
        citizen: String(mergeCfg.citizen ?? "bugbot-merge-champion"),
      });
    }
  }

  const labels = matched.map((id) => {
    const cfg = rolesMap[id];
    return String(cfg?.label ?? `review:${id}`);
  });

  const requiredChecks = checks.filter((c) => c.required).map((c) => c.check);
  const allIds = Object.keys(rolesMap);
  const unmatchedRequired = allIds.filter((id) => {
    if (matched.includes(id)) return false;
    const cfg = rolesMap[id];
    return cfg?.required !== false && id !== "merge";
  });
  // When nothing matched, also skip-success merge so rulesets stay green
  if (matched.length === 0 && rolesMap.merge?.required !== false) {
    unmatchedRequired.push("merge");
  }

  return {
    roles: matched,
    labels,
    checks,
    requiredChecks,
    unmatchedRequired,
    allRoles: allIds,
  };
}

/**
 * Roles that should publish skip-success when not matched (for ruleset stability).
 * @param {string} [configPath]
 */
export function allRoleIds(configPath = DEFAULT_CONFIG) {
  const doc = loadAgentCodeowners(configPath);
  return Object.keys(/** @type {object} */ (doc.roles));
}

function parseCliPaths(argv) {
  const fileIdx = argv.indexOf("--paths-file");
  if (fileIdx >= 0 && argv[fileIdx + 1]) {
    const raw = readFileSync(argv[fileIdx + 1], "utf8");
    return raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const idx = argv.indexOf("--paths");
  if (idx >= 0 && argv[idx + 1]) {
    return argv[idx + 1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const fromEnv = process.env.CHANGED_PATHS;
  if (fromEnv) {
    return fromEnv
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function main() {
  const argv = process.argv.slice(2);
  const paths = parseCliPaths(argv);
  const result = matchRoles(paths);
  const formatJson = argv.includes("--format") && argv[argv.indexOf("--format") + 1] === "json";

  if (argv.includes("--github-output")) {
    const roles = result.roles.length > 0 ? result.roles : ["__none__"];
    console.log(`roles=${JSON.stringify(roles)}`);
    console.log(`roles_empty=${result.roles.length === 0}`);
    console.log(`labels=${result.labels.join(",")}`);
    console.log(`required_checks=${result.requiredChecks.join(",")}`);
    console.log(`unmatched_required=${JSON.stringify(result.unmatchedRequired)}`);
    return;
  }

  if (formatJson || argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(JSON.stringify(result));
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, "/") ===
    resolve(process.argv[1]).replace(/\\/g, "/");

if (isMain) {
  main();
}
