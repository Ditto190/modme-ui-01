import { Client } from "pg";

export interface GreptimeEmbeddingRecord {
  id: string;
  path: string;
  text: string;
  embedding: number[];
  sections?: string[];
  timestamp: number;
  modelId?: string;
  dimension?: number;
  ast_kind?: string;
  schema_json?: Record<string, unknown> | null;
  content_hash?: string;
}

export class GreptimeDBClient {
  private client: Client | null = null;
  private connected = false;
  private queryLock: Promise<void> = Promise.resolve();

  constructor(
    private connectionString: string = process.env.GREPTIME_PSQL_URL ||
      "postgresql://greptime:greptime@localhost:4003/postgres"
  ) {}

  private async withQueryLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.queryLock;
    let release!: () => void;
    this.queryLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private async resetConnection(): Promise<void> {
    this.connected = false;
    if (this.client) {
      await this.client.end().catch(() => undefined);
      this.client = null;
    }
  }

  async init(): Promise<void> {
    if (this.connected && this.client) return;
    await this.resetConnection();
    this.client = new Client({
      connectionString: this.connectionString,
      connectionTimeoutMillis: 4_000,
    });
    await this.client.connect();
    this.connected = true;

    const createTableSql = `
      CREATE TABLE IF NOT EXISTS code_index (
        id TEXT PRIMARY KEY,
        path TEXT,
        text TEXT,
        embedding DOUBLE PRECISION[],
        sections TEXT[],
        timestamp BIGINT,
        modelId TEXT,
        dimension INT,
        ast_kind TEXT,
        schema_json TEXT,
        content_hash TEXT
      );
    `;

    await this.client.query(createTableSql);

    await this.client.query(`
      ALTER TABLE code_index ADD COLUMN IF NOT EXISTS ast_kind TEXT;
    `).catch(() => undefined);
    await this.client.query(`
      ALTER TABLE code_index ADD COLUMN IF NOT EXISTS schema_json TEXT;
    `).catch(() => undefined);
    await this.client.query(`
      ALTER TABLE code_index ADD COLUMN IF NOT EXISTS content_hash TEXT;
    `).catch(() => undefined);
  }

  async upsertEmbedding(record: GreptimeEmbeddingRecord): Promise<void> {
    return this.withQueryLock(async () => {
    if (!this.client) await this.init();
    const schemaJson =
      record.schema_json != null ? JSON.stringify(record.schema_json) : null;

    const sql = `
      INSERT INTO code_index(id, path, text, embedding, sections, timestamp, modelId, dimension, ast_kind, schema_json, content_hash)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO UPDATE SET
        path = EXCLUDED.path,
        text = EXCLUDED.text,
        embedding = EXCLUDED.embedding,
        sections = EXCLUDED.sections,
        timestamp = EXCLUDED.timestamp,
        modelId = EXCLUDED.modelId,
        dimension = EXCLUDED.dimension,
        ast_kind = EXCLUDED.ast_kind,
        schema_json = EXCLUDED.schema_json,
        content_hash = EXCLUDED.content_hash;
    `;

    await this.client!.query(sql, [
      record.id,
      record.path,
      record.text,
      record.embedding,
      record.sections || null,
      record.timestamp,
      record.modelId || null,
      record.dimension || null,
      record.ast_kind || null,
      schemaJson,
      record.content_hash || null,
    ]);
    });
  }

  async fetchAll(limit: number = 10000): Promise<GreptimeEmbeddingRecord[]> {
    return this.withQueryLock(async () => {
    try {
    if (!this.client) await this.init();
    const res = await this.client!.query(
      `SELECT id, path, text, embedding, sections, timestamp, modelId, dimension, ast_kind, schema_json, content_hash FROM code_index LIMIT $1`,
      [limit]
    );
    return res.rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      path: String(r.path),
      text: String(r.text),
      embedding: r.embedding as number[],
      sections: r.sections as string[] | undefined,
      timestamp: Number(r.timestamp),
      modelId: (r.modelid ?? r.modelId) as string | undefined,
      dimension: r.dimension as number | undefined,
      ast_kind: r.ast_kind as string | undefined,
      schema_json: r.schema_json
        ? (JSON.parse(String(r.schema_json)) as Record<string, unknown>)
        : undefined,
      content_hash: r.content_hash as string | undefined,
    }));
    } catch (err) {
      await this.resetConnection();
      throw err;
    }
    });
  }

  async searchTopK(
    queryEmbedding: number[],
    topK: number = 5,
    candidateLimit: number = 2000,
    filter?: { astKind?: string }
  ): Promise<GreptimeEmbeddingRecord[]> {
    let candidates = await this.fetchAll(candidateLimit);
    if (filter?.astKind) {
      candidates = candidates.filter((c) => c.ast_kind === filter.astKind);
    }

    function cosine(a: number[], b: number[]): number {
      if (a.length !== b.length) return -1;
      let dot = 0;
      let na = 0;
      let nb = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
      }
      if (na === 0 || nb === 0) return 0;
      return dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    const scored = candidates
      .map((c) => ({ c, score: cosine(queryEmbedding, c.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => s.c);

    return scored;
  }

  async findByContentHash(contentHash: string): Promise<GreptimeEmbeddingRecord | null> {
    return this.withQueryLock(async () => {
    if (!this.client) await this.init();
    const res = await this.client!.query(
      `SELECT id, path, text, embedding, sections, timestamp, modelId, dimension, ast_kind, schema_json, content_hash
       FROM code_index WHERE content_hash = $1 LIMIT 1`,
      [contentHash]
    );
    if (!res.rows.length) return null;
    const r = res.rows[0] as Record<string, unknown>;
    return {
      id: String(r.id),
      path: String(r.path),
      text: String(r.text),
      embedding: r.embedding as number[],
      sections: r.sections as string[] | undefined,
      timestamp: Number(r.timestamp),
      ast_kind: r.ast_kind as string | undefined,
      content_hash: r.content_hash as string | undefined,
    };
    });
  }
}

export const greptimeClient = new GreptimeDBClient();
