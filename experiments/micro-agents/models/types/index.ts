/**
 * Type exports for models library
 */

export * from "./gemma3n-config";

// Re-export core types from embeddings.ts
export type {
  AdaptiveRetrievalContext,
  EmbeddingData,
  ModelConfig,
  SearchResult,
} from "../embeddings";

export {
  MODELS,
  UnifiedEmbeddingService,
  adaptiveRetrieval,
  embeddingService,
  generateEmbedding,
  searchCodeWithEmbedding,
} from "../embeddings";
