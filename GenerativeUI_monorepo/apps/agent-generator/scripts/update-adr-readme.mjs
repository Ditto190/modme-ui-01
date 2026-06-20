import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// Resolve helper
const __dirname = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));

function parseArgs(argv) {
  const args = { inbox: null, out: null, dryRun: false, commit: false, force: false, authorName: null, authorEmail: null };
  const it = argv[2] ? argv.slice(2) : [];
  for (let i = 0; i < it.length; i++) {
    const a = it[i];
    switch (a) {
      case '--inbox':
        args.inbox = it[++i];
        break;
      case '--out':
        args.out = it[++i];
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--commit':
        args.commit = true;
        break;
      case '--force':
        args.force = true;
        break;
      case '--author-name':
        args.authorName = it[++i];
        break;
      case '--author-email':
        args.authorEmail = it[++i];
        break;
      default:
        // accept single file path as positional inbox
        if (!args.inbox && !a.startsWith('--')) {
          args.inbox = a;
        }
        break;
    }
  }
  return args;
}

async function findInboxFiles(inboxPath) {
  const stat = await fs.stat(inboxPath);
  if (stat.isFile()) return [inboxPath];
  // directory
  const entries = await fs.readdir(inboxPath, { withFileTypes: true });
  return entries.filter(e => e.isFile() && e.name.endsWith('.md')).map(e => path.join(inboxPath, e.name));
}

import { pathToFileURL } from 'url';

async function main() {
  const args = parseArgs(process.argv);

  const defaultInbox = path.resolve(__dirname, '..', '..', 'docs', 'inbox');
  const defaultOut = path.resolve(__dirname, '..', 'GENERATED_README.md');
  const inbox = args.inbox ? path.resolve(args.inbox) : defaultInbox;
  const out = args.out ? path.resolve(args.out) : defaultOut;

  // Import registry modules from dist build
  const distBase = path.resolve(__dirname, '..', 'dist', 'mcp-registry');
  const regFetcherPath = path.join(distBase, 'registry-fetcher.js');
  const molGenPath = path.join(distBase, 'molecule-generator.js');
  const agentInstrPath = path.join(distBase, 'agent-instructions.js');

  let registryModule, moleculeModule, agentModule;
  try {
    registryModule = await import(pathToFileURL(regFetcherPath).href);
    moleculeModule = await import(pathToFileURL(molGenPath).href);
    agentModule = await import(pathToFileURL(agentInstrPath).href);
  } catch (e) {
    // Fallback to src (assumes .js transpiled present)
    const altBase = path.resolve(__dirname, '..', 'src', 'mcp-registry');
    try {
      registryModule = await import(pathToFileURL(path.join(altBase, 'registry-fetcher.js')).href);
      moleculeModule = await import(pathToFileURL(path.join(altBase, 'molecule-generator.js')).href);
      agentModule = await import(pathToFileURL(path.join(altBase, 'agent-instructions.js')).href);
    } catch (e2) {
      console.error('Failed to import mcp-registry modules from dist or src. Ensure package is built.');
      throw e2;
    }
  }

  const { getValidatedRegistry, getAllTools } = registryModule;
  const { generateMoleculesFromTools, getMoleculeComponent } = moleculeModule;
  const { generateAgentInstructions } = agentModule;

  const registry = await getValidatedRegistry();
  const tools = getAllTools(registry);
  const molecules = generateMoleculesFromTools(tools);

  // Read inbox files
  let inboxFiles = [];
  try {
    inboxFiles = await findInboxFiles(inbox);
  } catch (e) {
    console.error(`Inbox path not found: ${inbox}`);
    process.exit(2);
  }

  const notes = [];
  for (const f of inboxFiles) {
    const content = await fs.readFile(f, 'utf-8');
    notes.push({ path: f, content });
  }

  // Simple mapping: for each molecule, find notes that mention its id or name
  const mapped = molecules.map(m => {
    const key = m.id.toLowerCase();
    const name = (m.name || '').toLowerCase();
    const matches = notes.filter(n => n.content.toLowerCase().includes(key) || n.content.toLowerCase().includes(name));
    return { molecule: m, matches };
  }).filter(x => x.matches.length > 0);

  // Build README content
  const lines = [];
  lines.push(`# ADR README (Generated)`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('This README maps inbox architecture notes to known molecules and MCP patterns.');
  lines.push('');
  lines.push('## Mapped Patterns');
  if (mapped.length === 0) {
    lines.push('_No patterns matched inbox notes._');
  } else {
    mapped.forEach(m => {
      lines.push(`- **${m.molecule.name}** (${m.molecule.id}): ${m.molecule.description}`);
      m.matches.forEach(n => {
        lines.push(`  - Note: ${path.relative(process.cwd(), n.path)}`);
      });
    });
  }
  lines.push('');
  lines.push('## File mappings');
  // list components for top molecules
  const referencedFiles = new Set();
  molecules.slice(0, 10).forEach(m => {
    const comp = getMoleculeComponent(m);
    if (comp) referencedFiles.add(comp);
  });
  referencedFiles.forEach(f => lines.push(`- ${f}`));
  lines.push('');
  lines.push('## Evidence');
  notes.forEach(n => lines.push(`- ${path.relative(process.cwd(), n.path)}`));
  lines.push('');
  lines.push('## Changelog');
  lines.push(`- ${new Date().toISOString()}: Generated README snapshot`);

  const outContent = lines.join('\n');

  if (args.dryRun) {
    console.log(outContent);
  } else {
    await fs.writeFile(out, outContent, 'utf-8');
    console.log(`Wrote ${out}`);
  }

  if (args.commit) {
    // Ensure git clean state
    const status = execSync('git status --porcelain').toString();
    if (status.trim() && !args.force) {
      console.error('Repository has uncommitted changes. Refuse to auto-commit unless --force is provided.');
      process.exit(3);
    }

    const repoRoot = path.resolve(__dirname, '..', '..');
    // Stage file
    try {
      execSync(`git add "${out}"`, { cwd: repoRoot, stdio: 'inherit' });
      const envArgs = [];
      if (args.authorName) envArgs.push(`-c user.name=\"${args.authorName}\"`);
      if (args.authorEmail) envArgs.push(`-c user.email=\"${args.authorEmail}\"`);
      const commitCmd = `${envArgs.join(' ')} git commit -m "chore: auto-update ADR README from inbox\n\nSelf-review: Generated mapping of inbox notes to molecules.\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"`;
      execSync(commitCmd, { cwd: repoRoot, stdio: 'inherit' });
    } catch (e) {
      console.error('Git commit failed:', e.message);
      process.exit(4);
    }
  }
}

// Run
main().catch(err => {
  console.error(err);
  process.exit(1);
});
