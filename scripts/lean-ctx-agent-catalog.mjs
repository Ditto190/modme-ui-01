#!/usr/bin/env node
/**
 * Lean-ctx agent catalog — seed, register, resolve, validate.
 * Runtime catalog: data/lean-ctx-agent-catalog.json (gitignored via data/)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { syncAgentsFromCatalog } from "./lib/agent-task-registry.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CATALOG_PATH = resolve(ROOT, "data/lean-ctx-agent-catalog.json");
const SEED_PATH = resolve(ROOT, "scripts/collections/lean-ctx-agent-catalog.seed.json");
const COLLECTIONS_DIR = resolve(ROOT, "scripts/collections");

const INTENT_RULES = [
  {
    keywords: ["review", "audit", "security", "bugbot"],
    role: "review",
    collection: "modme-core",
    intelligence: ["ctx_delta", "ctx_callgraph"],
  },
  {
    keywords: ["test", "verify", "spec", "coverage"],
    role: "test",
    collection: "modme-core",
    intelligence: ["ctx_compose", "ctx_search"],
  },
  {
    keywords: ["plan", "architecture", "adr", "design"],
    role: "plan",
    collection: "modme-lean-ctx-advanced",
    intelligence: ["ctx_compose", "ctx_architecture", "ctx_graph"],
  },
  {
    keywords: ["orchestr", "dispatch", "beads", "parallel", "multi-agent"],
    role: "orchestrator",
    collection: "modme-lean-ctx-advanced",
    intelligence: ["ctx_compose", "ctx_graph", "ctx_agent"],
  },
  {
    keywords: ["inbox", "intake", "embed", "pipeline"],
    role: "dev",
    collection: "modme-inbox-mda",
    intelligence: ["ctx_index", "ctx_fill", "ctx_semantic_search"],
  },
  {
    keywords: ["forge", "next-forge", "supabase", "prisma"],
    role: "dev",
    collection: "modme-frontend",
    intelligence: ["ctx_impact", "ctx_architecture", "ctx_delta"],
  },
];

function loadJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function saveCatalog(catalog) {
  mkdirSync(dirname(CATALOG_PATH), { recursive: true });
  writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

function loadCollections() {
  if (!existsSync(COLLECTIONS_DIR)) return [];
  return readdirSync(COLLECTIONS_DIR)
    .filter((f) => f.endsWith(".collection.json"))
    .map((f) => loadJson(join(COLLECTIONS_DIR, f), null))
    .filter(Boolean);
}

function agentsFromCollections(collections) {
  const agents = [];
  for (const col of collections) {
    for (const item of col.items ?? []) {
      const lc = item.lean_ctx;
      if (!lc?.a2a_role) continue;
      agents.push({
        id: `${lc.agent_type ?? "cursor"}-${lc.a2a_role}`,
        agent_type: lc.agent_type ?? "cursor",
        role: lc.a2a_role,
        collection: col.id,
        intelligence: lc.intelligence_tools ?? [],
        source_path: item.path,
        preload_profile: lc.preload_profile ?? null,
      });
    }
  }
  return agents;
}

function dedupeAgents(agents) {
  const byId = new Map();
  for (const agent of agents) {
    if (!byId.has(agent.id)) byId.set(agent.id, agent);
  }
  return [...byId.values()];
}

function cmdSeed() {
  const seed = loadJson(SEED_PATH, { version: 1, agents: [], mcp_gateways: [] });
  const fromCollections = agentsFromCollections(loadCollections());
  const merged = dedupeAgents([...(seed.agents ?? []), ...fromCollections]);
  const catalog = {
    version: seed.version ?? 1,
    seeded_at: new Date().toISOString(),
    agents: merged,
    mcp_gateways: seed.mcp_gateways ?? [],
  };
  saveCatalog(catalog);
  syncAgentsFromCatalog(catalog);
  console.log(JSON.stringify({ ok: true, agents: catalog.agents.length, path: CATALOG_PATH }));
}

function loadCatalog() {
  const catalog = loadJson(CATALOG_PATH);
  if (catalog) return catalog;
  cmdSeed();
  return loadJson(CATALOG_PATH);
}

function cmdRegister(args) {
  const roleArg = args.find((a) => a.startsWith("--role="));
  const roleFlag = args.indexOf("--role");
  const role = roleArg?.split("=")[1] ?? (roleFlag >= 0 ? args[roleFlag + 1] : undefined) ?? "dev";
  const catalog = loadCatalog();
  const agent =
    catalog.agents.find((a) => a.role === role) ??
    catalog.agents.find((a) => a.role === "dev") ??
    catalog.agents[0];

  if (!agent) {
    console.error("agent-catalog: no agents in catalog — run seed first");
    process.exit(1);
  }

  syncAgentsFromCatalog(catalog);

  const instructions = {
    mcp: "ctx_agent",
    action: "register",
    payload: {
      agent_type: agent.agent_type,
      role: agent.role,
      diary_categories: ["discovery", "decision", "blocker", "progress", "insight"],
    },
    catalog: {
      version: catalog.version,
      agent_id: agent.id,
      collection: agent.collection,
      intelligence: agent.intelligence,
    },
    follow_up: [
      { mcp: "ctx_session", action: "load" },
      { mcp: "ctx_knowledge", action: "wakeup" },
      { mcp: "ctx_preload", task: agent.preload_profile ?? "orchestration" },
    ],
  };

  console.log(JSON.stringify(instructions, null, 2));
}

function cmdResolve(args) {
  const intentIdx = args.indexOf("--intent");
  const intentArg = args.find((a) => a.startsWith("--intent="));
  const intent = (
    intentIdx >= 0
      ? args.slice(intentIdx + 1).join(" ")
      : intentArg
        ? intentArg.split("=").slice(1).join("=")
        : ""
  ).toLowerCase();
  const catalog = loadCatalog();
  const tokens = intent.split(/\s+/).filter(Boolean);

  let match = INTENT_RULES.find((rule) =>
    rule.keywords.some((kw) => tokens.some((t) => t.includes(kw) || kw.includes(t)))
  );
  if (!match && intent) {
    match = INTENT_RULES.find((rule) => rule.keywords.some((kw) => intent.includes(kw)));
  }

  const role = match?.role ?? "dev";
  const agent =
    catalog.agents.find((a) => a.role === role) ?? catalog.agents.find((a) => a.role === "dev");

  const result = {
    intent: intent || null,
    role,
    collection: match?.collection ?? agent?.collection ?? "modme-core",
    intelligence: match?.intelligence ?? agent?.intelligence ?? ["ctx_compose"],
    agent_id: agent?.id ?? null,
    agent_type: agent?.agent_type ?? "cursor",
  };

  console.log(JSON.stringify(result, null, 2));
}

function cmdValidate() {
  const errors = [];
  const seed = loadJson(SEED_PATH);
  if (!seed) errors.push("missing seed: scripts/collections/lean-ctx-agent-catalog.seed.json");

  const catalog = loadJson(CATALOG_PATH);
  if (!catalog) {
    cmdSeed();
  }
  const finalCatalog = loadJson(CATALOG_PATH);
  if (!finalCatalog?.agents?.length) {
    errors.push("catalog has no agents");
  }
  for (const agent of finalCatalog?.agents ?? []) {
    if (!agent.id || !agent.role) errors.push(`agent missing id/role: ${JSON.stringify(agent)}`);
  }

  if (errors.length) {
    console.error(JSON.stringify({ ok: false, errors }, null, 2));
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        agents: finalCatalog.agents.length,
        gateways: finalCatalog.mcp_gateways?.length ?? 0,
      },
      null,
      2
    )
  );
}

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd) {
  case "seed":
    cmdSeed();
    break;
  case "register":
    cmdRegister(rest);
    break;
  case "resolve":
    cmdResolve(rest);
    break;
  case "validate":
    cmdValidate();
    break;
  default:
    console.error(
      'usage: lean-ctx-agent-catalog.mjs <seed|register|resolve|validate> [--role=dev] [--intent="fix auth bug"]'
    );
    process.exit(1);
}
