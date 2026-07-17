#!/usr/bin/env node
/**
 * Build GenerativeUI agent-generator, import molecule-generator dist,
 * serialize molecules (strip Zod functions), write catalog artifacts.
 * Fallback: embedded snapshot of 10 library molecules if build/import fails.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const GENERATIVE_ROOT = resolve(ROOT, 'GenerativeUI_monorepo');
const AGENT_GEN = resolve(GENERATIVE_ROOT, 'apps/agent-generator');
const DIST_MOLECULE = resolve(AGENT_GEN, 'dist/mcp-registry/molecule-generator.js');
const MOLECULES_DIR = resolve(ROOT, 'data/molecule-index/molecules');
const CATALOG_PATH = resolve(ROOT, 'data/molecule-index/catalog.v1.json');
const FORGE_CATALOG_DIR = resolve(ROOT, 'next-forge/packages/gen-engine/catalog');

/** Embedded fallback — 10 MoleculeLibrary entries when agent-generator build fails */
const FALLBACK_MOLECULES = [
  {
    id: 'file_explorer',
    name: 'File Explorer',
    description: 'Browse and navigate the file system',
    genUItier: 'static',
    parameterSchema: {
      type: 'object',
      properties: { path: { type: 'string' }, pattern: { type: 'string' } },
      required: ['path'],
    },
    constraints: ['Cannot access system directories without permission'],
    route_hint: 'component',
    tags: ['filesystem', 'navigation'],
    underlyingTools: ['filesystem.list_directory', 'filesystem.read_file'],
    complexity: 'simple',
    examples: [
      {
        description: 'Explore project structure',
        input: { path: '/workspace', pattern: '*.ts' },
        expectedOutcome: 'List of TypeScript files in workspace',
      },
    ],
  },
  {
    id: 'code_editor',
    name: 'Code Editor',
    description: 'View, edit, and create source code files',
    genUItier: 'static',
    parameterSchema: {
      type: 'object',
      properties: {
        filepath: { type: 'string' },
        action: { enum: ['read', 'write', 'append'] },
        content: { type: 'string' },
        language: { type: 'string' },
      },
      required: ['filepath', 'action'],
    },
    constraints: ['Write operations require explicit user approval'],
    route_hint: 'component',
    tags: ['code', 'filesystem'],
    underlyingTools: ['filesystem.read_file', 'filesystem.write_file'],
    complexity: 'moderate',
    examples: [],
  },
  {
    id: 'file_manager',
    name: 'File Manager',
    description: 'Create, move, delete files and directories',
    genUItier: 'declarative',
    parameterSchema: {
      type: 'object',
      properties: {
        action: { enum: ['create', 'move', 'delete', 'mkdir'] },
        source: { type: 'string' },
        destination: { type: 'string' },
      },
      required: ['action'],
    },
    constraints: ['Destructive operations require confirmation'],
    route_hint: 'component',
    tags: ['filesystem'],
    underlyingTools: ['filesystem.write_file'],
    complexity: 'moderate',
    examples: [],
  },
  {
    id: 'git_workspace',
    name: 'Git Workspace',
    description: 'View git status, diffs, branches',
    genUItier: 'declarative',
    parameterSchema: {
      type: 'object',
      properties: {
        action: { enum: ['status', 'diff', 'log', 'branches'] },
        branch: { type: 'string' },
      },
      required: ['action'],
    },
    constraints: ['Read-only operations only'],
    route_hint: 'component',
    tags: ['git'],
    underlyingTools: ['git.git_status'],
    complexity: 'simple',
    examples: [],
  },
  {
    id: 'git_committer',
    name: 'Git Committer',
    description: 'Stage and commit changes',
    genUItier: 'declarative',
    parameterSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        files: { type: 'array', items: { type: 'string' } },
      },
      required: ['message'],
    },
    constraints: ['Never force-push or amend without explicit approval'],
    route_hint: 'audit',
    tags: ['git'],
    underlyingTools: ['git.git_commit'],
    complexity: 'moderate',
    examples: [],
  },
  {
    id: 'sequential_analyzer',
    name: 'Sequential Analyzer',
    description: 'Break complex problems into steps',
    genUItier: 'open-ended',
    parameterSchema: {
      type: 'object',
      properties: {
        problem: { type: 'string' },
        maxSteps: { type: 'number' },
      },
      required: ['problem'],
    },
    constraints: ['Keep steps focused and small'],
    route_hint: 'visualization',
    tags: ['reasoning'],
    underlyingTools: ['sequential-thinking.create_thinking_process'],
    complexity: 'complex',
    examples: [],
  },
  {
    id: 'web_scraper',
    name: 'Web Scraper',
    description: 'Fetch and extract content from URLs',
    genUItier: 'declarative',
    parameterSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        selector: { type: 'string' },
      },
      required: ['url'],
    },
    constraints: ['Respect robots.txt and rate limits'],
    route_hint: 'component',
    tags: ['web', 'api'],
    underlyingTools: ['web.fetch'],
    complexity: 'moderate',
    examples: [],
  },
  {
    id: 'code_pattern_scanner',
    name: 'Code Pattern Scanner',
    description: 'Scan codebase for patterns and anti-patterns',
    genUItier: 'declarative',
    parameterSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string' },
        root: { type: 'string' },
      },
      required: ['pattern'],
    },
    constraints: ['Read-only scan'],
    route_hint: 'audit',
    tags: ['code'],
    underlyingTools: ['code.search'],
    complexity: 'moderate',
    examples: [],
  },
  {
    id: 'knowledge_intake',
    name: 'Knowledge Intake',
    description: 'Ingest inbox entries into knowledge pipeline',
    genUItier: 'declarative',
    parameterSchema: {
      type: 'object',
      properties: {
        action: { enum: ['classify', 'promote', 'audit'] },
        job_id: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['action'],
    },
    constraints: ['Service role required for promote'],
    route_hint: 'audit',
    tags: ['intake', 'knowledge'],
    underlyingTools: ['inbox.classify'],
    complexity: 'complex',
    examples: [],
  },
  {
    id: 'web_fetcher',
    name: 'Web Fetcher',
    description: 'Retrieve web pages for agent context',
    genUItier: 'static',
    parameterSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        format: { enum: ['markdown', 'text', 'html'] },
      },
      required: ['url'],
    },
    constraints: ['No authenticated endpoints without credentials'],
    route_hint: 'component',
    tags: ['web', 'api'],
    underlyingTools: ['web.fetch'],
    complexity: 'simple',
    examples: [],
  },
];

