/**
 * AST indexer worker — ts-morph extraction for TS/TSX code patterns.
 * Output validated against code-chunk.v1 contract before Greptime upsert.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, SyntaxKind } from 'ts-morph';

export interface CodeChunk {
  path: string;
  ast_kind: string;
  symbol_name: string;
  content_hash: string;
  text: string;
  schema_json?: Record<string, unknown>;
  line_start?: number;
  line_end?: number;
  tags: string[];
}

export interface AstIndexOptions {
  rootDir: string;
  globs?: string[];
  maxFiles?: number;
}

const DEFAULT_GLOBS = [
  'scripts/**/*.mjs',
  'packages/**/*.mjs',
  'GenerativeUI_monorepo/apps/agent-generator/src/mcp-registry/**/*.ts',
  'experiments/micro-agents/**/*.ts',
];

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function inferAstKind(exportName: string, text: string): string {
  if (text.includes('z.object(') || text.includes('z.enum(')) return 'zod_schema';
  if (text.startsWith('class ')) return 'class';
  if (text.startsWith('interface ')) return 'interface';
  if (text.startsWith('type ')) return 'type_alias';
  if (text.startsWith('enum ')) return 'enum';
  if (text.includes('function ') || text.includes('=>')) return 'function';
  if (text.startsWith('const ')) return 'const';
  return 'export';
}

function chunkFromNode(
  repoRoot: string,
  filePath: string,
  symbolName: string,
  text: string,
  lineStart: number,
  lineEnd: number,
  extraTags: string[] = []
): CodeChunk {
  const rel = relative(repoRoot, filePath).replace(/\\/g, '/');
  return {
    path: rel,
    ast_kind: inferAstKind(symbolName, text),
    symbol_name: symbolName,
    content_hash: sha256(text),
    text: text.slice(0, 8000),
    line_start: lineStart,
    line_end: lineEnd,
    tags: ['ast-index', extname(filePath).slice(1), ...extraTags].filter(Boolean),
  };
}

export function indexTypeScriptPaths(options: AstIndexOptions): CodeChunk[] {
  const rootDir = resolve(options.rootDir);
  const globs = options.globs ?? DEFAULT_GLOBS;
  const maxFiles = options.maxFiles ?? 200;

  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    compilerOptions: { allowJs: true },
  });

  for (const pattern of globs) {
    project.addSourceFilesAtPaths(resolve(rootDir, pattern));
  }

  const chunks: CodeChunk[] = [];
  const files = project.getSourceFiles().slice(0, maxFiles);

  for (const sourceFile of files) {
    const filePath = sourceFile.getFilePath();
    if (!existsSync(filePath)) continue;

    for (const fn of sourceFile.getFunctions()) {
      const name = fn.getName();
      if (!name) continue;
      const start = fn.getStartLineNumber();
      const end = fn.getEndLineNumber();
      chunks.push(
        chunkFromNode(rootDir, filePath, name, fn.getText(), start, end, ['function'])
      );
    }

    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName() || 'anonymous_class';
      chunks.push(
        chunkFromNode(
          rootDir,
          filePath,
          name,
          cls.getText(),
          cls.getStartLineNumber(),
          cls.getEndLineNumber(),
          ['class']
        )
      );
    }

    for (const iface of sourceFile.getInterfaces()) {
      chunks.push(
        chunkFromNode(
          rootDir,
          filePath,
          iface.getName(),
          iface.getText(),
          iface.getStartLineNumber(),
          iface.getEndLineNumber(),
          ['interface']
        )
      );
    }

    for (const stmt of sourceFile.getVariableStatements()) {
      if (!stmt.isExported()) continue;
      for (const decl of stmt.getDeclarations()) {
        const name = decl.getName();
        const text = decl.getText();
        if (text.includes('z.object') || name.endsWith('Schema')) {
          chunks.push(
            chunkFromNode(
              rootDir,
              filePath,
              name,
              text,
              decl.getStartLineNumber(),
              decl.getEndLineNumber(),
              ['zod']
            )
          );
        }
      }
    }

    for (const [name, nodes] of sourceFile.getExportedDeclarations()) {
      for (const node of nodes) {
          if (
            node.getKind() === SyntaxKind.FunctionDeclaration ||
            node.getKind() === SyntaxKind.ClassDeclaration ||
            node.getKind() === SyntaxKind.InterfaceDeclaration
          ) {
            continue;
          }
          const text = node.getText();
          if (text.length < 20) continue;
          chunks.push(
            chunkFromNode(
              rootDir,
              filePath,
              name,
              text,
              node.getStartLineNumber(),
              node.getEndLineNumber(),
              ['export']
            )
          );
      }
    }
  }

  const seen = new Set<string>();
  return chunks.filter((c) => {
    const key = `${c.path}:${c.symbol_name}:${c.content_hash}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** CLI entry when run via node dist/workers/ast-indexer.js */
async function main() {
  const rootDir = process.argv[2] || resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  const chunks = indexTypeScriptPaths({ rootDir });
  process.stdout.write(JSON.stringify({ chunks, indexed_at: new Date().toISOString() }));
}

const isMain = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMain || process.argv[1]?.includes('ast-indexer')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
