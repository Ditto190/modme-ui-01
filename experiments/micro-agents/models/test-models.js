#!/usr/bin/env node
/**
 * Test transformers.js installation and model loading
 *
 * Usage:
 *   npm run test:models
 *   node test-models.js
 */

import { embeddingService } from "./embeddings.js";

async function testModelLoading() {
  console.log("🧪 Testing Models Library Installation\n");

  // Test 1: List available models
  console.log("📋 Available Models:");
  const models = embeddingService.listModels();
  models.forEach((model) => {
    console.log(`  - ${model.name} (${model.id})`);
    console.log(`    Dimension: ${model.dimension}`);
    console.log(`    Speed: ${model.speed}`);
    console.log(`    Memory: ~${model.memoryMB}MB`);
    console.log(`    Use Case: ${model.useCase}\n`);
  });

  // Test 2: Initialize MiniLM (fast model)
  console.log("⚡ Testing MiniLM model...");
  try {
    const start = Date.now();
    await embeddingService.initialize("minilm");
    const initTime = Date.now() - start;
    console.log(`✅ MiniLM initialized in ${initTime}ms`);

    // Generate test embedding
    const testText = "How do I implement semantic search in TypeScript?";
    const embedStart = Date.now();
    const embedding = await embeddingService.generateEmbedding(
      testText,
      "minilm"
    );
    const embedTime = Date.now() - embedStart;

    console.log(`✅ Generated embedding in ${embedTime}ms`);
    console.log(`   Dimension: ${embedding.length}`);
    console.log(
      `   First 5 values: [${embedding
        .slice(0, 5)
        .map((v) => v.toFixed(4))
        .join(", ")}...]\n`
    );
  } catch (error) {
    console.error("❌ MiniLM test failed:", error);
  }

  // Test 3: Test Gemma3n (if available)
  console.log("🚀 Testing Gemma3n model...");
  try {
    const start = Date.now();
    await embeddingService.initialize("gemma3n");
    const initTime = Date.now() - start;
    console.log(`✅ Gemma3n initialized in ${initTime}ms`);

    // Generate test embedding
    const testText =
      "Explain the difference between semantic and lexical search";
    const embedStart = Date.now();
    const embedding = await embeddingService.generateEmbedding(
      testText,
      "gemma3n"
    );
    const embedTime = Date.now() - embedStart;

    console.log(`✅ Generated embedding in ${embedTime}ms`);
    console.log(`   Dimension: ${embedding.length}`);
    console.log(
      `   First 5 values: [${embedding
        .slice(0, 5)
        .map((v) => v.toFixed(4))
        .join(", ")}...]\n`
    );
  } catch (error) {
    console.error(
      "⚠️  Gemma3n test skipped (model not available):",
      error.message
    );
    console.log("   This is expected if model files are not downloaded\n");
  }

  // Test 4: Batch processing
  console.log("📦 Testing batch embedding generation...");
  try {
    const texts = [
      "First test query about TypeScript",
      "Second test query about React",
      "Third test query about Node.js",
    ];

    const batchStart = Date.now();
    const embeddings = await embeddingService.generateBatchEmbeddings(
      texts,
      "minilm",
      10
    );
    const batchTime = Date.now() - batchStart;

    console.log(
      `✅ Generated ${embeddings.length} embeddings in ${batchTime}ms`
    );
    console.log(
      `   Average: ${(batchTime / embeddings.length).toFixed(
        1
      )}ms per embedding\n`
    );
  } catch (error) {
    console.error("❌ Batch test failed:", error);
  }

  // Test 5: Cosine similarity
  console.log("🔍 Testing cosine similarity...");
  try {
    const text1 = "Machine learning with neural networks";
    const text2 = "Deep learning and artificial intelligence";
    const text3 = "Cooking recipes for dinner";

    const [emb1, emb2, emb3] = await embeddingService.generateBatchEmbeddings(
      [text1, text2, text3],
      "minilm"
    );

    const sim12 = embeddingService.cosineSimilarity(emb1, emb2);
    const sim13 = embeddingService.cosineSimilarity(emb1, emb3);

    console.log(`✅ Similarity tests:`);
    console.log(`   "${text1}" vs "${text2}": ${sim12.toFixed(4)}`);
    console.log(`   "${text1}" vs "${text3}": ${sim13.toFixed(4)}`);
    console.log(`   Expected: First pair should be more similar ✓\n`);
  } catch (error) {
    console.error("❌ Similarity test failed:", error);
  }

  // Test 6: Cache statistics
  console.log("💾 Cache Statistics:");
  const cacheStats = embeddingService.getCacheStats();
  console.log(`   Cached embeddings: ${cacheStats.size}`);
  if (cacheStats.size > 0) {
    console.log(
      `   Sample keys: ${cacheStats.keys.slice(0, 3).join(", ")}...\n`
    );
  } else {
    console.log("   (Empty - cache will populate during use)\n");
  }

  console.log("✨ All tests completed!");
  console.log("\n📚 Next steps:");
  console.log("  1. Run code indexing: npm run index:gemma3n");
  console.log("  2. Test embedding agent: npx tsx base/embedding-agent.ts");
  console.log("  3. Try adaptive retrieval in your application\n");
}

// Run tests
testModelLoading().catch((error) => {
  console.error("💥 Test suite failed:", error);
  process.exit(1);
});
