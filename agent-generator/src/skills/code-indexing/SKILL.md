# Code Indexing with Journal-Style Embeddings

**Version**: 1.0.0  
**Category**: Knowledge Management  
**Format**: Agent Skill Specification v1.0

## Overview

Generate semantic embeddings for code chunks using journal-style persistent storage and @xenova/transformers for local, privacy-preserving indexing.

## Purpose

Create searchable code embeddings without external API dependencies, storing results in journal-like dated directories for versioning and auditability.

## Capabilities

- 🔍 **Semantic Code Search**: Find code by meaning, not just keywords
- 📦 **Chunk Management**: Break code into semantically meaningful units
- 💾 **Journal Storage**: Store embeddings in dated, versioned directories
- 🔐 **Privacy-First**: All processing happens locally with transformers.js
- 🚀 **Fast Retrieval**: Cosine similarity search across embedded chunks

## Prerequisites

### Required Tools

- Node.js 22+ with TypeScript support
- Python 3.12+ (for pykomodo chunking)
- @xenova/transformers library

### Required Files

- `scripts/knowledge-management/embeddings/embeddings.ts`
- `scripts/knowledge-management/embeddings/search.ts`
- `scripts/knowledge-management/embeddings/types.ts`

### Environment Variables

None required (fully local processing)

## Input Schema

```typescript
interface IndexRequest {
  // Directories to index
  paths: string[];

  // Output journal directory
  journal_path?: string; // Default: ./.code-index-journal

  // Chunking strategy
  chunk_size?: number; // Default: 512 tokens
  chunk_overlap?: number; // Default: 50 tokens

  // Embedding model
  model?: string; // Default: Xenova/all-MiniLM-L6-v2

  // Update strategy
  incremental?: boolean; // Default: true (skip unchanged files)
}
```

## Output Schema

```typescript
interface IndexResult {
  status: "success" | "error";

  // Metadata
  indexed_at: string; // ISO timestamp
  chunk_count: number;
  file_count: number;

  // Storage locations
  journal_date: string; // YYYY-MM-DD
  embeddings_path: string;

  // Statistics
  duration_ms: number;
  avg_chunk_size: number;

  // Search interface
  search_available: boolean;
}
```

## Workflow Steps

### 1. Initialize Embedding Service

```typescript
import { EmbeddingService } from "./embeddings/embeddings";

const service = EmbeddingService.getInstance();
await service.initialize();
```

### 2. Chunk Codebase

```bash
pykomodo chunk \
  --input-dir src/ \
  --output-dir output_chunks/ \
  --chunk-size 512 \
  --overlap 50 \
  --format jsonl
```

### 3. Generate Embeddings

```typescript
for (const chunk of chunks) {
  const embedding = await service.generateEmbedding(chunk.text);

  const embeddingData = {
    embedding,
    text: chunk.text,
    sections: chunk.sections,
    timestamp: Date.now(),
    path: chunk.file_path,
  };

  // Save to journal directory
  await saveToJournal(embeddingData, journalPath);
}
```

### 4. Create Search Index

```typescript
import { createSearchIndex } from "./embeddings/search";

const index = await createSearchIndex(journalPath);
```

### 5. Perform Semantic Search

```typescript
const results = await index.search(query, {
  limit: 10,
  threshold: 0.7, // Minimum similarity
});
```

## Storage Structure

```
.code-index-journal/
├── 2026-01-07/
│   ├── 09-15-23-456789.embedding  # Chunk embedding
│   ├── 09-15-23-457123.embedding
│   └── index.json                  # Daily index metadata
├── 2026-01-08/
│   └── ...
└── manifest.json                   # Global manifest
```

## Example Usage

### CLI Usage

```bash
# Index current directory
node scripts/knowledge-management/index-code.js

# Index specific paths
node scripts/knowledge-management/index-code.js \
  --paths src/,agent/ \
  --journal-path ./.code-journal

# Search indexed code
node scripts/knowledge-management/search-code.js \
  --query "authentication middleware" \
  --limit 5
```

### Programmatic Usage

```typescript
import { CodeIndexer } from "./code-indexing";

const indexer = new CodeIndexer({
  journalPath: "./.code-journal",
  model: "Xenova/all-MiniLM-L6-v2",
});

// Index code
const result = await indexer.index({
  paths: ["src/", "agent/"],
  incremental: true,
});

// Search
const hits = await indexer.search("async function handlers", {
  limit: 10,
  threshold: 0.75,
});
```

