/**
 * Unified Embedding Interface
 *
 * Provides a consistent API for multiple embedding models:
 * - Xenova/all-MiniLM-L6-v2 (default, fast, 384-dim)
 * - google/gemma-3n-1b (advanced, 1024-dim)
 *
 * Integrates with:
 * - Code indexing skill (agent-generator/src/skills/code-indexing/)
 * - Schema crawler tool (agent-generator/src/mcp-registry/schema-crawler.ts)
 * - Existing EmbeddingService (scripts/knowledge-management/embeddings/)
 */

import { FeatureExtractionPipeline, pipeline } from "@huggingface/transformers";
import * as fs from "fs/promises";
import { greptimeClient, GreptimeEmbeddingRecord } from "./greptimedb_client";

// Re-export types from knowledge-management
export interface EmbeddingData {
  embedding: number[];
  text: string;
  sections: string[];
  timestamp: number;
  path: string;
  modelId?: string; // New: track which model generated the embedding
  dimension?: number; // New: embedding dimensionality
}

export interface ModelConfig {
  id: string;
  name: string;
  modelId: string;
  dimension: number;
  task: "feature-extraction" | "sentence-similarity";
  speed: "fast" | "medium" | "slow";
  memoryMB: number;
  useCase: string;
}

export interface SearchResult {
  path: string;
  text: string;
  similarity: number;
  sections?: string[];
}

export interface AdaptiveRetrievalContext {
  previousQueries?: string[];
  userProfile?: {
    role?: string;
    expertise?: string;
  };
  domain?: string;
}

export const MODELS: Record<string, ModelConfig> = {
  minilm: {
    id: "minilm",
    name: "all-MiniLM-L6-v2",
    modelId: "Xenova/all-MiniLM-L6-v2",
    dimension: 384,
    task: "feature-extraction",
    speed: "fast",
    memoryMB: 80,
    useCase: "General semantic search, fast queries",
  },
  gemma3n: {
    id: "gemma3n",
    name: "Gemma3n-1B",
    modelId: "google/gemma-3n-1b",
    dimension: 1024,
    task: "feature-extraction",
    speed: "medium",
    memoryMB: 500,
    useCase: "Deep semantic understanding, complex queries",
  },
};

export class UnifiedEmbeddingService {
  private static instance: UnifiedEmbeddingService;
  private extractors: Map<string, FeatureExtractionPipeline> = new Map();
  private cache: Map<string, number[]> = new Map();
  private initPromises: Map<string, Promise<void>> = new Map();

  private constructor() {}

  static getInstance(): UnifiedEmbeddingService {
    if (!UnifiedEmbeddingService.instance) {
      UnifiedEmbeddingService.instance = new UnifiedEmbeddingService();
    }
    return UnifiedEmbeddingService.instance;
  }

  /**
   * Initialize a specific model
   */
  async initialize(modelKey: string = "minilm"): Promise<void> {
    if (this.extractors.has(modelKey)) {
      return; // Already initialized
    }

    if (this.initPromises.has(modelKey)) {
      return this.initPromises.get(modelKey); // Initialization in progress
    }

    const initPromise = this.doInitialize(modelKey);
    this.initPromises.set(modelKey, initPromise);

    try {
      await initPromise;
    } finally {
      this.initPromises.delete(modelKey);
    }
  }

  private async doInitialize(modelKey: string): Promise<void> {
    const config = MODELS[modelKey];
    if (!config) {
      throw new Error(
        `Unknown model key: ${modelKey}. Available: ${Object.keys(MODELS).join(
          ", "
        )}`
      );
    }

    try {
      console.error(
        `Loading embedding model: ${config.name} (${config.modelId})...`
      );
      const extractor = await pipeline(config.task, config.modelId);
      this.extractors.set(modelKey, extractor);
      console.error(
        `Model loaded successfully (${config.dimension}-dim, ~${config.memoryMB}MB)`
      );
    } catch (error) {
      console.error(`Failed to load model ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Generate embedding with specified model
   */
  async generateEmbedding(
    text: string,
    modelKey: string = "minilm"
  ): Promise<number[]> {
    // Check cache first
    const cacheKey = `${modelKey}:${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Ensure model is initialized
    if (!this.extractors.has(modelKey)) {
      await this.initialize(modelKey);
    }

    const extractor = this.extractors.get(modelKey);
    if (!extractor) {
      throw new Error(`Model ${modelKey} not initialized`);
    }

    try {
      const result = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });
      const embedding = Array.from(result.data);

      // Cache the result
      this.cache.set(cacheKey, embedding);

      return embedding;
    } catch (error) {
      console.error(`Failed to generate embedding with ${modelKey}:`, error);
      throw error;
    }
  }

  /**
   * Generate embeddings in batch
   */
  async generateBatchEmbeddings(
    texts: string[],
    modelKey: string = "minilm",
    batchSize: number = 32
  ): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(
        batch.map((text) => this.generateEmbedding(text, modelKey))
      );
      embeddings.push(...batchEmbeddings);

      if (i + batchSize < texts.length) {
        console.error(
          `Processed ${i + batchSize}/${texts.length} embeddings...`
        );
      }
    }

