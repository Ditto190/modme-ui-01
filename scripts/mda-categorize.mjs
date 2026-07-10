#!/usr/bin/env node
/**
 * @feature INBOX.ENTRY.CATEGORIZE
 * @domain INBOX
 * @entity ENTRY
 * @operation CATEGORIZE
 * @layer AGENT
 * @dependencies [INBOX.ENTRY.EMBED, DB.SCHEMA.CATEGORIES]
 * @implements
 *   - --team taxonomy: auto-tag + severity + category assignment
 *   - --team relations: pgvector cosine similarity → entry_relations
 *
 * mda-categorize.mjs
 *
 * Master Data Architect categorization pipeline.
 * Runs taxonomy classification and/or relation detection on inbox entries.
 *
 * Usage:
 *   node scripts/mda-categorize.mjs --team taxonomy
 *   node scripts/mda-categorize.mjs --team relations
 *   node scripts/mda-categorize.mjs --team all
 *   node scripts/mda-categorize.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { loadRootEnv } from "./lib/load-root-env.mjs";

loadRootEnv({ fileWins: true });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const TEAM = args[args.indexOf("--team") + 1] ?? "all";
const DRY_RUN = args.includes("--dry-run");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Taxonomy Team ─────────────────────────────────────────────────────────

const TAG_PATTERNS = [
  { pattern: /\b(architecture|adr|decision|design)\b/i, tag: "architecture" },
  { pattern: /\b(supabase|postgres|database|db|prisma|sql)\b/i, tag: "database" },
  { pattern: /\b(nextjs|next\.js|react|frontend|ui|component)\b/i, tag: "frontend" },
  { pattern: /\b(api|fastapi|route|endpoint|rest|graphql)\b/i, tag: "backend" },
  { pattern: /\b(devops|ci|cd|github.actions|workflow|deploy)\b/i, tag: "devops" },
  { pattern: /\b(security|auth|authentication|jwt|rls)\b/i, tag: "security" },
  { pattern: /\b(performance|optimization|cache|speed)\b/i, tag: "performance" },
  { pattern: /\b(test|testing|vitest|playwright|jest)\b/i, tag: "testing" },
  { pattern: /\b(agent|mcp|llm|ai|copilot|cursor)\b/i, tag: "ai-tooling" },
];

const SEVERITY_KEYWORDS = {
  critical: /\b(critical|breaking|production|outage|urgent|security.vulnerability)\b/i,
  high: /\b(high|important|significant|major|adr-candidate)\b/i,
  low: /\b(low|minor|trivial|cleanup|refactor)\b/i,
};

function inferTags(text) {
  const inferred = new Set();
  for (const { pattern, tag } of TAG_PATTERNS) {
    if (pattern.test(text)) inferred.add(tag);
  }
  return Array.from(inferred);
}

function inferSeverity(text) {
  for (const [level, pattern] of Object.entries(SEVERITY_KEYWORDS)) {
    if (pattern.test(text)) return level;
  }
  return "medium";
}

async function loadCategories() {
  const { data, error } = await supabase.from("categories").select("id, slug, name");
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return data ?? [];
}

function matchCategory(text, categories) {
  const lower = text.toLowerCase();
  for (const cat of categories) {
    if (lower.includes(cat.slug.replace(/-/g, " ")) || lower.includes(cat.name.toLowerCase())) {
      return cat.id;
    }
  }
  return null;
}

async function runTaxonomyTeam() {
  console.log("[mda/taxonomy] Fetching uncategorized entries...");
  const { data: entries, error } = await supabase
    .from("inbox_entries")
    .select("id, extracted_text, title, summary, tags, severity")
    .eq("status", "indexed")
    .limit(50);

  if (error) throw new Error(error.message);
  if (!entries?.length) {
    console.log("[mda/taxonomy] No uncategorized entries found.");
    return;
  }

  const categories = await loadCategories();
  console.log(`[mda/taxonomy] Processing ${entries.length} entries...`);

  let updated = 0;
  for (const entry of entries) {
    const fullText = [entry.title, entry.summary, entry.extracted_text].filter(Boolean).join(" ");
    const inferredTags = inferTags(fullText);
    const inferredSeverity = entry.severity === "medium" ? inferSeverity(fullText) : entry.severity;
    const categoryId = matchCategory(fullText, categories);

    // Merge inferred tags with existing tags (dedup)
    const mergedTags = Array.from(new Set([...(entry.tags ?? []), ...inferredTags]));

    const updates = {
      tags: mergedTags,
      severity: inferredSeverity,
      status: "categorized",
      ...(categoryId ? { category_id: categoryId } : {}),
    };

    if (DRY_RUN) {
      console.log(
        `[dry-run] ${entry.id.slice(0, 8)}... → tags:${mergedTags.join(",")}, severity:${inferredSeverity}`
      );
    } else {
      const { error: updateError } = await supabase
        .from("inbox_entries")
        .update(updates)
        .eq("id", entry.id);

      if (updateError) {
        console.error(`[mda/taxonomy] Failed ${entry.id}: ${updateError.message}`);
      } else {
        updated++;
        process.stdout.write(".");
      }
    }
  }
  console.log(`\n[mda/taxonomy] Done — ${updated} entries categorized`);
}

// ─── Relations Team ────────────────────────────────────────────────────────

async function runRelationsTeam() {
  console.log("[mda/relations] Detecting entry relations via pgvector similarity...");

  // Use the match_inbox_entries RPC function for semantic similarity
  // For each recently categorized entry, find top-k similar entries
  const { data: recent, error } = await supabase
    .from("inbox_entries")
    .select("id, embedding, tags")
    .not("embedding", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  if (!recent?.length) {
    console.log("[mda/relations] No entries with embeddings found.");
    return;
  }

  let relations = 0;
  for (const entry of recent) {
    if (!entry.embedding) continue;

    const { data: similar } = await supabase.rpc("match_inbox_entries", {
      query_embedding: entry.embedding,
      match_threshold: 0.75,
      match_count: 5,
    });

    for (const match of similar ?? []) {
      if (match.id === entry.id) continue;

      // Detect ADR candidates
      const relationType = entry.tags?.includes("adr-candidate") ? "adr_candidate" : "similar";

      if (!DRY_RUN) {
        await supabase.from("entry_relations").upsert(
          {
            from_entry_id: entry.id,
            to_entry_id: match.id,
            relation_type: relationType,
            confidence: match.similarity,
          },
          { onConflict: "from_entry_id,to_entry_id,relation_type", ignoreDuplicates: true }
        );
        relations++;
      } else {
        console.log(
          `[dry-run] relation: ${entry.id.slice(0, 8)} → ${match.id.slice(0, 8)} (${relationType}, ${match.similarity.toFixed(3)})`
        );
      }
    }
  }
  console.log(`[mda/relations] Done — ${relations} relations created`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[mda] Starting — team=${TEAM}, dry-run=${DRY_RUN}`);

  if (TEAM === "taxonomy" || TEAM === "all") await runTaxonomyTeam();
  if (TEAM === "relations" || TEAM === "all") await runRelationsTeam();

  console.log("[mda] Pipeline complete");
}

main().catch((err) => {
  console.error("[mda] Fatal:", err);
  process.exit(1);
});