function sha256(input) {
  return createHash('sha256').update(input).digest('hex');
}

function inferRouteHint(molecule) {
  if (molecule.id?.includes('knowledge') || molecule.tags?.includes('intake')) {
    return 'audit';
  }
  if (
    molecule.tags?.some((tag) =>
      ['git', 'code', 'filesystem', 'development', 'web', 'api'].includes(tag)
    )
  ) {
    return 'component';
  }
  if (molecule.tags?.includes('reasoning')) {
    return 'visualization';
  }
  return 'dashboard';
}

function serializeMolecule(molecule, getComponent) {
  const record = {
    id: molecule.id,
    name: molecule.name,
    description: molecule.description,
    genUItier: molecule.genUItier,
    parameterSchema: molecule.parameterSchema ?? {},
    constraints: molecule.constraints ?? [],
    route_hint: inferRouteHint(molecule),
    tags: molecule.tags ?? [],
    underlyingTools: molecule.underlyingTools ?? [],
    complexity: molecule.complexity,
    examples: molecule.examples ?? [],
  };
  if (typeof getComponent === 'function') {
    try {
      record.component_path = getComponent(molecule);
    } catch {
      // optional
    }
  }
  return record;
}

function buildAgentGenerator() {
  const result = spawnSync(
    'yarn',
    ['workspace', '@monorepo/agent-generator', 'build'],
    { cwd: GENERATIVE_ROOT, encoding: 'utf8', shell: true }
  );
  return result.status === 0;
}

