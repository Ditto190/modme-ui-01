#!/usr/bin/env node
/**
 * Lightweight polis-style router: match issue/MR context → agent citizen card.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyChangedStacks } from "./path-filter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CITIZENS_DIR = resolve(__dirname, "../../data/agent-citizens");

/**
 * Minimal YAML parse for citizen cards (no dependency).
 * @param {string} raw
 */
function parseSimpleYaml(raw) {
  /** @type {Record<string, unknown>} */
  const root = {};
  /** @type {Record<string, unknown> | unknown[]} */
  let current = root;
  /** @type {string[]} */
  const keyStack = [];
  /** @type {string | null} */
  let listKey = null;

  for (const line of raw.split(/\r?\n/)) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && listKey && typeof current === "object" && current !== null && !Array.isArray(current)) {
      const arr = /** @type {unknown[]} */ (current[listKey] ?? (current[listKey] = []));
      arr.push(listItem[1].replace(/^['"]|['"]$/g, ""));
      continue;
    }
    const kv = line.match(/^(\s*)([a-z0-9_]+):\s*(.*)$/i);
    if (!kv) continue;
    const indent = kv[1].length;
    const key = kv[2];
    const val = kv[3].trim();

    if (indent === 0) {
      current = root;
      listKey = null;
      if (val === "") {
        root[key] = {};
        current = /** @type {Record<string, unknown>} */ (root[key]);
        keyStack.length = 0;
        keyStack.push(key);
      } else {
        root[key] = val.replace(/^['"]|['"]$/g, "");
      }
      continue;
    }

    if (val === "") {
      listKey = key;
      if (typeof current === "object" && current !== null && !Array.isArray(current)) {
        current[key] = [];
      }
    } else if (typeof current === "object" && current !== null && !Array.isArray(current)) {
      current[key] = val.replace(/^['"]|['"]$/g, "");
      listKey = null;
    }
  }
  return root;
}

/**
 * @returns {Record<string, unknown>[]}
 */
export function loadCitizens() {
  let files;
  try {
    files = readdirSync(CITIZENS_DIR).filter((f) => f.endsWith(".yaml"));
  } catch {
    return [];
  }
  return files.map((f) => {
    const raw = readFileSync(resolve(CITIZENS_DIR, f), "utf8");
    return parseSimpleYaml(raw);
  });
}

/**
 * @param {unknown} triggers
 * @param {{ labels?: string[], changedPaths?: string[], beadsId?: string, selfHeal?: string, pipelineSuccess?: boolean }} ctx
 */
function matchesTriggers(triggers, ctx) {
  if (!triggers || typeof triggers !== "object") return false;
  const t = /** @type {Record<string, unknown>} */ (triggers);
  const labels = ctx.labels ?? [];
  const paths = ctx.changedPaths ?? [];

  if (t.labels_all && Array.isArray(t.labels_all)) {
    if (!t.labels_all.every((l) => labels.includes(String(l)))) return false;
  }
  if (t.labels_any && Array.isArray(t.labels_any)) {
    if (!t.labels_any.some((l) => labels.includes(String(l)))) return false;
  }
  if (t.paths_any && Array.isArray(t.paths_any)) {
    const prefixes = t.paths_any.map((p) => String(p).replace(/\*\*$/, ""));
    if (!paths.some((f) => prefixes.some((p) => f.startsWith(p)))) return false;
  }
  if (t.self_heal === "Yes" && ctx.selfHeal !== "Yes") return false;
  if (t.pipeline === "success" && !ctx.pipelineSuccess) return false;
  if (t.beads_ready && !ctx.beadsId) return false;
  return true;
}

/**
 * @param {{ labels?: string[], changedPaths?: string[], beadsId?: string, selfHeal?: string, pipelineSuccess?: boolean }} ctx
 */
export function routeContract(ctx = {}) {
  const citizens = loadCitizens();
  const stacks = classifyChangedStacks(ctx.changedPaths ?? []);

  /** @type {{ citizen: Record<string, unknown>, score: number }[]} */
  const scored = [];

  for (const citizen of citizens) {
    const id = String(citizen.id ?? "");
    const triggers = citizen.triggers;
    if (!matchesTriggers(triggers, ctx)) continue;
    let score = 1;
    if (ctx.selfHeal === "Yes" && id === "devops-ci-champion") score += 10;
    if (stacks.forge && id === "forge-reviewer") score += 5;
    if (stacks.generative && id === "generative-reviewer") score += 5;
    if (ctx.beadsId && id === "beads-orchestrator") score += 5;
    if (ctx.pipelineSuccess && id === "bugbot-merge-champion") score += 3;
    scored.push({ citizen, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0]?.citizen;

  if (!winner) {
    return {
      citizenId: null,
      skills: [],
      verifyCommands: [],
      gitlabFlow: null,
      escalate: false,
    };
  }

  const ao = /** @type {Record<string, unknown>} */ (winner.acceptance_orchestrator ?? {});
  const verifyMap = /** @type {Record<string, string>} */ (ao.verify_commands ?? {});
  /** @type {string[]} */
  const verifyCommands = [];
  if (stacks.forge && verifyMap.forge) verifyCommands.push(verifyMap.forge);
  if (stacks.generative && verifyMap.generative) verifyCommands.push(verifyMap.generative);
  if (stacks.orchestration && verifyMap.orchestration) verifyCommands.push(verifyMap.orchestration);
  if (verifyCommands.length === 0) {
    verifyCommands.push("yarn pre-commit:check");
  }

  const gl = /** @type {Record<string, string>} */ (winner.gitlab ?? {});

  return {
    citizenId: String(winner.id),
    skills: Array.isArray(winner.skills) ? winner.skills.map(String) : [],
    verifyCommands,
    gitlabFlow: gl.duo_flow ?? null,
    escalate: false,
    maxRounds: typeof ao.max_rounds === "number" ? ao.max_rounds : 2,
  };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const labels = process.argv.includes("--labels")
    ? process.argv[process.argv.indexOf("--labels") + 1]?.split(",")
    : [];
  const selfHeal = process.argv.includes("--self-heal") ? "Yes" : undefined;
  const result = routeContract({ labels, selfHeal });
  console.log(JSON.stringify(result, null, 2));
}
