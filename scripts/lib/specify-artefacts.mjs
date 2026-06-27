/**
 * Auto-generate Specify spec/tasks for high-severity architecture/design/solution entries.
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const SPEC_TEMPLATE = join(ROOT, '.specify/templates/spec-template.md');
const TASKS_TEMPLATE = join(ROOT, '.specify/templates/tasks-template.md');

const HIGH_SEVERITY = new Set(['high', 'critical']);
const SPEC_TYPES = new Set(['architecture', 'design', 'solution']);

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ entryId: string, contentHash: string, entryType: string, severity: string, title?: string, summary?: string, features?: Record<string, unknown> }} ctx
 */
export async function maybeGenerateSpecifyArtefacts(supabase, ctx) {
  if (!HIGH_SEVERITY.has(ctx.severity) || !SPEC_TYPES.has(ctx.entryType)) {
    return null;
  }

  const prefix = ctx.contentHash.slice(0, 8);
  const specDir = join(ROOT, 'specs', `intake-${prefix}`);
  const specPath = join(specDir, 'spec.md');
  const tasksPath = join(specDir, 'tasks.md');

  if (existsSync(specPath) && existsSync(tasksPath)) {
    return { specPath, tasksPath, skipped: true };
  }

  mkdirSync(specDir, { recursive: true });

  const specTpl = readFileSync(SPEC_TEMPLATE, 'utf8');
  const tasksTpl = readFileSync(TASKS_TEMPLATE, 'utf8');
  const now = new Date().toISOString().slice(0, 10);
  const featureName = ctx.title || `Intake ${prefix}`;

  const specBody = specTpl
    .replace('[FEATURE NAME]', featureName)
    .replace('[###-feature-name]', `intake-${prefix}`)
    .replace('[DATE]', now)
    .replace('$ARGUMENTS', ctx.summary || ctx.title || 'Promoted from intake pipeline');

  const features = ctx.features && typeof ctx.features === 'object' ? ctx.features : {};
  const featureKeys = Object.keys(features).slice(0, 5);
  const tasksBody = tasksTpl
    .replace('[FEATURE NAME]', featureName)
    .replace('[###-feature-name]', `intake-${prefix}`)
    .replace('[DATE]', now)
    .concat(
      '\n\n## Mapped intake features\n',
      featureKeys.length
        ? featureKeys.map((k, i) => `- FR-${i + 1}: ${k}`).join('\n')
        : '- FR-1: Review promoted intake entry'
    );

  writeFileSync(specPath, specBody, 'utf8');
  writeFileSync(tasksPath, tasksBody, 'utf8');

  const { data: schema } = await supabase
    .from('output_schemas')
    .select('id')
    .eq('slug', 'specify-intake')
    .maybeSingle();

  if (schema?.id) {
    await supabase.from('output_artefacts').insert({
      artefact_type: 'specify',
      title: featureName,
      content: specBody,
      file_path: specPath,
      status: 'draft',
      source_entry_id: ctx.entryId,
      schema_id: schema.id,
    });
  }

  return { specPath, tasksPath };
}