/**
 * Load molecules from built dist or fallback snapshot.
 * @returns {Promise<{ molecules: object[], source: 'dist' | 'fallback' }>}
 */
export async function exportMoleculeCatalog() {
  if (!existsSync(DIST_MOLECULE)) {
    const built = buildAgentGenerator();
    if (!built) {
      return { molecules: structuredClone(FALLBACK_MOLECULES), source: 'fallback' };
    }
  }

  try {
    const mod = await import(pathToFileURL(DIST_MOLECULE).href);
    const { MoleculeLibrary, generateMoleculesFromTools, getMoleculeComponent } = mod;

    let molecules = [];
    if (MoleculeLibrary && typeof MoleculeLibrary === 'object') {
      molecules = Object.values(MoleculeLibrary)
        .filter((factory) => typeof factory === 'function')
        .map((factory) => serializeMolecule(factory(), getMoleculeComponent));
    } else if (typeof generateMoleculesFromTools === 'function') {
      molecules = generateMoleculesFromTools([]).map((m) =>
        serializeMolecule(m, getMoleculeComponent)
      );
    }

    if (molecules.length === 0) {
      return { molecules: structuredClone(FALLBACK_MOLECULES), source: 'fallback' };
    }

    return { molecules, source: 'dist' };
  } catch {
    return { molecules: structuredClone(FALLBACK_MOLECULES), source: 'fallback' };
  }
}

/**
 * Write per-molecule JSON + catalog.v1.json + forge copy.
 * @param {{ semver?: string, stack?: string, dryRun?: boolean }} options
 */
export async function writeMoleculeCatalogArtifacts(options = {}) {
  const semver = options.semver ?? process.env.MOLECULE_INDEX_SEMVER ?? '1.0.0';
  const stack = options.stack ?? process.env.MOLECULE_INDEX_STACK ?? 'forge';
  const dryRun = options.dryRun ?? false;

  const { molecules, source } = await exportMoleculeCatalog();

  const contentHashes = {};
  for (const molecule of molecules) {
    const json = `${JSON.stringify(molecule, null, 2)}\n`;
    contentHashes[molecule.id] = sha256(json);
    if (!dryRun) {
      mkdirSync(MOLECULES_DIR, { recursive: true });
      writeFileSync(resolve(MOLECULES_DIR, `${molecule.id}.json`), json, 'utf8');
    }
  }

  const catalog = {
    version: semver,
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    stack,
    source_only: false,
    content_hashes: contentHashes,
    molecule_ids: molecules.map((m) => m.id),
    molecules,
    tiers: {
      static: molecules.filter((m) => m.genUItier === 'static').map((m) => m.id),
      declarative: molecules.filter((m) => m.genUItier === 'declarative').map((m) => m.id),
      'open-ended': molecules.filter((m) => m.genUItier === 'open-ended').map((m) => m.id),
    },
  };

  const catalogJson = `${JSON.stringify(catalog, null, 2)}\n`;
  const catalogHash = sha256(catalogJson);

  if (!dryRun) {
    mkdirSync(dirname(CATALOG_PATH), { recursive: true });
    writeFileSync(CATALOG_PATH, catalogJson, 'utf8');
    mkdirSync(FORGE_CATALOG_DIR, { recursive: true });
    writeFileSync(resolve(FORGE_CATALOG_DIR, 'catalog.v1.json'), catalogJson, 'utf8');
  }

  return {
    ok: true,
    source,
    moleculeCount: molecules.length,
    catalogPath: 'data/molecule-index/catalog.v1.json',
    catalogHash,
    tiers: catalog.tiers,
    molecules,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeMoleculeCatalogArtifacts()
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
