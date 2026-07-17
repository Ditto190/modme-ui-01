#!/usr/bin/env node
/**
 * Lightweight polis-style router: match issue/MR context → agent citizen card(s).
 * GitLab multi-approval parity: routeContracts returns all matches; routeContract is best-score.
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { classifyChangedStacks } from "./path-filter.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CITIZENS_DIR = resolve(__dirname, "../../data/agent-citizens");

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
    const doc = yaml.load(raw);
    return doc && typeof doc === "object" ? /** @type {Record<string, unknown>} */ (doc) : {};
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

  /** @type {boolean[]} */
  const soft = [];

  if (t.labels_all && Array.isArray(t.labels_all) && t.labels_all.length > 0) {
    soft.push(t.labels_all.every((l) => labels.includes(String(l))));
  }
  if (t.labels_any && Array.isArray(t.labels_any) && t.labels_any.length > 0) {
    soft.push(t.labels_any.some((l) => labels.includes(String(l))));
  }
  if (t.paths_any && Array.isArray(t.paths_any) && t.paths_any.length > 0) {
    const prefixes = t.paths_any.map((p) => String(p).replace(/\*\*$/, "").replace(/\*$/, ""));
    soft.push(
      paths.some((f) => prefixes.some((p) => f === p.replace(/\/$/, "") || f.startsWith(p)))
    );
  }

  if (soft.length > 0 && !soft.some(Boolean)) return false;

  if (t.self_heal === "Yes" && ctx.selfHeal !== "Yes") return false;
  if (t.pipeline === "success" && !ctx.pipelineSuccess) return false;
  if (t.beads_ready && !ctx.beadsId) return false;

  if (soft.length === 0 && t.self_heal !== "Yes" && t.pipeline !== "success" && !t.beads_ready) {
    return false;
  }

  return true;
}

/**
 * @param {Record<string, unknown>} citizen
 * @param {{ forge?: boolean, generative?: boolean, orchestration?: boolean }} stacks
 */
function buildRoute(citizen, stacks) {
  const ao = /** @type {Record<string, unknown>} */ (citizen.acceptance_orchestrator ?? {});
  const verifyMap = /** @type {Record<string, string>} */ (
    ao.verify_commands &&
    typeof ao.verify_commands === "object" &&
    !Array.isArray(ao.verify_commands)
      ? ao.verify_commands
      : {}
  );
  /** @type {string[]} */
  const verifyCommands = [];
  if (stacks.forge && verifyMap.forge) verifyCommands.push(verifyMap.forge);
  if (stacks.generative && verifyMap.generative) {
    verifyCommands.push(verifyMap.generative);
  }
  if (stacks.orchestration && verifyMap.orchestration) {
    verifyCommands.push(verifyMap.orchestration);
  }
  if (verifyCommands.length === 0) {
    if (verifyMap.orchestration) verifyCommands.push(verifyMap.orchestration);
    else if (verifyMap.forge) verifyCommands.push(verifyMap.forge);
    else if (verifyMap.generative) verifyCommands.push(verifyMap.generative);
    else verifyCommands.push("yarn pre-commit:check");
  }

  const gl = /** @type {Record<string, string>} */ (citizen.gitlab ?? {});
  const maxRoundsRaw = ao.max_rounds;
  const maxRounds =
    typeof maxRoundsRaw === "number"
      ? maxRoundsRaw
      : Number.parseInt(String(maxRoundsRaw ?? "2"), 10) || 2;

  return {
    citizenId: String(citizen.id),
    skills: Array.isArray(citizen.skills) ? citizen.skills.map(String) : [],
    verifyCommands,
    gitlabFlow: gl.duo_flow || null,
    escalate: false,
    maxRounds,
  };
}

/**
 * Score a matching citizen for ranking (higher wins for routeContract).
 * @param {Record<string, unknown>} citizen
 * @param {{ labels?: string[], changedPaths?: string[], beadsId?: string, selfHeal?: string, pipelineSuccess?: boolean }} ctx
 * @param {{ forge?: boolean, generative?: boolean, orchestration?: boolean }} stacks
 */
function scoreCitizen(citizen, ctx, stacks) {
  const id = String(citizen.id ?? "");
  let score = 1;
  if (ctx.selfHeal === "Yes" && id === "devops-ci-champion") score += 10;
  if (stacks.forge && id === "forge-reviewer") score += 5;
  if (stacks.generative && id === "generative-reviewer") score += 5;
  if (ctx.beadsId && id === "beads-orchestrator") score += 5;
  if (ctx.pipelineSuccess && id === "bugbot-merge-champion") score += 3;
  if (
    (ctx.labels ?? []).includes(
      `review:${id
        .replace(/-reviewer$/, "")
        .replace(/^bugbot-/, "")
        .replace(/-champion$/, "")}`
    )
  ) {
    score += 2;
  }
  if ((ctx.labels ?? []).some((l) => l.startsWith("review:")) && id.includes("reviewer")) {
    score += 1;
  }
  return score;
}

/**
 * All matching citizens (GitLab multi-approval-rule parity).
 * @param {{ labels?: string[], changedPaths?: string[], beadsId?: string, selfHeal?: string, pipelineSuccess?: boolean }} ctx
 */
export function routeContracts(ctx = {}) {
  const citizens = loadCitizens();
  const stacks = classifyChangedStacks(ctx.changedPaths ?? []);

  /** @type {{ route: ReturnType<typeof buildRoute>, score: number }[]} */
  const scored = [];

  for (const citizen of citizens) {
    if (!matchesTriggers(citizen.triggers, ctx)) continue;
    const score = scoreCitizen(citizen, ctx, stacks);
    scored.push({ route: buildRoute(citizen, stacks), score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => ({ ...s.route, score: s.score }));
}

/**
 * Best-score citizen (session start / single winner).
 * @param {{ labels?: string[], changedPaths?: string[], beadsId?: string, selfHeal?: string, pipelineSuccess?: boolean }} ctx
 */
export function routeContract(ctx = {}) {
  const all = routeContracts(ctx);
  if (all.length === 0) {
    return {
      citizenId: null,
      skills: [],
      verifyCommands: [],
      gitlabFlow: null,
      escalate: false,
    };
  }
  const { score: _score, ...winner } = all[0];
  return winner;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  const labels = process.argv.includes("--labels")
    ? process.argv[process.argv.indexOf("--labels") + 1]?.split(",")
    : [];
  const selfHeal = process.argv.includes("--self-heal") ? "Yes" : undefined;
  const multi = process.argv.includes("--all");
  const result = multi ? routeContracts({ labels, selfHeal }) : routeContract({ labels, selfHeal });
  console.log(JSON.stringify(result, null, 2));
}
