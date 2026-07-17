#!/usr/bin/env node

/**

 * @feature MOLECULE.INDEX

 * Unified molecule indexing spine: generate_schemas → schema-crawler → molecules → code-index → manifest + catalog.

 *

 * Usage:

 *   node scripts/molecule-index-orchestrator.mjs [--stack forge|generative|legacy-root] [--paths a,b] [--semver 1.0.0] [--dry-run] [--code-index]

 */

import { spawnSync } from 'node:child_process';

import {

  existsSync,

  mkdirSync,

  readFileSync,

  writeFileSync,

  readdirSync,

  statSync,

} from 'node:fs';

import { createHash } from 'node:crypto';

import { dirname, join, relative, resolve } from 'node:path';

import { fileURLToPath } from 'node:url';

import { writeMoleculeCatalogArtifacts } from './lib/export-molecule-catalog.mjs';



const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT = resolve(__dirname, '..');

const MANIFEST_DIR = resolve(ROOT, 'data/molecule-index');

const MANIFEST_PATH = resolve(MANIFEST_DIR, 'manifest.json');

const CATALOG_PATH = resolve(MANIFEST_DIR, 'catalog.v1.json');



const STACK_PATHS = {

  forge: ['next-forge/packages/schemas', 'next-forge/apps'],

  generative: [

    'GenerativeUI_monorepo/apps/agent-generator/src/mcp-registry',

    'GenerativeUI_monorepo/apps/agent-server',

  ],

  'legacy-root': ['src/components/registry', 'agent', 'scripts/toolset-management'],

};



const GENERATE_SCHEMAS = resolve(

  ROOT,

  'GenerativeUI_monorepo/UniversalWorkbench/generate_schemas.py'

);

const SCHEMA_CRAWLER_DIST = resolve(

  ROOT,

  'GenerativeUI_monorepo/apps/agent-generator/dist/mcp-registry/schema-crawler.js'

);

const MOLECULE_GENERATOR = resolve(

  ROOT,

  'GenerativeUI_monorepo/apps/agent-generator/src/mcp-registry/molecule-generator.ts'

);



const args = process.argv.slice(2);

const DRY_RUN = args.includes('--dry-run');

const RUN_CODE_INDEX = args.includes('--code-index');

const stackIdx = args.indexOf('--stack');

const STACK = stackIdx >= 0 ? args[stackIdx + 1] : 'forge';

const semverIdx = args.indexOf('--semver');

const SEMVER = semverIdx >= 0 ? args[semverIdx + 1] : '1.0.0';

const pathsIdx = args.indexOf('--paths');

const EXTRA_PATHS =

  pathsIdx >= 0 ? args[pathsIdx + 1].split(',').map((p) => p.trim()).filter(Boolean) : [];



function sha256(input) {

  return createHash('sha256').update(input).digest('hex');

}



function log(msg) {

  console.log(`[molecule-index] ${msg}`);

}



function runSchemaCrawler() {

  const agentGenRoot = resolve(ROOT, 'GenerativeUI_monorepo');

  if (!existsSync(SCHEMA_CRAWLER_DIST)) {

    log('schema-crawler dist missing — building @monorepo/agent-generator');

    const build = spawnSync('yarn', ['workspace', '@monorepo/agent-generator', 'build'], {

      cwd: agentGenRoot,

      encoding: 'utf8',

      shell: true,

    });

    if (build.status !== 0) {

      log(`schema-crawler build warning: ${build.stderr?.slice(0, 200) || 'non-zero exit'}`);

      return { ok: false, skipped: true };

    }

  }



  if (!existsSync(SCHEMA_CRAWLER_DIST)) {

    log('skip schema-crawler — dist not found after build');

    return { ok: false, skipped: true };

  }



  if (DRY_RUN) {

    log('DRY RUN would run schema-crawler dist');

    return { ok: true, dryRun: true };

  }



  const result = spawnSync('node', [SCHEMA_CRAWLER_DIST], {

    cwd: agentGenRoot,

    encoding: 'utf8',

    shell: true,

  });

  if (result.status !== 0) {

    log(`schema-crawler warning: ${result.stderr?.slice(0, 300) || 'non-zero exit'}`);

    return { ok: false, error: result.stderr };

  }

  return { ok: true };

}



