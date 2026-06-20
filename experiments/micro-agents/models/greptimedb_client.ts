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
}

export class GreptimeDBClient {
  private client: Client | null = null;
  private connected = false;

  constructor(
    private connectionString: string = process.env.GREPTIME_PSQL_URL ||
      "postgresql://greptime:greptime@localhost:4003/postgres"
  ) {}

  async init(): Promise<void> {
    if (this.connected) return;
    this.client = new Client({ connectionString: this.connectionString });
    await this.client.connect();
    this.connected = true;

    // Ensure table exists. Use array type for embedding storage.
    // Note: GreptimeDB is Postgres-compatible for basic DDL/CRUD operations.
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS code_index (
        id TEXT PRIMARY KEY,
        path TEXT,
        text TEXT,
        embedding DOUBLE PRECISION[],
        sections TEXT[],
        timestamp BIGINT,
        modelId TEXT,
        dimension INT
      );
    `;

    await this.client.query(createTableSql);
  }

  async upsertEmbedding(record: GreptimeEmbeddingRecord): Promise<void> {
    if (!this.client) await this.init();
    const sql = `
      INSERT INTO code_index(id, path, text, embedding, sections, timestamp, modelId, dimension)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO UPDATE SET
        path = EXCLUDED.path,
        text = EXCLUDED.text,
        embedding = EXCLUDED.embedding,
        sections = EXCLUDED.sections,
        timestamp = EXCLUDED.timestamp,
        modelId = EXCLUDED.modelId,
        dimension = EXCLUDED.dimension;
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
    ]);
  }

  async fetchAll(limit: number = 10000): Promise<GreptimeEmbeddingRecord[]> {
    if (!this.client) await this.init();
    const res = await this.client!.query(
      `SELECT id, path, text, embedding, sections, timestamp, modelId, dimension FROM code_index LIMIT $1`,
      [limit]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      path: r.path,
      text: r.text,
      embedding: r.embedding,
      sections: r.sections,
      timestamp: Number(r.timestamp),
      modelId: r.modelid,
      dimension: r.dimension,
    }));
  }

  // Basic client-side similarity search: fetch candidates and compute cosine similarity
  async searchTopK(
    queryEmbedding: number[],
    topK: number = 5,
    candidateLimit: number = 2000
  ): Promise<GreptimeEmbeddingRecord[]> {
    const candidates = await this.fetchAll(candidateLimit);

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
}

// Export singleton
export const greptimeClient = new GreptimeDBClient();
