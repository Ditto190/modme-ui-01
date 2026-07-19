/**
 * KM pipeline observability metrics (v1) — JSON artifact for capture/lifecycle/doc health.
 * @see docs/evaluation/OBSERVABILITY-AGENTS.md
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const REPORT_DIR = resolve(ROOT, "docs/inbox-pipeline/reports");
const METRICS_PATH = resolve(REPORT_DIR, "km-metrics-latest.json");

const DEFAULT_STATE = {
  version: "1.0",
  updated_at: null,
  capture_compliance: { valid_drops: 0, invalid_drops: 0 },
  beads_lifecycle: { created: 0, claimed: 0, closed: 0, blocked: 0, orphaned: 0 },
  intake_run_links: [],
  doc_freshness: {
    km_entry_points: [
      "docs/KNOWLEDGE_QUICKSTART.md",
      "docs/KNOWLEDGE_MANAGEMENT.md",
      "docs/inbox-pipeline/README.md",
      "docs/beads-workflow.md",
    ],
    last_rewrite: "2026-07-11",
  },
  events: [],
};

function loadState() {
  if (!existsSync(METRICS_PATH)) {
    return structuredClone(DEFAULT_STATE);
  }
  try {
    return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(readFileSync(METRICS_PATH, "utf8")) };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState(state) {
  mkdirSync(REPORT_DIR, { recursive: true });
  state.updated_at = new Date().toISOString();
  writeFileSync(METRICS_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [data]
 */
export function recordKmMetric(event, data = {}) {
  const state = loadState();
  state.events.push({ at: new Date().toISOString(), event, ...data });
  if (state.events.length > 500) {
    state.events = state.events.slice(-500);
  }

  switch (event) {
    case "capture_valid":
      state.capture_compliance.valid_drops += 1;
      break;
    case "capture_invalid":
      state.capture_compliance.invalid_drops += 1;
      break;
    case "beads_create":
      state.beads_lifecycle.created += 1;
      break;
    case "beads_claim":
      state.beads_lifecycle.claimed += 1;
      break;
    case "beads_close":
      state.beads_lifecycle.closed += 1;
      break;
    case "beads_blocked":
      state.beads_lifecycle.blocked += 1;
      break;
    case "beads_orphan":
      state.beads_lifecycle.orphaned += 1;
      break;
    case "intake_run_link":
      state.intake_run_links.push({
        at: new Date().toISOString(),
        beads_id: data.beads_id ?? null,
        pipeline_run_id: data.pipeline_run_id ?? null,
        mode: data.mode ?? null,
      });
      if (state.intake_run_links.length > 100) {
        state.intake_run_links = state.intake_run_links.slice(-100);
      }
      break;
    default:
      break;
  }

  saveState(state);
  return state;
}

export function getKmMetricsPath() {
  return METRICS_PATH;
}

export function readKmMetrics() {
  return loadState();
}
