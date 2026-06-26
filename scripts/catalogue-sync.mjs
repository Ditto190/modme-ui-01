#!/usr/bin/env node
/**
 * @feature CATALOGUE.ITEM.SYNC
 * Promotes output_schemas, skills_index.json, and inbox entries into catalogue_items registry.
 *
 * Usage:
 *   node scripts/catalogue-sync.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SKILLS_INDEX_PATH = path.join(ROOT, 'skills_index.json');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

const CATALOGUE_TYPES = new Set(['agent', 'skill', 'component', 'instruction', 'hook', 'workflow', 'plugin']);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function syncFromOutputSchemas() {
  const { data: schemas, error } = await supabase
    .from('output_schemas')
    .select('id, schema_type, name, slug, schema, source_entry_id');

  if (error) throw new Error(error.message);
  if (!schemas?.length) {
    console.log('[catalogue-sync] No output_schemas rows to sync.');
    return 0;
  }

  let synced = 0;
  for (const row of schemas) {
    const itemType = CATALOGUE_TYPES.has(row.schema_type) ? row.schema_type : 'component';
    const schemaJson = typeof row.schema === 'object' ? row.schema : {};
    const tools = Array.isArray(schemaJson.tools) ? schemaJson.tools : [];

    const item = {
      item_type: itemType,
      slug: row.slug,
      name: row.name,
      description: schemaJson.description ?? schemaJson.summary ?? null,
      status: 'published',
      source_entry_id: row.source_entry_id,
      output_schema_id: row.id,
      metadata: { tools, schema_version: row.schema_type },
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (DRY_RUN) {
      console.log(`[dry-run] would upsert catalogue_item: ${row.slug}`);
      synced++;
      continue;
    }

    const { error: upsertError } = await supabase
      .from('catalogue_items')
      .upsert(item, { onConflict: 'slug' });

    if (upsertError) {
      console.error(`[catalogue-sync] Failed ${row.slug}: ${upsertError.message}`);
    } else {
      synced++;
    }
  }

  return synced;
}

async function syncFromAgentInboxEntries() {
  const { data: entries, error } = await supabase
    .from('inbox_entries')
    .select('id, title, summary, tags, entry_type, agent_name')
    .contains('tags', ['agent'])
    .eq('status', 'categorized')
    .limit(50);

  if (error) throw new Error(error.message);
  if (!entries?.length) return 0;

  let synced = 0;
  for (const entry of entries) {
    const slug = slugify(entry.title ?? entry.id.slice(0, 8));
    const item = {
      item_type: 'agent',
      slug,
      name: entry.title ?? slug,
      description: entry.summary,
      status: 'draft',
      source_entry_id: entry.id,
      metadata: { tags: entry.tags, agent_name: entry.agent_name },
      updated_at: new Date().toISOString(),
    };

    if (DRY_RUN) {
      console.log(`[dry-run] would upsert agent from inbox: ${slug}`);
      synced++;
      continue;
    }

    const { error: upsertError } = await supabase
      .from('catalogue_items')
      .upsert(item, { onConflict: 'slug', ignoreDuplicates: false });

    if (!upsertError) synced++;
  }

  return synced;
}

async function syncFromSkillsIndex() {
  if (!fs.existsSync(SKILLS_INDEX_PATH)) {
    console.log('[catalogue-sync] No skills_index.json — run yarn skills:index first.');
    return 0;
  }

  const entries = JSON.parse(fs.readFileSync(SKILLS_INDEX_PATH, 'utf8'));
  if (!Array.isArray(entries) || !entries.length) return 0;

  let synced = 0;
  for (const skill of entries) {
    const slug = slugify(skill.id ?? skill.name);
    const item = {
      item_type: 'skill',
      slug,
      name: skill.name ?? slug,
      description: skill.description ?? null,
      taxonomy_code: skill.category ?? null,
      status: 'published',
      metadata: {
        risk: skill.risk,
        source: skill.source,
        date_added: skill.date_added,
        tags: skill.tags ?? [],
        skill_path: skill.path,
      },
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (DRY_RUN) {
      console.log(`[dry-run] would upsert skill: ${slug}`);
      synced++;
      continue;
    }

    const { error: upsertError } = await supabase
      .from('catalogue_items')
      .upsert(item, { onConflict: 'slug' });

    if (upsertError) {
      console.error(`[catalogue-sync] Failed skill ${slug}: ${upsertError.message}`);
    } else {
      synced++;
    }
  }

  return synced;
}

async function main() {
  console.log(`[catalogue-sync] Starting — dry-run=${DRY_RUN}`);
  const fromSchemas = await syncFromOutputSchemas();
  const fromSkills = await syncFromSkillsIndex();
  const fromInbox = await syncFromAgentInboxEntries();
  console.log(
    `[catalogue-sync] Done — ${fromSchemas} from schemas, ${fromSkills} from skills index, ${fromInbox} from inbox`
  );
}

main().catch((err) => {
  console.error('[catalogue-sync] Fatal:', err);
  process.exit(1);
});
