#!/usr/bin/env node
/**
 * Export inbox contract v1 JSON + expectation suites to docs/inbox-pipeline/contracts/
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../../..");

const CONTRACT_VERSION = "1.0";
const EMBEDDING_DIM = 384;

const enums = {
  entryType: [
    "architecture",
    "design",
    "code-review",
    "solution",
    "research",
    "snippet",
    "link",
    "component",
  ],
  severity: ["low", "medium", "high", "critical"],
  agentRole: [
    "frontend",
    "backend",
    "devops",
    "architect",
    "reviewer",
    "researcher",
  ],
  sourceFormat: ["md", "txt", "pdf", "url", "jsx", "snippet", "html", "csv"],
  pipelineStage: ["indexed", "categorized", "archived", "superseded"],
};

const contract = {
  version: CONTRACT_VERSION,
  generatedAt: new Date().toISOString(),
  embeddingDimensions: EMBEDDING_DIM,
  enums,
  frontmatter: {
    required: ["timestamp", "agent", "type"],
    optional: [
      "agent_role",
      "session_id",
      "tags",
      "severity",
      "related_files",
      "branch",
      "pr_number",
      "title",
      "summary",
    ],
    appliesTo: ["md"],
  },
  funnelFile: {
    required: ["path", "format", "contentHash"],
    contentHashLength: 64,
  },
  entryRecord: {
    required: [
      "id",
      "content_hash",
      "source_file",
      "source_format",
      "severity",
      "status",
      "created_at",
      "updated_at",
    ],
    contentHashLength: 64,
  },
  indexManifest: {
    version: "1.0",
    required: ["version", "last_updated", "entry_count", "entries"],
  },
  categoryIdPattern: "^cat-[a-z0-9-]+$",
};

const funnelExpectations = {
  version: CONTRACT_VERSION,
  suite: "funnel",
  expectations: [
    {
      id: "fm.timestamp.required",
      code: "INBOX.FM.MISSING_TIMESTAMP",
      dimension: "completeness",
      severity: "error",
      automatable: true,
      rule: "md files must have frontmatter.timestamp (ISO 8601)",
    },
    {
      id: "fm.agent.required",
      code: "INBOX.FM.MISSING_AGENT",
      dimension: "completeness",
      severity: "error",
      automatable: true,
      rule: "md files must have frontmatter.agent",
    },
    {
      id: "fm.type.required",
      code: "INBOX.FM.MISSING_TYPE",
      dimension: "completeness",
      severity: "error",
      automatable: true,
      rule: "md files must have frontmatter.type in entryType enum",
    },
    {
      id: "fm.severity.valid",
      code: "INBOX.FM.INVALID_SEVERITY",
      dimension: "validity",
      severity: "error",
      automatable: true,
      rule: "frontmatter.severity must be in severity enum",
    },
    {
      id: "fm.agent_role.valid",
      code: "INBOX.FM.INVALID_AGENT_ROLE",
      dimension: "validity",
      severity: "warning",
      automatable: false,
      rule: "frontmatter.agent_role must be in agentRole enum when present",
    },
    {
      id: "fm.filename.convention",
      code: "INBOX.FM.FILENAME_CONVENTION",
      dimension: "consistency",
      severity: "warning",
      automatable: false,
      rule: "structured .md files should match YYYY-MM-DDTHH-MM-SS_{type}_{role}_{slug}.md",
    },
    {
      id: "fm.text.non_empty",
      code: "INBOX.FM.EMPTY_TEXT",
      dimension: "completeness",
      severity: "warning",
      automatable: false,
      rule: "text formats should have non-empty extracted_text",
    },
  ],
};

const pipelineExpectations = {
  version: CONTRACT_VERSION,
  suite: "pipeline",
  expectations: [
    {
      id: "db.id.not_null",
      code: "INBOX.DB.MISSING_ID",
      dimension: "completeness",
      severity: "error",
      automatable: false,
      rule: "inbox_entries.id must not be null",
    },
    {
      id: "db.content_hash.unique",
      code: "INBOX.DB.DUPLICATE_HASH",
      dimension: "uniqueness",
      severity: "error",
      automatable: false,
      rule: "content_hash must be unique",
    },
    {
      id: "db.embedding.dim",
      code: "INBOX.DB.DIM_MISMATCH",
      dimension: "validity",
      severity: "error",
      automatable: false,
      rule: `embedding vector length must be ${EMBEDDING_DIM}`,
    },
    {
      id: "db.category.valid",
      code: "INBOX.DB.ORPHAN_CATEGORY",
      dimension: "validity",
      severity: "error",
      automatable: false,
      rule: "category_id must reference categories.id when set",
    },
    {
      id: "db.status.valid",
      code: "INBOX.DB.INVALID_STATUS",
      dimension: "validity",
      severity: "error",
      automatable: false,
      rule: "status must be in pipelineStage enum",
    },
    {
      id: "manifest.drift",
      code: "INBOX.MANIFEST.DRIFT",
      dimension: "consistency",
      severity: "warning",
      automatable: false,
      rule: "_index.json entry_count should match DB row count (soft)",
    },
  ],
};

const outDir = join(repoRoot, "docs/inbox-pipeline/contracts");
const expDir = join(outDir, "expectations");
mkdirSync(expDir, { recursive: true });

writeFileSync(
  join(outDir, "inbox-contract.v1.json"),
  `${JSON.stringify(contract, null, 2)}\n`
);
writeFileSync(
  join(expDir, "funnel.v1.json"),
  `${JSON.stringify(funnelExpectations, null, 2)}\n`
);
writeFileSync(
  join(expDir, "pipeline.v1.json"),
  `${JSON.stringify(pipelineExpectations, null, 2)}\n`
);

console.log("Exported inbox contract v1 to docs/inbox-pipeline/contracts/");
