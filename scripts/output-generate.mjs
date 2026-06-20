#!/usr/bin/env node
/**
 * @feature INBOX.ARTEFACT.GENERATE
 * @domain INBOX
 * @entity ARTEFACT
 * @operation GENERATE
 * @layer AGENT
 * @dependencies [INBOX.ENTRY.CATEGORIZE, DB.SCHEMA.INBOX_ENTRIES]
 * @implements
 *   - --type skills: skill JSON schema files → .github/generated-skills/
 *   - --type storybook: .stories.tsx files → next-forge/apps/storybook/
 *   - --type adr: ADR .md files → next-forge/docs/adr/
 *
 * output-generate.mjs
 *
 * Generates output artefacts from processed inbox entries.
 * Produces: skill JSON schemas, Storybook stories, ADR promotions.
 *
 * Usage:
 *   node scripts/output-generate.mjs --type skills
 *   node scripts/output-generate.mjs --type storybook
 *   node scripts/output-generate.mjs --type adr
 *   node scripts/output-generate.mjs --type all
 *   node scripts/output-generate.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const TYPE = args[args.indexOf('--type') + 1] ?? 'all';
const DRY_RUN = args.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function writeFile(filePath, content) {
  if (DRY_RUN) {
    console.log(`[dry-run] Would write: ${filePath}`);
    return;
  }
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, content, 'utf8');
  console.log(`[output] Written: ${filePath}`);
}

// ─── Skills Generator ──────────────────────────────────────────────────────

async function generateSkills() {
  console.log('[output/skills] Querying skills from output_schemas...');
  const { data, error } = await supabase
    .from('output_schemas')
    .select('*')
    .eq('schema_type', 'skill');

  if (error) throw new Error(error.message);

  if (!data?.length) {
    console.log('[output/skills] No skills found in output_schemas yet.');
    // Bootstrap: scan inbox entries tagged 'agent-skill' or 'skill'
    const { data: entries } = await supabase
      .from('inbox_entries')
      .select('id, title, summary, tags, extracted_text, source_format')
      .contains('tags', ['skill'])
      .limit(20);

    for (const entry of entries ?? []) {
      const slug = entry.title
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 60) ?? entry.id.slice(0, 8);

      const schema = {
        name: entry.title ?? slug,
        description: entry.summary ?? entry.extracted_text?.slice(0, 200),
        source_entry_id: entry.id,
        tags: entry.tags,
        generated_at: new Date().toISOString(),
      };

      const filePath = join(REPO_ROOT, '.github', 'generated-skills', `${slug}.skill.json`);
      writeFile(filePath, JSON.stringify(schema, null, 2));

      if (!DRY_RUN) {
        await supabase.from('output_artefacts').upsert({
          artefact_type: 'skill_json',
          title: entry.title ?? slug,
          content: JSON.stringify(schema, null, 2),
          file_path: filePath,
          status: 'draft',
          source_entry_id: entry.id,
        });
      }
    }
    return;
  }

  for (const schema of data) {
    const filePath = join(REPO_ROOT, '.github', 'generated-skills', `${schema.slug}.skill.json`);
    writeFile(filePath, JSON.stringify(schema.schema, null, 2));
  }
  console.log(`[output/skills] Generated ${data.length} skill files`);
}

// ─── Storybook Generator ───────────────────────────────────────────────────

function generateStorybookStory(entry) {
  const componentName = entry.title
    ?.replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/(?:^|\s)(\w)/g, (_, c) => c.toUpperCase())
    .replace(/\s/g, '') ?? 'Component';

  return `import type { Meta, StoryObj } from '@storybook/react';

// Auto-generated from inbox entry: ${entry.id}
// Source: ${entry.source_file}
// Generated: ${new Date().toISOString()}

// TODO: Replace this placeholder with the actual component import
// import { ${componentName} } from '@repo/design-system';

const meta = {
  title: 'Generated/${componentName}',
  // component: ${componentName},
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: ${JSON.stringify(entry.summary ?? entry.extracted_text?.slice(0, 300) ?? '')},
      },
    },
  },
  tags: ${JSON.stringify(entry.tags ?? [])},
} satisfies Meta; // satisfies Meta<typeof ${componentName}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  // args: {},
};
`;
}

async function generateStorybook() {
  console.log('[output/storybook] Querying JSX/component entries...');
  const { data: entries, error } = await supabase
    .from('inbox_entries')
    .select('id, title, summary, extracted_text, source_file, tags, source_format')
    .in('source_format', ['jsx', 'tsx', 'component'])
    .eq('status', 'categorized')
    .limit(20);

  if (error) throw new Error(error.message);
  if (!entries?.length) {
    console.log('[output/storybook] No JSX/component entries found.');
    return;
  }

  for (const entry of entries) {
    const slug = entry.title
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 60) ?? entry.id.slice(0, 8);

    const content = generateStorybookStory(entry);
    const filePath = join(
      REPO_ROOT,
      'next-forge',
      'apps',
      'storybook',
      'stories',
      'generated',
      `${slug}.stories.tsx`
    );
    writeFile(filePath, content);

    if (!DRY_RUN) {
      await supabase.from('output_artefacts').upsert({
        artefact_type: 'storybook_story',
        title: entry.title ?? slug,
        content,
        file_path: filePath,
        status: 'draft',
        source_entry_id: entry.id,
      });
    }
  }
  console.log(`[output/storybook] Generated ${entries.length} story files`);
}

// ─── ADR Promoter ──────────────────────────────────────────────────────────

async function promoteAdrs() {
  console.log('[output/adr] Querying ADR candidates...');
  const { data: entries, error } = await supabase
    .from('inbox_entries')
    .select('id, title, summary, extracted_text, tags, created_at, agent_name, branch_name')
    .contains('tags', ['adr-candidate'])
    .in('severity', ['high', 'critical'])
    .eq('status', 'categorized')
    .limit(10);

  if (error) throw new Error(error.message);
  if (!entries?.length) {
    console.log('[output/adr] No ADR candidates found.');
    return;
  }

  // Find existing ADR count to number new ones
  const adrDir = join(REPO_ROOT, 'next-forge', 'docs', 'adr');
  const existingCount = existsSync(adrDir)
    ? (await import('fs')).readdirSync(adrDir).filter((f) => f.match(/^\d{4}-/)).length
    : 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const adrNumber = String(existingCount + i + 1).padStart(4, '0');
    const slug = entry.title
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 60) ?? entry.id.slice(0, 8);
    const filename = `${adrNumber}-${slug}.md`;
    const date = new Date(entry.created_at).toISOString().split('T')[0];

    const content = `# ADR-${adrNumber}: ${entry.title}

**Date**: ${date}  
**Status**: Proposed  
**Deciders**: ${entry.agent_name ?? 'Agent'}  
**Branch**: ${entry.branch_name ?? 'unknown'}  
**Source**: Inbox entry ${entry.id}  
**Tags**: ${(entry.tags ?? []).join(', ')}

---

## Context

${entry.summary ?? ''}

## Decision

${entry.extracted_text ?? ''}

## Consequences

> TODO: Document positive and negative consequences.

---

*Auto-promoted from inbox by output-generate.mjs on ${new Date().toISOString()}*
`;

    const filePath = join(adrDir, filename);
    writeFile(filePath, content);

    if (!DRY_RUN) {
      await supabase.from('output_artefacts').upsert({
        artefact_type: 'adr_md',
        title: `ADR-${adrNumber}: ${entry.title}`,
        content,
        file_path: filePath,
        status: 'draft',
        source_entry_id: entry.id,
      });

      // Mark entry as archived
      await supabase
        .from('inbox_entries')
        .update({
          status: 'archived',
          archive_location: filePath,
          archived_at: new Date().toISOString(),
        })
        .eq('id', entry.id);
    }
  }
  console.log(`[output/adr] Promoted ${entries.length} ADR candidates`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[output] Starting — type=${TYPE}, dry-run=${DRY_RUN}`);

  if (TYPE === 'skills' || TYPE === 'all') await generateSkills();
  if (TYPE === 'storybook' || TYPE === 'all') await generateStorybook();
  if (TYPE === 'adr' || TYPE === 'all') await promoteAdrs();

  console.log('[output] Pipeline complete');
}

main().catch((err) => {
  console.error('[output] Fatal:', err);
  process.exit(1);
});