function runPythonGenerateSchemas() {

  if (!existsSync(GENERATE_SCHEMAS)) {

    log(`skip generate_schemas — not found: ${relative(ROOT, GENERATE_SCHEMAS)}`);

    return { ok: false, skipped: true };

  }

  if (DRY_RUN) {

    log('DRY RUN would run generate_schemas.py');

    return { ok: true, dryRun: true };

  }

  const result = spawnSync('python', [GENERATE_SCHEMAS, 'schemas'], {

    cwd: dirname(GENERATE_SCHEMAS),

    encoding: 'utf8',

    shell: true,

  });

  if (result.status !== 0) {

    log(`generate_schemas warning: ${result.stderr?.slice(0, 200) || 'non-zero exit'}`);

    return { ok: false, error: result.stderr };

  }

  return { ok: true };

}



function collectZodModules(paths) {

  const entries = [];

  for (const base of paths) {

    const abs = resolve(ROOT, base);

    if (!existsSync(abs)) continue;

    walk(abs, (file) => {

      if (file.endsWith('.ts') && (file.includes('schema') || file.includes('contract'))) {

        entries.push({

          kind: 'zod_module',

          id: sha256(relative(ROOT, file)).slice(0, 16),

          path: relative(ROOT, file).replace(/\\/g, '/'),

          semver: SEMVER,

          zod_export: null,

          greptime_id: null,

          route_hint: inferRouteHint(file),

        });

      }

    });

  }

  return entries;

}



function collectMcpMolecules() {

  const moleculesDir = resolve(MANIFEST_DIR, 'molecules');

  if (existsSync(moleculesDir)) {

    return readdirSync(moleculesDir)

      .filter((f) => f.endsWith('.json'))

      .map((f) => {

        const raw = readFileSync(join(moleculesDir, f), 'utf8');

        const record = JSON.parse(raw);

        return {

          kind: 'mcp_molecule',

          id: record.id,

          path: `data/molecule-index/molecules/${f}`,

          semver: SEMVER,

          zod_export: 'validateMolecule',

          greptime_id: null,

          route_hint: record.route_hint ?? 'component',

        };

      });

  }

  return [];

}



function collectToolsetEntries() {

  const toolsetDir = resolve(ROOT, 'scripts/toolset-management');

  if (!existsSync(toolsetDir)) return [];

  return readdirSync(toolsetDir)

    .filter((f) => f.endsWith('.mjs') || f.endsWith('.json'))

    .map((f) => ({

      kind: 'toolset_entry',

      id: f.replace(/\.[^.]+$/, ''),

      path: relative(ROOT, join(toolsetDir, f)).replace(/\\/g, '/'),

      semver: SEMVER,

      zod_export: null,

      greptime_id: null,

      route_hint: 'audit',

    }));

}



function walk(dir, onFile) {

  for (const name of readdirSync(dir)) {

    const full = join(dir, name);

    if (name === 'node_modules' || name === '.vendor' || name === 'dist') continue;

    const st = statSync(full);

    if (st.isDirectory()) walk(full, onFile);

    else onFile(full);

  }

}



function inferRouteHint(filePath) {

  const lower = filePath.toLowerCase();

  if (lower.includes('chart') || lower.includes('dashboard')) return 'visualization';

  if (lower.includes('registry') || lower.includes('component')) return 'component';

  if (lower.includes('inbox') || lower.includes('audit')) return 'audit';

  return 'dashboard';

}