## GitHub Actions Integration

```yaml
name: Update Code Index

on:
  push:
    branches: [main]
    paths: ["src/**", "agent/**"]

jobs:
  index:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: |
          cd scripts/knowledge-management
          npm install

      - name: Generate code index
        run: |
          node scripts/knowledge-management/index-code.js \
            --paths src/,agent/ \
            --journal-path .code-journal

      - name: Upload index artifact
        uses: actions/upload-artifact@v4
        with:
          name: code-index-${{ github.sha }}
          path: .code-journal/
```

## Performance Characteristics

- **Indexing Speed**: ~50-100 chunks/sec (local)
- **Search Latency**: <100ms for 10k chunks
- **Memory Usage**: ~200MB base + 1MB per 1000 chunks
- **Storage**: ~5KB per chunk embedding

## Error Handling

### Common Issues

1. **Out of Memory**: Reduce `chunk_size` or process in batches
2. **Model Loading Failed**: Ensure @xenova/transformers is installed
3. **Permission Denied**: Check journal directory write permissions

### Retry Strategy

```typescript
async function indexWithRetry(chunk, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await service.generateEmbedding(chunk.text);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
}
```

## Comparison with Traditional Indexing

| Feature         | Traditional (ChromaDB + API) | Journal-Style (Local) |
| --------------- | ---------------------------- | --------------------- |
| **Privacy**     | Sends code to external API   | 100% local processing |
| **Cost**        | API usage fees               | Free (compute only)   |
| **Speed**       | Network latency              | CPU-bound, fast       |
| **Versioning**  | Manual snapshots             | Built-in date-based   |
| **Offline**     | ❌ Requires internet         | ✅ Fully offline      |
| **Audit Trail** | Limited                      | Complete journal      |

## Integration with Existing Systems

### ChromaDB Migration

```typescript
// Export from ChromaDB
const chromaData = await chromaCollection.get();

// Import to journal
for (const item of chromaData) {
  await journalIndexer.addEmbedding({
    embedding: item.embedding,
    text: item.document,
    metadata: item.metadata,
  });
}
```

### Search API Compatibility

```typescript
// Drop-in replacement for ChromaDB search
async function search(query: string, limit: number) {
  const embedding = await service.generateEmbedding(query);
  return await journalIndex.searchByEmbedding(embedding, limit);
}
```

## Extensibility

### Custom Chunking Strategies

```typescript
interface ChunkStrategy {
  name: string;
  chunk(text: string): Chunk[];
}

class SemanticChunker implements ChunkStrategy {
  chunk(text: string): Chunk[] {
    // Split by semantic boundaries (functions, classes)
    return splitBySemantic(text);
  }
}
```

### Custom Similarity Metrics

```typescript
interface SimilarityMetric {
  compute(a: number[], b: number[]): number;
}

class CosineSimilarity implements SimilarityMetric {
  compute(a: number[], b: number[]): number {
    return service.cosineSimilarity(a, b);
  }
}
```

## Testing

```typescript
import { describe, it, expect } from "@jest/globals";
import { EmbeddingService } from "./embeddings";

describe("Code Indexing Skill", () => {
  it("should generate embeddings", async () => {
    const service = EmbeddingService.getInstance();
    await service.initialize();

    const embedding = await service.generateEmbedding("test code");
    expect(embedding).toHaveLength(384); // Model output dim
  });

  it("should compute similarity", () => {
    const a = [0.1, 0.2, 0.3];
    const b = [0.1, 0.2, 0.3];
    const sim = service.cosineSimilarity(a, b);
    expect(sim).toBeCloseTo(1.0);
  });
});
```

## Maintenance

- **Model Updates**: Update `model` parameter when new versions available
- **Journal Cleanup**: Archive old entries beyond retention period
- **Index Optimization**: Rebuild index monthly for large codebases

## Related Skills

- **Knowledge Management**: General documentation indexing
- **Code Search**: Advanced search with AST awareness
- **Semantic Analysis**: Deeper code understanding patterns

## References

- [Agent Skills Specification](https://agentskills.io/specification)
- [@xenova/transformers Documentation](https://huggingface.co/docs/transformers.js)
- [Private Journal MCP](https://github.com/obra/private-journal-mcp)

---

**Maintained by**: ModMe GenUI Team  
**Last Updated**: January 7, 2026  
**License**: MIT

