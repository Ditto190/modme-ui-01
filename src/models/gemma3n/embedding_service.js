/**
 * Embedding Service - Node.js CLI for Python Bridge
 *
 * Accepts JSON input via stdin, returns hex-encoded embeddings via stdout.
 * Used by embeddings_gemma3n.py for Python → Node.js interop.
 *
 * Usage:
 *   echo '{"texts": ["Hello"], "format": "hex"}' | node embedding_service.js
 */

import { createInterface } from "readline";
import { Gemma3NFeatureExtractor } from "./feature_extraction_gemma3n.js";

async function main() {
  try {
    // Read JSON from stdin
    const rl = createInterface({ input: process.stdin });
    let inputData = "";

    for await (const line of rl) {
      inputData += line;
    }

    const input = JSON.parse(inputData);
    const texts = input.texts || [];
    const format = input.format || "array";

    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Invalid input: "texts" must be a non-empty array');
    }

    // Initialize extractor
    const extractor = new Gemma3NFeatureExtractor();
    await extractor.initialize();

    // Generate embeddings
    const embeddings = await extractor.extract(texts);

    // Format output
    let formattedEmbeddings;
    if (format === "hex") {
      formattedEmbeddings = embeddings.map((emb) => {
        const buffer = new Float32Array(emb).buffer;
        const bytes = new Uint8Array(buffer);
        return Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      });
    } else {
      formattedEmbeddings = embeddings;
    }

    // Output JSON result
    const output = {
      status: "success",
      count: embeddings.length,
      dimension: embeddings[0].length,
      embeddings: formattedEmbeddings,
    };

    console.log(JSON.stringify(output));

    // Cleanup
    await extractor.dispose();
  } catch (error) {
    const errorOutput = {
      status: "error",
      error: error.message,
      stack: error.stack,
    };
    console.error(JSON.stringify(errorOutput));
    process.exit(1);
  }
}

main();