    return embeddings;
  }

  /**
   * Compute cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(
        `Embedding dimension mismatch: ${a.length} vs ${b.length}`
      );
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Adaptive retrieval: Select best model based on context
   */
  async adaptiveRetrieval(
    query: string,
    context: AdaptiveRetrievalContext = {},
    codeIndexPath: string = "./.code-index-journal"
  ): Promise<SearchResult[]> {
    // Simple heuristic: Use gemma3n for complex queries, minilm for simple
    const isComplexQuery =
      query.split(/\s+/).length > 10 ||
      query.includes("?") ||
      (context.previousQueries && context.previousQueries.length > 0);

    const modelKey = isComplexQuery ? "gemma3n" : "minilm";
    console.error(
      `Using ${MODELS[modelKey].name} for query: "${query.slice(0, 50)}..."`
    );

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query, modelKey);

    // Search in code index
    return this.searchCodeIndex(queryEmbedding, codeIndexPath, modelKey);
  }

  /**
   * Search code index using embedding
   */
  private async searchCodeIndex(
    queryEmbedding: number[],
    indexPath: string,
    modelKey: string,
    topK: number = 5
  ): Promise<SearchResult[]> {
    // Query GreptimeDB for top-K similar embeddings.
    // We use the Greptime client to fetch candidates and compute similarity client-side.
    try {
      const candidates = await greptimeClient.searchTopK(
        queryEmbedding,
        topK,
        2000
      );
      const results: SearchResult[] = candidates.map((c) => ({
        path: c.path,
        text: c.text,
        similarity: this.cosineSimilarity(queryEmbedding, c.embedding),
        sections: c.sections,
      }));

      return results;
    } catch (error) {
      console.error("GreptimeDB search error:", error);
      return [];
    }
  }

  /**
   * Save embedding to disk
   */
  async saveEmbedding(
    filePath: string,
    embeddingData: EmbeddingData
  ): Promise<void> {
    const embeddingPath = filePath.replace(/\.(md|ts|js)$/, ".embedding");
    await fs.writeFile(
      embeddingPath,
      JSON.stringify(embeddingData, null, 2),
      "utf8"
    );

    // Also upsert into GreptimeDB for full-observability and fast vector queries
    try {
      const id = `${embeddingData.path}:${embeddingData.timestamp}`;
      const record: GreptimeEmbeddingRecord = {
        id,
        path: embeddingData.path,
        text: embeddingData.text,
        embedding: embeddingData.embedding,
        sections: embeddingData.sections,
        timestamp: embeddingData.timestamp,
        modelId: embeddingData.modelId,
        dimension: embeddingData.dimension,
      };

      await greptimeClient.upsertEmbedding(record);
    } catch (err) {
      console.error("Failed to upsert embedding to GreptimeDB:", err);
    }
  }

  /**
   * Load embedding from disk
   */
  async loadEmbedding(filePath: string): Promise<EmbeddingData | null> {
    const embeddingPath = filePath.replace(/\.(md|ts|js)$/, ".embedding");

    try {
      const content = await fs.readFile(embeddingPath, "utf8");
      return JSON.parse(content);
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        return null; // File doesn't exist
      }
      throw error;
    }
  }

  /**
   * Get model information
   */
  getModelInfo(modelKey: string): ModelConfig | undefined {
    return MODELS[modelKey];
  }

  /**
   * List available models
   */
  listModels(): ModelConfig[] {
    return Object.values(MODELS);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.error("Embedding cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton export
export const embeddingService = UnifiedEmbeddingService.getInstance();

// Convenience functions
export async function generateEmbedding(
  text: string,
  modelKey: string = "minilm"
): Promise<number[]> {
  return embeddingService.generateEmbedding(text, modelKey);
}

export async function adaptiveRetrieval(
  query: string,
  context?: AdaptiveRetrievalContext
): Promise<SearchResult[]> {
  return embeddingService.adaptiveRetrieval(query, context);
}

export async function searchCodeWithEmbedding(
  query: string,
  modelKey: string = "minilm"
): Promise<SearchResult[]> {
  const embedding = await embeddingService.generateEmbedding(query, modelKey);
  return embeddingService["searchCodeIndex"](
    embedding,
    "./.code-index-journal",
    modelKey
  );
}
