import { v4 as uuidv4 } from "uuid";
import { greptimeClient } from "../greptimedb_client";

async function run() {
  try {
    console.log("Initializing Greptime client...");
    await greptimeClient.init();
    console.log("Greptime client initialized.");

    const id = uuidv4();
    const record = {
      id,
      path: "tests/sample.txt",
      text: "console.log('hello world')",
      embedding: Array.from({ length: 8 }, (_, i) => Math.random()),
      sections: ["sample"],
      timestamp: Date.now(),
      modelId: "minilm",
      dimension: 8,
    };

    console.log("Upserting sample embedding...");
    await greptimeClient.upsertEmbedding(record);
    console.log("Upsert complete.");

    console.log("Searching for similar embeddings...");
    const results = await greptimeClient.searchTopK(record.embedding, 3, 100);
    console.log("Search results:", results);
  } catch (err) {
    console.error("Smoke test error:", err);
    process.exitCode = 1;
  }
}

run();
