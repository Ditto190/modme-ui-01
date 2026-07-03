/**
 * Ollama nanoagent — classify scrape_pages into inbox-contract taxonomy.
 * Uses /api/chat with format: json (RSCIT prompt).
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../..');
const CONTRACT_PATH = resolve(
  REPO_ROOT,
  'docs/inbox-pipeline/contracts/inbox-contract.v1.json'
);

export interface ScrapeClassificationResult {
  entry_type: string;
  severity: string;
  agent_role: string;
  title: string;
  summary: string;
  tags: string[];
  features: Record<string, unknown>;
}

export interface ClassifyPageInput {
  url: string;
  text: string;
  shoppingListHints?: {
    fragments?: string[];
    annotations?: string[];
    tags?: string[];
    priority?: string;
  };
}

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2:3b';

function loadContractEnums() {
  const contract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8'));
  return contract.enums as {
    entryType: string[];
    severity: string[];
    agentRole: string[];
  };
}

function buildPrompt(input: ClassifyPageInput): string {
  const enums = loadContractEnums();
  const hints = input.shoppingListHints;
  const hintsBlock = hints
    ? `\nSHOPPING LIST HINTS (store in features.shopping_list_hints):
fragments: ${JSON.stringify(hints.fragments ?? [])}
annotations: ${JSON.stringify(hints.annotations ?? [])}
tags: ${JSON.stringify(hints.tags ?? [])}
priority: ${hints.priority ?? 'normal'}
Map URL fragments to lean-ctx tools when relevant (ctx_impact, ctx_compose, ctx_graph, etc.).\n`
    : '';
  return `Role: Intake taxonomy classifier for ModMe knowledge pipeline.
Situation: Page text + URL from scrape_pages staging row.
Constraints: Return ONLY valid JSON matching ScrapeClassificationSchema. If unsure, set entry_type=research, severity=medium. Max summary 300 chars. tags max 8.
Instructions: Classify entry_type (${enums.entryType.join('|')}), severity (${enums.severity.join('|')}), agent_role (${enums.agentRole.join('|')}), title, summary, tags, features object (key topics, code_blocks_present, api_docs, version_hints, shopping_list_hints when hints provided).
Template: {"entry_type":"","severity":"","agent_role":"","title":"","summary":"","tags":[],"features":{}}
${hintsBlock}
URL: ${input.url}

PAGE TEXT:
${input.text.slice(0, 8000)}`;
}

function normalizeResult(
  raw: Record<string, unknown>,
  shoppingListHints?: ClassifyPageInput['shoppingListHints']
): ScrapeClassificationResult {
  const enums = loadContractEnums();
  const entryType = String(raw.entry_type || 'research');
  const severity = String(raw.severity || 'medium');
  const agentRole = String(raw.agent_role || 'researcher');
  const title = String(raw.title || 'Untitled scrape').slice(0, 500);
  const summary = String(raw.summary || '').slice(0, 300);
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map(String).slice(0, 8)
    : [];

  const features =
    typeof raw.features === 'object' && raw.features !== null
      ? (raw.features as Record<string, unknown>)
      : {};

  if (shoppingListHints) {
    features.shopping_list_hints = {
      fragments: shoppingListHints.fragments ?? [],
      annotations: shoppingListHints.annotations ?? [],
      tags: shoppingListHints.tags ?? [],
      priority: shoppingListHints.priority ?? 'normal',
    };
  }

  return {
    entry_type: enums.entryType.includes(entryType) ? entryType : 'research',
    severity: enums.severity.includes(severity) ? severity : 'medium',
    agent_role: enums.agentRole.includes(agentRole) ? agentRole : 'researcher',
    title,
    summary,
    tags,
    features,
  };
}

export async function classifyScrapePage(
  input: ClassifyPageInput,
  options: { baseUrl?: string; model?: string; temperature?: number } = {}
): Promise<ScrapeClassificationResult> {
  const baseUrl = (options.baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = options.model || process.env.OLLAMA_MODEL || DEFAULT_MODEL;
  const temperature = options.temperature ?? 0.1;

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      options: { temperature },
      messages: [{ role: 'user', content: buildPrompt(input) }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama error ${response.status}: ${body.slice(0, 500)}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  const content = data.message?.content;
  if (!content) {
    throw new Error('Ollama returned empty content');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Ollama JSON parse failed: ${content.slice(0, 200)}`);
  }

  return normalizeResult(parsed, input.shoppingListHints);
}

export async function classifyScrapePageWithRetry(
  input: ClassifyPageInput,
  options: { baseUrl?: string; model?: string } = {}
): Promise<ScrapeClassificationResult> {
  try {
    return await classifyScrapePage(input, options);
  } catch (firstError) {
    const repair = await classifyScrapePage(
      {
        url: input.url,
        text: `${input.text.slice(0, 4000)}\n\nREPAIR: prior response invalid. Return strict JSON only.`,
      },
      { ...options, temperature: 0 }
    );
    if (!repair.title) {
      throw firstError;
    }
    return repair;
  }
}
