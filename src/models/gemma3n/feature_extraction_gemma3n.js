/**
 * Feature Extraction for Gemma3N Model
 *
 * Lightweight embedding model for semantic search in journal entries.
 * Uses transformers.js for browser/Node.js compatible inference.
 *
 * @module models/gemma3n/feature_extraction
 */

import { env, pipeline } from "@xenova/transformers";

// Configure transformers.js environment
env.allowLocalModels = true;
env.useBrowserCache = false;

/**
 * Gemma3N Feature Extractor Class
 *
 * Provides embedding generation for text using the Gemma3N model.
 * Designed for lightweight, local inference without API tokens.
 */
export class Gemma3NFeatureExtractor {
  constructor(options = {}) {
    this.modelId = options.modelId || "Xenova/gemma-3n-mini-it";
    this.pooling = options.pooling || "mean";
    this.normalize = options.normalize !== false;
    this.pipeline = null;
    this.isReady = false;
  }

  /**
   * Initialize the feature extraction pipeline
   *
   * Downloads and caches the model on first run.
   * Subsequent runs use the cached model.
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isReady) return;

    try {
      console.log(`[Gemma3N] Initializing feature extraction pipeline...`);
      console.log(`[Gemma3N] Model: ${this.modelId}`);

      this.pipeline = await pipeline("feature-extraction", this.modelId, {
        quantized: true, // Use quantized model for faster inference
        progress_callback: (progress) => {
          if (progress.status === "downloading") {
            console.log(
              `[Gemma3N] Downloading: ${progress.file} (${Math.round(
                progress.progress
              )}%)`
            );
          }
        },
      });

      this.isReady = true;
      console.log(`[Gemma3N] Initialization complete`);
    } catch (error) {
      console.error(`[Gemma3N] Initialization failed:`, error);
      throw new Error(`Failed to initialize Gemma3N: ${error.message}`);
    }
  }

  /**
   * Extract features (embeddings) from text
   *
   * @param {string|string[]} texts - Single text or array of texts
   * @param {Object} options - Extraction options
   * @param {boolean} options.normalize - Whether to normalize embeddings (default: true)
   * @param {string} options.pooling - Pooling strategy: 'mean', 'cls', 'max' (default: 'mean')
   * @returns {Promise<Array|Array<Array>>} Embedding vector(s)
   */
  async extract(texts, options = {}) {
    if (!this.isReady) {
      await this.initialize();
    }

    const normalize =
      options.normalize !== undefined ? options.normalize : this.normalize;
    const pooling = options.pooling || this.pooling;

    try {
      const output = await this.pipeline(texts, { pooling, normalize });

      // Return raw tensor data as array
      if (Array.isArray(texts)) {
        return output.map((tensor) => Array.from(tensor.data));
      } else {
        return Array.from(output.data);
      }
    } catch (error) {
      console.error(`[Gemma3N] Extraction failed:`, error);
      throw new Error(`Feature extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract embeddings and return as hex string (for JSONL storage)
   *
   * Compatible with existing journal.py storage format.
   *
   * @param {string} text - Text to embed
   * @returns {Promise<string>} Hex-encoded embedding
   */
  async embedAsHex(text) {
    const embedding = await this.extract(text);

    // Convert float32 array to hex string for storage
    const buffer = new Float32Array(embedding).buffer;
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Calculate cosine similarity between two embeddings
   *
   * @param {Array<number>} embeddingA - First embedding vector
   * @param {Array<number>} embeddingB - Second embedding vector
   * @returns {number} Similarity score (0-1, higher is more similar)
   */
  static cosineSimilarity(embeddingA, embeddingB) {
    if (embeddingA.length !== embeddingB.length) {
      throw new Error("Embeddings must have the same dimension");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < embeddingA.length; i++) {
      dotProduct += embeddingA[i] * embeddingB[i];
      normA += embeddingA[i] * embeddingA[i];
      normB += embeddingB[i] * embeddingB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find top-k most similar embeddings
   *
   * @param {Array<number>} queryEmbedding - Query embedding vector
   * @param {Array<Array<number>>} candidateEmbeddings - Candidate embedding vectors
   * @param {number} k - Number of top results to return
   * @returns {Array<{index: number, similarity: number}>} Top-k results with indices and scores
   */
  static topKSimilar(queryEmbedding, candidateEmbeddings, k = 5) {
    const similarities = candidateEmbeddings.map((candidate, index) => ({
      index,
      similarity: Gemma3NFeatureExtractor.cosineSimilarity(
        queryEmbedding,
        candidate
      ),
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, k);
  }

  /**
   * Dispose of the pipeline and free resources
   */
  async dispose() {
    if (this.pipeline) {
      await this.pipeline.dispose();
      this.pipeline = null;
      this.isReady = false;
      console.log(`[Gemma3N] Pipeline disposed`);
    }
  }
}

/**
 * Create a singleton instance for convenient usage
 *
 * @example
 * import { gemma3n } from './models/gemma3n/feature_extraction_gemma3n.js';
 *
 * const embedding = await gemma3n.extract("Hello world");
 * console.log(embedding);
 */
export const gemma3n = new Gemma3NFeatureExtractor();

export default gemma3n;
