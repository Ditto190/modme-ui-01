/**
 * Path profile resolution for control-cli orchestration bootstrap.
 * Defensive path confinement — rejects escapes outside repo root.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

/** @typedef {{ id: string, detect: { under?: string, notUnder?: string }, requirePaths: string[], allowPrefixes: string[] }} PathProfile */
/** @typedef {{ id: string, when: Record<string, string>, severity: 'error'|'warn'|'info', message: string, remediation: string[] }} DecisionTreeNode */
/** @typedef {{ id: string, severity: string, message: string, remediation: string[] }} PathProfileFinding */
/** @typedef {{ version: number, cacheRelative: string, profiles: Record<string, PathProfile>, decisionTree: DecisionTreeNode[] }} PathProfilesConfig */

const REPO_MARKERS = ["scripts/control-cli-harness.mjs", "package.json"];

/**
 * @param {string} cwd
 * @returns {string | null}
 */
export function resolveRepoRoot(cwd) {
  let current = resolve(cwd);
  const fsRoot = resolve(current.split(sep)[0] + sep);

  while (true) {
    const hasPackage = existsSync(resolve(current, "package.json"));
    const hasHarness = existsSync(resolve(current, "scripts/control-cli-harness.mjs"));
    if (hasPackage && hasHarness) {
      return current;
    }
    if (current === fsRoot) {
      return null;
    }
    const parent = resolve(current, "..");
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

/**
 * @param {string} root
 * @param {string} relativeOrAbs
 * @returns {{ ok: true, path: string, relative: string } | { ok: false, error: string }}
 */
export function canonicalizeUnderRoot(root, relativeOrAbs) {
  const normalizedRoot = resolve(root);
  const candidate = isAbsolute(relativeOrAbs)
    ? resolve(relativeOrAbs)
    : resolve(normalizedRoot, relativeOrAbs);

  if (!isUnderRoot(normalizedRoot, candidate)) {
    return { ok: false, error: "path escapes repo root" };
  }

  const rel = relative(normalizedRoot, candidate).replace(/\\/g, "/");
  return { ok: true, path: candidate, relative: rel || "." };
}

/**
 * @param {string} root
 * @param {Record<string, PathProfile>} profiles
 * @returns {PathProfile | null}
 */
export function detectProfile(root, profiles) {
  const normalized = resolve(root).replace(/\\/g, "/");
  const entries = Object.values(profiles);

  for (const profile of entries) {
    if (profile.detect?.under) {
      const needle = profile.detect.under.replace(/\\/g, "/");
      if (normalized.includes(needle)) {
        return profile;
      }
    }
  }

  for (const profile of entries) {
    if (profile.detect?.notUnder) {
      const needle = profile.detect.notUnder.replace(/\\/g, "/");
      if (!normalized.includes(needle)) {
        return profile;
      }
    }
  }

  return entries[0] ?? null;
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function hasCommandOnPath(name) {
  const which = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(which, [name], { encoding: "utf8", shell: true });
  return result.status === 0;
}

/**
 * @param {string} root
 * @param {PathProfile | null} profile
 * @param {DecisionTreeNode[]} tree
 * @param {{ commandCache?: Map<string, boolean> }} [options]
 * @returns {PathProfileFinding[]}
 */
export function evaluateDecisionTree(root, profile, tree, options = {}) {
  /** @type {PathProfileFinding[]} */
  const findings = [];
  const commandCache = options.commandCache ?? new Map();

  for (const node of tree) {
    const when = node.when ?? {};
    if (when.profile && profile?.id !== when.profile) {
      continue;
    }

    if (when.missing) {
      const canon = canonicalizeUnderRoot(root, when.missing);
      if (!canon.ok || !existsSync(canon.path)) {
        findings.push({
          id: node.id,
          severity: node.severity,
          message: node.message,
          remediation: node.remediation ?? [],
        });
      }
      continue;
    }

    if (when.commandMissing) {
      const cmd = when.commandMissing;
      if (!commandCache.has(cmd)) {
        commandCache.set(cmd, hasCommandOnPath(cmd));
      }
      if (!commandCache.get(cmd)) {
        findings.push({
          id: node.id,
          severity: node.severity,
          message: node.message,
          remediation: node.remediation ?? [],
        });
      }
    }
  }

  return findings;
}

/**
 * @param {string} root
 * @param {PathProfile | null} profile
 * @returns {Record<string, string>}
 */
export function resolveRequiredPaths(root, profile) {
  /** @type {Record<string, string>} */
  const paths = {};
  if (!profile) {
    return paths;
  }

  for (const rel of profile.requirePaths) {
    const canon = canonicalizeUnderRoot(root, rel);
    if (canon.ok) {
      paths[rel] = canon.path;
    }
  }
  return paths;
}

/**
 * @param {string} root
 * @param {string} relativePath
 * @param {string[]} allowPrefixes
 * @returns {boolean}
 */
export function isPathAllowed(root, relativePath, allowPrefixes) {
  const canon = canonicalizeUnderRoot(root, relativePath);
  if (!canon.ok) {
    return false;
  }
  const rel = canon.relative === "." ? "" : `${canon.relative}/`;
  return allowPrefixes.some((prefix) => {
    const normalized = prefix.replace(/\\/g, "/");
    return rel === normalized.slice(0, -1) || rel.startsWith(normalized);
  });
}

/**
 * @param {string} root
 * @param {object} payload
 * @param {string} cacheRelative
 * @returns {{ ok: true, cachePath: string } | { ok: false, error: string }}
 */
export function writeResolvedCache(root, payload, cacheRelative) {
  const canon = canonicalizeUnderRoot(root, cacheRelative);
  if (!canon.ok) {
    return { ok: false, error: canon.error };
  }

  mkdirSync(dirname(canon.path), { recursive: true });
  writeFileSync(canon.path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { ok: true, cachePath: canon.path };
}

/**
 * @param {string} root
 * @param {string} candidate
 * @returns {boolean}
 */
function isUnderRoot(root, candidate) {
  const normalizedRoot = resolve(root);
  const normalizedCandidate = resolve(candidate);

  if (process.platform === "win32") {
    const rootLower = normalizedRoot.toLowerCase();
    const candidateLower = normalizedCandidate.toLowerCase();
    return (
      candidateLower === rootLower
      || candidateLower.startsWith(`${rootLower}${sep}`)
    );
  }

  const rel = relative(normalizedRoot, normalizedCandidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

export { REPO_MARKERS };
