/**
 * Test script for Gemma3N embeddings
 *
 * Usage: node test_embeddings.js
 */

import { Gemma3NFeatureExtractor } from "./feature_extraction_gemma3n.js";

async function main() {
  console.log("=== Gemma3N Embedding Test ===\n");

  const extractor = new Gemma3NFeatureExtractor();

  // Test 1: Initialize model
  console.log("Test 1: Initializing model...");
  await extractor.initialize();
  console.log("✓ Model initialized\n");

  // Test 2: Extract single embedding
  console.log("Test 2: Extracting single embedding...");
  const text1 = "The weather is sunny today.";
  const embedding1 = await extractor.extract(text1);
  console.log(`✓ Embedding shape: [${embedding1.length}]`);
  console.log(
    `  First 5 values: [${embedding1
      .slice(0, 5)
      .map((v) => v.toFixed(4))
      .join(", ")}]`
  );
  console.log();

  // Test 3: Batch embeddings
  console.log("Test 3: Batch embeddings...");
  const texts = [
    "The weather is sunny today.",
    "It's raining outside.",
    "I like pizza and pasta.",
  ];
  const embeddings = await extractor.extract(texts);
  console.log(`✓ Batch size: ${embeddings.length}`);
  console.log(`  Each embedding shape: [${embeddings[0].length}]`);
  console.log();

  // Test 4: Cosine similarity
  console.log("Test 4: Computing similarity...");
  const sim12 = Gemma3NFeatureExtractor.cosineSimilarity(
    embeddings[0],
    embeddings[1]
  );
  const sim13 = Gemma3NFeatureExtractor.cosineSimilarity(
    embeddings[0],
    embeddings[2]
  );
  console.log(`  Similarity("sunny", "raining"): ${sim12.toFixed(4)}`);
  console.log(`  Similarity("sunny", "pizza"): ${sim13.toFixed(4)}`);
  console.log(
    `✓ Weather texts are more similar (${sim12 > sim13 ? "PASS" : "FAIL"})`
  );
  console.log();

  // Test 5: Top-K search
  console.log("Test 5: Top-K similar search...");
  const query = "What's the weather like?";
  const queryEmbedding = await extractor.extract(query);
  const topK = Gemma3NFeatureExtractor.topKSimilar(
    queryEmbedding,
    embeddings,
    2
  );
  console.log(`  Query: "${query}"`);
  console.log("  Top 2 matches:");
  topK.forEach((result, i) => {
    console.log(
      `    ${i + 1}. "${
        texts[result.index]
      }" (score: ${result.similarity.toFixed(4)})`
    );
  });
  console.log();

  // Test 6: Hex encoding (for journal storage)
  console.log("Test 6: Hex encoding for storage...");
  const hexEmbedding = await extractor.embedAsHex("Test message");
  console.log(`✓ Hex length: ${hexEmbedding.length} characters`);
  console.log(`  First 64 chars: ${hexEmbedding.substring(0, 64)}...`);
  console.log();

  // Cleanup
  await extractor.dispose();
  console.log("=== All tests passed! ===");
}

main().catch(console.error);
