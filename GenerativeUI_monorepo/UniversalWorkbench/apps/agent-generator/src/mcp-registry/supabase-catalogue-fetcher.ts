/**
 * supabase-catalogue-fetcher.ts
 *
 * Fetches OutputSchema and InboxEntry records from Supabase to use as
 * source material for generating molecules, skills, and Storybook stories.
 *
 * @feature DB.SCHEMA.FETCH
 * @domain INBOX
 * @layer AGENT
 */

interface SupabaseQueryResponse {
  data: Array<Record<string, unknown>> | null;
  error: { message: string } | null;
}

interface SupabaseQueryBuilder extends PromiseLike<SupabaseQueryResponse> {
  eq(column: string, value: string): SupabaseQueryBuilder;
  limit(count: number): SupabaseQueryBuilder;
  order(column: string, options: { ascending: boolean }): SupabaseQueryBuilder;
  select(columns: string): SupabaseQueryBuilder;
}

interface SupabaseTableClient {
  select(columns: string): SupabaseQueryBuilder;
}

interface SupabaseClientLike {
  from(table: string): SupabaseTableClient;
}

interface SupabaseModuleLike {
  createClient(url: string, key: string): SupabaseClientLike;
}

export interface CatalogueEntry {
  id: string;
  schemaType: 'skill' | 'agent' | 'component' | 'doc' | 'storybook';
  name: string;
  slug: string;
  version: string;
  schema: Record<string, unknown>;
  artefacts?: CatalogueArtefact[];
}

export interface CatalogueArtefact {
  id: string;
  artefactType: string;
  title: string;
  content: string;
  filePath?: string;
  status: 'draft' | 'published' | 'archived';
}

export interface SupabaseCatalogueFetcherOptions {
  supabaseUrl?: string;
  supabaseKey?: string;
  limit?: number;
  schemaType?: string;
  status?: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSupabaseModuleLike(value: unknown): value is SupabaseModuleLike {
  return (
    isObjectRecord(value) &&
    'createClient' in value &&
    typeof value['createClient'] === 'function'
  );
}

async function loadSupabaseModule(): Promise<SupabaseModuleLike | null> {
  try {
    const importedModule = (await new Function(
      "return import('@supabase/supabase-js');"
    )()) as unknown;

    if (!isSupabaseModuleLike(importedModule)) {
      console.warn('[supabase-catalogue-fetcher] Supabase module missing createClient export');
      return null;
    }

    return importedModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown import error';
    console.warn(`[supabase-catalogue-fetcher] Failed to load Supabase client: ${message}`);
    return null;
  }
}

function normaliseArtefact(value: unknown): CatalogueArtefact | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  return {
    id: typeof value['id'] === 'string' ? value['id'] : '',
    artefactType: typeof value['artefact_type'] === 'string' ? value['artefact_type'] : 'unknown',
    title: typeof value['title'] === 'string' ? value['title'] : 'Untitled artefact',
    content: typeof value['content'] === 'string' ? value['content'] : '',
    filePath: typeof value['file_path'] === 'string' ? value['file_path'] : undefined,
    status:
      value['status'] === 'published' || value['status'] === 'archived'
        ? value['status']
        : 'draft',
  };
}

function normaliseCatalogueEntry(row: Record<string, unknown>): CatalogueEntry {
  const artefactRows = Array.isArray(row['artefacts']) ? row['artefacts'] : [];
  const artefacts = artefactRows
    .map((artefact) => normaliseArtefact(artefact))
    .filter((artefact): artefact is CatalogueArtefact => artefact !== null);

  return {
    id: typeof row['id'] === 'string' ? row['id'] : '',
    schemaType:
      row['schema_type'] === 'skill' ||
      row['schema_type'] === 'agent' ||
      row['schema_type'] === 'component' ||
      row['schema_type'] === 'doc' ||
      row['schema_type'] === 'storybook'
        ? row['schema_type']
        : 'doc',
    name: typeof row['name'] === 'string' ? row['name'] : 'Untitled entry',
    slug: typeof row['slug'] === 'string' ? row['slug'] : '',
    version: typeof row['version'] === 'string' ? row['version'] : '1.0.0',
    schema: isObjectRecord(row['schema']) ? row['schema'] : {},
    artefacts,
  };
}

function getSeverityRank(value: unknown): number {
  switch (typeof value === 'string' ? value.toLowerCase() : '') {
    case 'critical':
      return 5;
    case 'high':
      return 4;
    case 'medium':
      return 3;
    case 'low':
      return 2;
    case 'info':
      return 1;
    default:
      return 0;
  }
}

export async function fetchCatalogueEntries(
  options: SupabaseCatalogueFetcherOptions = {}
): Promise<CatalogueEntry[]> {
  const url = options.supabaseUrl ?? process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = options.supabaseKey ?? process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !key) {
    console.warn('[supabase-catalogue-fetcher] No Supabase credentials — returning empty catalogue');
    return [];
  }

  const supabaseModule = await loadSupabaseModule();
  if (!supabaseModule) {
    return [];
  }

  try {
    const supabase = supabaseModule.createClient(url, key);
    const limit = options.limit ?? 100;

    let query = supabase
      .from('output_schemas')
      .select('*, artefacts:output_artefacts(*)')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (options.schemaType) {
      query = query.eq('schema_type', options.schemaType);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[supabase-catalogue-fetcher] Query error: ${error.message}`);
      return [];
    }

    return (data ?? []).map((row) => normaliseCatalogueEntry(row));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown query error';
    console.error(`[supabase-catalogue-fetcher] Catalogue fetch failed: ${message}`);
    return [];
  }
}

export async function fetchInboxEntriesForGeneration(
  options: SupabaseCatalogueFetcherOptions & { entryType?: string; minSeverity?: string } = {}
): Promise<Array<Record<string, unknown>>> {
  const url = options.supabaseUrl ?? process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = options.supabaseKey ?? process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !key) {
    console.warn('[supabase-catalogue-fetcher] No Supabase credentials — returning empty inbox');
    return [];
  }

  const supabaseModule = await loadSupabaseModule();
  if (!supabaseModule) {
    return [];
  }

  try {
    const supabase = supabaseModule.createClient(url, key);
    const targetStatus = options.status ?? 'categorized';
    let query = supabase
      .from('inbox_entries')
      .select('id, title, summary, entry_type, tags, severity, extracted_text, status')
      .eq('status', targetStatus)
      .order('created_at', { ascending: false })
      .limit(options.limit ?? 50);

    if (options.entryType) {
      query = query.eq('entry_type', options.entryType);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`[supabase-catalogue-fetcher] Inbox query error: ${error.message}`);
      return [];
    }

    const inboxEntries = (data ?? []).filter((row) => isObjectRecord(row));
    if (!options.minSeverity) {
      return inboxEntries;
    }

    const minimumRank = getSeverityRank(options.minSeverity);
    return inboxEntries.filter((row) => getSeverityRank(row['severity']) >= minimumRank);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown query error';
    console.error(`[supabase-catalogue-fetcher] Inbox fetch failed: ${message}`);
    return [];
  }
}
