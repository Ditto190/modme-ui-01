#!/usr/bin/env node
/**
 * @feature INBOX.ENTRY.INGEST
 * Ingests inbox files into Supabase with contract validation.
 *
 * Usage:
 *   node scripts/inbox-ingest.mjs [--inbox-dir <path>] [--dry-run] [--skip-validation]
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import {
  listInboxFilesSync,
  loadContract,
  parseInboxFile,
  validateFunnelFile,
} from "./lib/inbox-contract.mjs";
import { loadRootEnv } from "./lib/load-root-env.mjs";
import { debugLog, memorySnapshot } from "./lib/debug-ndjson.mjs";
import { acquireProcessLock, assertResourceBudget, releaseProcessLock } from "./lib/agent-resource-guard.mjs";
import { assertSupabaseReachable } from "./lib/supabase-connectivity.mjs";

loadRootEnv({ fileWins: true });

const INBOX_DIR = process.argv.includes("--inbox-dir")
  ? process.argv[process.argv.indexOf("--inbox-dir") + 1]
  : resolve(import.meta.dirname, "../GenerativeUI_monorepo/docs/inbox");

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_VALIDATION = process.argv.includes("--skip-validation");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Run: yarn supabase:local:setup");
  process.exit(1);
}

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let supabase = null;

function getSupabaseClient() {
  if (DRY_RUN) return null;
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Supabase env missing");
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(8_000) }),
      },
    });
  }
  return supabase;
}
const contract = loadContract();

function extractTitle(content, filename) {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();
  return basename(filename, extname(filename))
    .replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}_/, "")
    .replace(/_/g, " ");
}

function extractSummary(body) {
  const lines = body.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  return lines.slice(0, 3).join(" ").slice(0, 500) || null;
}

async function ingestInbox() {
  process.env.AGENT_RESOURCE_GUARD = process.env.AGENT_RESOURCE_GUARD || "1";
  acquireProcessLock("inbox-ingest");
  try {
  // #region agent log
  debugLog({
    location: "inbox-ingest.mjs:ingestInbox",
    message: "ingest start",
    data: { dryRun: DRY_RUN, inboxDir: INBOX_DIR, memory: memorySnapshot("start") },
    hypothesisId: "H2-H4",
  });
  // #endregion
  assertResourceBudget("ingest-start");

  if (!DRY_RUN) {
    await assertSupabaseReachable({ hint: "Pass --dry-run to validate inbox files locally." });
  }

  const files = listInboxFilesSync(INBOX_DIR);
  console.log(`Found ${files.length} files to process in ${INBOX_DIR}\n`);

  let ingested = 0;
  let skipped = 0;
  let errors = 0;

  for (const filename of files) {
    const filePath = join(INBOX_DIR, filename);

    try {
      const parsed = parseInboxFile(filePath, filename);
      const { format, rawContent, body, frontmatter, contentHash, isBinary } = parsed;

      if (!SKIP_VALIDATION) {
        const validationFindings = validateFunnelFile(parsed, contract);
        const blocking = validationFindings.filter((f) => f.severity === "error");
        if (blocking.length > 0) {
          for (const f of blocking) {
            console.error(`  ERROR [${f.code}]: ${filename} — ${f.message}`);
          }
          errors++;
          continue;
        }
      }

      const title = frontmatter.title || extractTitle(body, filename);
      const summary = frontmatter.summary || extractSummary(body);
      const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
      const entryType = frontmatter.type || format;
      const severity = contract.enums.severity.includes(frontmatter.severity)
        ? frontmatter.severity
        : "medium";

      if (DRY_RUN) {
        console.log(`  DRY RUN - would ingest: ${filename}`);
        console.log(`     title: ${title} | format: ${format} | severity: ${severity}`);
        // #region agent log
        debugLog({
          location: "inbox-ingest.mjs:ingestInbox",
          message: "dry-run skip supabase",
          data: { filename, memory: memorySnapshot("dry-run") },
          hypothesisId: "H4",
        });
        // #endregion
        ingested++;
        continue;
      }

      const client = getSupabaseClient();
      const { data: existing } = await client
        .from("inbox_entries")
        .select("id, content_hash")
        .eq("content_hash", contentHash)
        .maybeSingle();
      // #region agent log
      debugLog({
        location: "inbox-ingest.mjs:ingestInbox",
        message: "supabase lookup",
        data: { filename, hasExisting: !!existing, memory: memorySnapshot("lookup") },
        hypothesisId: "H4",
      });
      // #endregion

      if (existing) {
        console.log(`  SKIP (already indexed): ${filename}`);
        skipped++;
        continue;
      }

      const now = new Date().toISOString();
      const entry = {
        id: randomUUID(),
        content_hash: contentHash,
        source_file: filename,
        source_format: format,
        raw_content: rawContent.slice(0, 50000),
        extracted_text: rawContent.slice(0, 50000),
        title: title?.slice(0, 500),
        summary: summary?.slice(0, 1000),
        agent_name: frontmatter.agent || null,
        agent_role: frontmatter.agent_role || null,
        session_id: frontmatter.session_id || null,
        branch_name: frontmatter.branch || process.env.GITHUB_REF_NAME || null,
        pr_number: frontmatter.pr_number ?? null,
        tags,
        severity,
        entry_type: entryType,
        status: "indexed",
        created_at: now,
        updated_at: now,
      };

      const { error } = await client.from("inbox_entries").insert(entry);
      if (error) {
        console.error(`  ERROR: ${filename} — ${error.message}`);
        errors++;
        continue;
      }

      if (isBinary) {
        const fileBuffer = readFileSync(filePath);
        const { error: storageError } = await client.storage
          .from("inbox-files")
          .upload(`${contentHash}/${filename}`, fileBuffer, { upsert: true });
        if (storageError) {
          console.warn(`  Storage warning for ${filename}: ${storageError.message}`);
        }
      }

      console.log(`  INGESTED: ${filename}`);
      ingested++;
    } catch (err) {
      // #region agent log
      debugLog({
        location: "inbox-ingest.mjs:ingestInbox",
        message: "file error",
        hypothesisId: "H4",
        data: {
          filename,
          error: err instanceof Error ? { name: err.name, message: err.message, cause: String(err.cause ?? "") } : String(err),
        },
      });
      // #endregion
      console.error(`  ERROR processing ${filename}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nResults: ${ingested} ingested, ${skipped} skipped, ${errors} errors`);

  if (!DRY_RUN) {
    const client = getSupabaseClient();
    const { data: allEntries } = await client
      .from("inbox_entries")
      .select("id, source_file, title, summary, tags, entry_type, severity, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (allEntries) {
      const index = {
        version: "1.0",
        last_updated: new Date().toISOString(),
        entry_count: allEntries.length,
        entries: allEntries.map((e) => ({
          id: e.id,
          filename: e.source_file,
          title: e.title,
          summary: e.summary?.slice(0, 200),
          tags: e.tags,
          type: e.entry_type,
          severity: e.severity,
          status: e.status,
          created_at: e.created_at,
        })),
      };
      writeFileSync(join(INBOX_DIR, "_index.json"), JSON.stringify(index, null, 2));
      console.log(`\nUpdated _index.json with ${allEntries.length} total entries`);
    }
  }
  } finally {
    releaseProcessLock();
  }
}

ingestInbox().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
