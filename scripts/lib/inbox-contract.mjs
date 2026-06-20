/**
 * @feature INBOX.CONTRACT.VALIDATE
 * Load inbox contract v1 and validate funnel files / DB rows / manifest.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '../..');

export const INBOX_DIR = join(
  REPO_ROOT,
  'GenerativeUI_monorepo/docs/inbox'
);

export const CONTRACT_PATH = join(
  REPO_ROOT,
  'docs/inbox-pipeline/contracts/inbox-contract.v1.json'
);

export const FORMAT_MAP = {
  '.md': 'md',
  '.markdown': 'md',
  '.txt': 'txt',
  '.csv': 'csv',
  '.pdf': 'pdf',
  '.html': 'html',
  '.htm': 'html',
  '.url': 'url',
  '.jsx': 'jsx',
  '.tsx': 'jsx',
  '.ts': 'snippet',
  '.js': 'snippet',
  '.py': 'snippet',
  '.sh': 'snippet',
  '.json': 'snippet',
  '.yaml': 'snippet',
  '.yml': 'snippet',
};

export const SKIP_FILES = new Set(['README.md', '_index.json', '.gitkeep', 'knowledge.db']);
export const TEXT_FORMATS = new Set(['md', 'txt', 'csv', 'html', 'url', 'jsx', 'snippet']);

let _contract = null;

export function loadContract() {
  if (_contract) return _contract;
  if (!existsSync(CONTRACT_PATH)) {
    throw new Error(`Missing contract: ${CONTRACT_PATH}. Run: cd next-forge/packages/schemas && node scripts/export-inbox-contract.mjs`);
  }
  _contract = JSON.parse(readFileSync(CONTRACT_PATH, 'utf8'));
  return _contract;
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function listInboxFilesSync(inboxDir = INBOX_DIR) {
  if (!existsSync(inboxDir)) return [];
  return readdirSync(inboxDir).filter((f) => {
    if (SKIP_FILES.has(f) || f.startsWith('.')) return false;
    const ext = extname(f).toLowerCase();
    return ext in FORMAT_MAP;
  });
}

export function parseInboxFile(filePath, filename) {
  const ext = extname(filename).toLowerCase();
  const format = FORMAT_MAP[ext] || 'txt';
  let rawContent = '';
  let isBinary = false;

  if (format === 'pdf') {
    isBinary = true;
    rawContent = `[Binary PDF: ${filename}]`;
  } else if (TEXT_FORMATS.has(format)) {
    rawContent = readFileSync(filePath, 'utf8');
  } else {
    isBinary = true;
    rawContent = `[Binary file: ${filename}]`;
  }

  let frontmatter = {};
  let body = rawContent;
  if (format === 'md') {
    try {
      const parsed = matter(rawContent);
      frontmatter = parsed.data ?? {};
      body = parsed.content ?? '';
    } catch {
      frontmatter = { _parseError: true };
    }
  }

  return {
    path: filePath,
    filename,
    format,
    rawContent,
    body,
    frontmatter,
    contentHash: sha256(rawContent),
    isBinary,
  };
}

export function isIsoTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export function validateFrontmatter(frontmatter, contract, { requireAll = false } = {}) {
  const findings = [];
  const { enums } = contract;

  if (frontmatter._parseError) {
    findings.push({
      code: 'INBOX.FM.MALFORMED_YAML',
      severity: 'error',
      automatable: true,
      message: 'Frontmatter YAML could not be parsed',
      fixHint: 'Re-serialize frontmatter with gray-matter',
    });
    return findings;
  }

  if (requireAll || frontmatter.timestamp !== undefined) {
    if (!frontmatter.timestamp) {
      findings.push({
        code: 'INBOX.FM.MISSING_TIMESTAMP',
        severity: 'error',
        automatable: true,
        message: 'Missing required frontmatter.timestamp',
        fixHint: 'Set timestamp from file mtime (ISO 8601 UTC)',
      });
    } else if (!isIsoTimestamp(String(frontmatter.timestamp))) {
      findings.push({
        code: 'INBOX.FM.INVALID_TIMESTAMP',
        severity: 'warning',
        automatable: true,
        message: `Invalid timestamp format: ${frontmatter.timestamp}`,
        fixHint: 'Use ISO 8601 UTC e.g. 2026-06-20T13:08:52Z',
      });
    }
  } else if (!frontmatter.timestamp) {
    findings.push({
      code: 'INBOX.FM.MISSING_TIMESTAMP',
      severity: 'error',
      automatable: true,
      message: 'Missing required frontmatter.timestamp',
      fixHint: 'Set timestamp from file mtime (ISO 8601 UTC)',
    });
  }

  if (!frontmatter.agent) {
    findings.push({
      code: 'INBOX.FM.MISSING_AGENT',
      severity: 'error',
      automatable: true,
      message: 'Missing required frontmatter.agent',
      fixHint: 'Set agent: unknown',
    });
  }

  if (!frontmatter.type) {
    findings.push({
      code: 'INBOX.FM.MISSING_TYPE',
      severity: 'error',
      automatable: true,
      message: 'Missing required frontmatter.type',
      fixHint: 'Infer type from filename prefix or use research',
    });
  } else if (!enums.entryType.includes(frontmatter.type)) {
    findings.push({
      code: 'INBOX.FM.INVALID_TYPE',
      severity: 'error',
      automatable: false,
      message: `Invalid type: ${frontmatter.type}`,
      fixHint: `Must be one of: ${enums.entryType.join(', ')}`,
    });
  }

  if (frontmatter.severity && !enums.severity.includes(frontmatter.severity)) {
    findings.push({
      code: 'INBOX.FM.INVALID_SEVERITY',
      severity: 'error',
      automatable: true,
      message: `Invalid severity: ${frontmatter.severity}`,
      fixHint: 'Reset to medium',
    });
  }

  if (frontmatter.agent_role && !enums.agentRole.includes(frontmatter.agent_role)) {
    findings.push({
      code: 'INBOX.FM.INVALID_AGENT_ROLE',
      severity: 'warning',
      automatable: false,
      message: `Invalid agent_role: ${frontmatter.agent_role}`,
      fixHint: `Use one of: ${enums.agentRole.join(', ')}`,
    });
  }

  return findings;
}

export function validateMdFilename(filename) {
  const structured =
    /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}_[a-z-]+_[a-z-]+_[a-z0-9-]+\.md$/i.test(filename);
  if (!structured && !filename.startsWith('.')) {
    return {
      code: 'INBOX.FM.FILENAME_CONVENTION',
      severity: 'warning',
      automatable: false,
      message: `Filename does not match structured convention: ${filename}`,
      fixHint: 'Use YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md for structured captures',
    };
  }
  return null;
}

export function inferTypeFromFilename(filename) {
  const base = basename(filename, extname(filename));
  const parts = base.split('_');
  if (parts.length >= 2 && /^\d{4}-\d{2}-\d{2}T/.test(base)) {
    const candidate = parts[1];
    const contract = loadContract();
    if (contract.enums.entryType.includes(candidate)) return candidate;
  }
  const ext = extname(filename).toLowerCase();
  if (ext === '.md') return 'research';
  if (['.jsx', '.tsx'].includes(ext)) return 'component';
  if (['.ts', '.js', '.py', '.sh'].includes(ext)) return 'snippet';
  if (ext === '.url' || ext === '.txt') return 'link';
  return 'research';
}

export function validateFunnelFile(parsed, contract, options = {}) {
  const { requireMdFrontmatter = true } = options;
  const findings = [];

  if (!contract.enums.sourceFormat.includes(parsed.format)) {
    findings.push({
      code: 'INBOX.FM.INVALID_FORMAT',
      severity: 'error',
      automatable: false,
      message: `Unknown source format: ${parsed.format}`,
    });
  }

  if (parsed.format === 'md' && requireMdFrontmatter) {
    findings.push(
      ...validateFrontmatter(parsed.frontmatter, contract, { requireAll: true }).map((f) => ({
        ...f,
        file: parsed.filename,
        lens: 'funnel',
      }))
    );
    const fnFinding = validateMdFilename(parsed.filename);
    if (fnFinding) {
      findings.push({ ...fnFinding, file: parsed.filename, lens: 'funnel' });
    }
  }

  if (TEXT_FORMATS.has(parsed.format) && !parsed.rawContent.trim()) {
    findings.push({
      code: 'INBOX.FM.EMPTY_TEXT',
      severity: 'warning',
      automatable: false,
      message: 'Text file has empty content',
      file: parsed.filename,
      lens: 'funnel',
    });
  }

  return findings;
}

export function validateEntryRecord(row, contract) {
  const findings = [];
  const { enums, embeddingDimensions } = contract;

  if (!row.id) {
    findings.push({
      code: 'INBOX.DB.MISSING_ID',
      severity: 'error',
      lens: 'pipeline',
      message: 'Row missing id',
      file: row.source_file,
    });
  }
  if (!row.content_hash) {
    findings.push({
      code: 'INBOX.DB.MISSING_HASH',
      severity: 'error',
      lens: 'pipeline',
      message: 'Row missing content_hash',
      file: row.source_file,
    });
  }
  if (row.status && !enums.pipelineStage.includes(row.status)) {
    findings.push({
      code: 'INBOX.DB.INVALID_STATUS',
      severity: 'error',
      lens: 'pipeline',
      message: `Invalid status: ${row.status}`,
      file: row.source_file,
    });
  }
  if (row.embedding != null) {
    const len = Array.isArray(row.embedding)
      ? row.embedding.length
      : typeof row.embedding === 'string'
        ? row.embedding.replace(/[\[\]]/g, '').split(',').filter(Boolean).length
        : null;
    if (len != null && len !== embeddingDimensions) {
      findings.push({
        code: 'INBOX.DB.DIM_MISMATCH',
        severity: 'error',
        lens: 'pipeline',
        message: `Embedding dimension ${len} != ${embeddingDimensions}`,
        file: row.source_file,
      });
    }
  }

  return findings;
}

export function validateIndexManifest(manifest, dbCount) {
  const findings = [];
  if (manifest.version !== '1.0') {
    findings.push({
      code: 'INBOX.MANIFEST.INVALID_VERSION',
      severity: 'error',
      lens: 'manifest',
      message: `Unexpected manifest version: ${manifest.version}`,
    });
  }
  if (typeof manifest.entry_count === 'number' && dbCount != null && manifest.entry_count !== dbCount) {
    findings.push({
      code: 'INBOX.MANIFEST.DRIFT',
      severity: 'warning',
      lens: 'manifest',
      message: `Manifest entry_count (${manifest.entry_count}) != DB count (${dbCount})`,
      fixHint: 'Re-run yarn intake to refresh _index.json',
    });
  }
  return findings;
}