function runCodeIndexDryRun() {

  const orchestrator = resolve(ROOT, 'scripts/code-index-orchestrator.mjs');

  if (!existsSync(orchestrator)) {

    log('skip code-index — orchestrator not present');

    return { ok: false, skipped: true };

  }

  const indexArgs = ['--dry-run'];

  if (STACK === 'generative') {

    indexArgs.push('--root', 'GenerativeUI_monorepo/apps/agent-generator/src/mcp-registry');

  }

  const result = spawnSync('node', [orchestrator, ...indexArgs], {

    cwd: ROOT,

    encoding: 'utf8',

    stdio: 'inherit',

    shell: true,

  });

  return { ok: result.status === 0 };

}



async function main() {

  if (!STACK_PATHS[STACK] && EXTRA_PATHS.length === 0) {

    console.error(`Unknown stack "${STACK}". Use forge|generative|legacy-root`);

    process.exit(1);

  }



  const scanPaths = [...(STACK_PATHS[STACK] || []), ...EXTRA_PATHS];

  log(`stack=${STACK} semver=${SEMVER} paths=${scanPaths.join(', ')}`);



  const stages = [];



  const schemaResult = runPythonGenerateSchemas();

  stages.push({ stage: 'generate_schemas', ...schemaResult });



  const zodExport = runSchemaCrawler();

  stages.push({

    stage: 'schema_crawler',

    path: relative(ROOT, SCHEMA_CRAWLER_DIST),

    ...zodExport,

  });



  let catalogResult = { ok: false, skipped: true };

  if (!DRY_RUN) {

    catalogResult = await writeMoleculeCatalogArtifacts({

      semver: SEMVER,

      stack: STACK,

      dryRun: false,

    });

    stages.push({

      stage: 'molecule_export',

      path: relative(ROOT, MOLECULE_GENERATOR),

      ...catalogResult,

    });

  } else {

    log('DRY RUN would export molecule catalog');

    stages.push({ stage: 'molecule_export', dryRun: true, ok: true });

  }



  const molecules = [

    ...collectMcpMolecules(),

    ...collectZodModules(scanPaths),

    ...collectToolsetEntries(),

  ];



  if (STACK === 'legacy-root') {

    molecules.push({

      kind: 'legacy_satellite',

      id: 'genai_toolbox',

      path: 'agent/genai-toolbox',

      semver: SEMVER,

      zod_export: null,

      greptime_id: null,

      route_hint: 'audit',

    });

    molecules.push({

      kind: 'knowledge_chunk',

      id: 'inbox_pipeline',

      path: 'docs/inbox-pipeline',

      semver: SEMVER,

      zod_export: 'packages/intake-contracts',

      greptime_id: null,

      route_hint: 'audit',

    });

  }



  if (RUN_CODE_INDEX) {

    stages.push({ stage: 'code_index', ...(await runCodeIndexDryRun()) });

  }



  const catalogExists = existsSync(CATALOG_PATH) || catalogResult.ok;

  const catalogHash =

    catalogResult.catalogHash ??

    (catalogExists ? sha256(readFileSync(CATALOG_PATH, 'utf8')) : null);



  const manifest = {

    version: SEMVER,

    generated_at: new Date().toISOString(),

    stack: STACK,

    schema_version: '1.0.0',

    record_kinds: [

      'ts_ast',

      'zod_module',

      'mcp_molecule',

      'toolset_entry',

      'knowledge_chunk',

      'legacy_satellite',

    ],

    stages,

    molecules,

    source_only: false,

    catalog_path: catalogExists ? 'data/molecule-index/catalog.v1.json' : null,

    catalog_hash: catalogHash,

    excludes: ['node_modules', '.vendor', 'dist'],

  };



  if (DRY_RUN) {

    log(`DRY RUN manifest would write ${molecules.length} molecules`);

    console.log(JSON.stringify(manifest, null, 2));

    return;

  }



  mkdirSync(MANIFEST_DIR, { recursive: true });

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  log(`wrote ${relative(ROOT, MANIFEST_PATH)} (${molecules.length} molecules)`);



  if (catalogExists) {

    log(`catalog emitted at ${relative(ROOT, CATALOG_PATH)} (hash ${catalogHash?.slice(0, 12)}…)`);

  }

}



main().catch((err) => {

  console.error('Fatal:', err);

  process.exit(1);

});


