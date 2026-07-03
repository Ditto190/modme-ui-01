#!/usr/bin/env node
/**
 * ctx_tools-style MCP gateway router for terminal use.
 * Usage: node scripts/lean-ctx-tool-gateway.mjs find "library docs"
 *        node scripts/lean-ctx-tool-gateway.mjs call context7 resolve_library react
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CATALOG_PATH = resolve(ROOT, "data/lean-ctx-agent-catalog.json");
const SEED_PATH = resolve(ROOT, "scripts/collections/lean-ctx-agent-catalog.seed.json");

const GATEWAY_TOOLS = {
  context7: {
    resolve_library: { tool: "resolve-library-id", args: ["libraryName"] },
    query_docs: { tool: "query-docs", args: ["libraryId", "query"] },
  },
  supabase: {
    list_tables: { tool: "list_tables", args: ["schemas"] },
    get_logs: { tool: "get_logs", args: ["service"] },
  },
  gitlab: {
    list_projects: { tool: "search", args: ["query"] },
  },
};

function loadGateways() {
  const path = existsSync(CATALOG_PATH) ? CATALOG_PATH : SEED_PATH;
  if (!existsSync(path)) return [];
  const data = JSON.parse(readFileSync(path, "utf8"));
  return data.mcp_gateways ?? [];
}

function cmdFind(hint) {
  const gateways = loadGateways();
  const lower = (hint ?? "").toLowerCase();
  const matches = gateways.filter(
    (g) =>
      g.find_hint?.toLowerCase().includes(lower) ||
      lower.includes(g.namespace) ||
      g.namespace.includes(lower.split(/\s+/)[0] ?? "")
  );

  if (matches.length === 0) {
    console.log(JSON.stringify({ matches: [], hint, available: gateways.map((g) => g.namespace) }));
    return;
  }

  console.log(
    JSON.stringify(
      {
        matches: matches.map((g) => ({
          namespace: g.namespace,
          mcp_server: g.mcp_server,
          find_hint: g.find_hint,
          example: `node scripts/lean-ctx-tool-gateway.mjs call ${g.namespace} <tool> [...args]`,
        })),
      },
      null,
      2
    )
  );
}

function cmdCall(namespace, tool, callArgs) {
  const gateways = loadGateways();
  const gateway = gateways.find((g) => g.namespace === namespace);
  const tools = GATEWAY_TOOLS[namespace];

  if (!gateway) {
    console.error(`unknown namespace: ${namespace}`);
    process.exit(1);
  }

  const spec = tools?.[tool];
  const payload = {
    mcp_server: gateway.mcp_server,
    namespace,
    tool: spec?.tool ?? tool,
    arguments: Object.fromEntries((spec?.args ?? []).map((key, i) => [key, callArgs[i] ?? null])),
    raw_args: callArgs,
    note: "Invoke via CallMcpTool when MCP ctx_tools unavailable",
  };

  console.log(JSON.stringify(payload, null, 2));
}

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd) {
  case "find":
    cmdFind(rest.join(" "));
    break;
  case "call":
    cmdCall(rest[0], rest[1], rest.slice(2));
    break;
  case "list":
    console.log(JSON.stringify({ gateways: loadGateways(), tools: GATEWAY_TOOLS }, null, 2));
    break;
  default:
    console.error("usage: lean-ctx-tool-gateway.mjs <find <hint>|call <ns> <tool> [...args]|list>");
    process.exit(1);
}
