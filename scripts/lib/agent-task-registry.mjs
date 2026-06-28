/**
 * Lightweight task registry for multi-agent duplicate detection and path claims.
 * Persists to data/agent-registry.json (gitignored).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DATA_DIR = resolve(ROOT, "data");
const REGISTRY_PATH = resolve(DATA_DIR, "agent-registry.json");

const DEFAULT_STATE = { tasks: [], claims: [], agents: [] };

function loadState() {
  if (!existsSync(REGISTRY_PATH)) {
    return structuredClone(DEFAULT_STATE);
  }
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState(state) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(REGISTRY_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function similarity(a, b) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) {
    if (tb.has(t)) overlap += 1;
  }
  return overlap / Math.max(ta.size, tb.size);
}

export function findDuplicateTask(description, { threshold = 0.55 } = {}) {
  const state = loadState();
  const active = state.tasks.filter((t) => ["pending", "in_progress"].includes(t.status));
  for (const task of active) {
    const ratio = similarity(description, task.description);
    if (ratio >= threshold) {
      return { ...task, similarity: ratio };
    }
  }
  return null;
}

export function registerTask({
  sessionId,
  description,
  worktreePath,
  beadsIssue,
  branch,
  status = "in_progress",
}) {
  const state = loadState();
  const entry = {
    id: sessionId,
    description,
    worktreePath,
    beadsIssue: beadsIssue ?? null,
    branch: branch ?? null,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.tasks = state.tasks.filter((t) => t.id !== sessionId);
  state.tasks.push(entry);
  saveState(state);
  return entry;
}

export function updateTaskStatus(sessionId, status, note) {
  const state = loadState();
  const task = state.tasks.find((t) => t.id === sessionId);
  if (!task) return null;
  task.status = status;
  task.updatedAt = new Date().toISOString();
  if (note) task.note = note;
  saveState(state);
  return task;
}

export function claimPaths(sessionId, paths) {
  const state = loadState();
  const normalized = paths.map((p) => p.replace(/\\/g, "/"));
  for (const claim of state.claims) {
    if (claim.sessionId === sessionId) continue;
    if (claim.status !== "active") continue;
    for (const path of normalized) {
      if (claim.paths.some((c) => path.startsWith(c) || c.startsWith(path))) {
        return { conflict: true, holder: claim.sessionId, path };
      }
    }
  }
  state.claims = state.claims.filter((c) => c.sessionId !== sessionId);
  state.claims.push({
    sessionId,
    paths: normalized,
    status: "active",
    at: new Date().toISOString(),
  });
  saveState(state);
  return { conflict: false };
}

export function releaseClaims(sessionId) {
  const state = loadState();
  state.claims = state.claims.map((c) =>
    c.sessionId === sessionId ? { ...c, status: "released" } : c
  );
  saveState(state);
}

/** Sync agents[] from lean-ctx catalog (called on session start / catalog seed). */
export function syncAgentsFromCatalog(catalog) {
  const state = loadState();
  const agents = (catalog?.agents ?? []).map((a) => ({
    id: a.id,
    agent_type: a.agent_type ?? "cursor",
    role: a.role,
    collection: a.collection ?? null,
    intelligence: a.intelligence ?? [],
    syncedAt: new Date().toISOString(),
  }));
  state.agents = agents;
  saveState(state);
  return agents;
}

export function getCatalogAgents() {
  return loadState().agents ?? [];
}
