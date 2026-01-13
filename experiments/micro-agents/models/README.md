# Models Library - Transformers.js Integration

**Purpose**: Local embedding models for semantic search without external API dependencies

## Overview

This library provides transformers.js-based embedding models for the micro-agents framework, enabling privacy-preserving semantic search and code indexing.

## Structure

```
models/
├── transformers-js/          # NPM package for transformers.js
│   ├── node_modules/
│   └── package.json
├── src/
│   └── models/
│       └── gemma3n/          # Gemma3n feature extraction model
│           ├── configuration_gemma3n.js
│           ├── feature_extraction_gemma3n.js
│           ├── modeling_gemma3n.js
│           └── processing_gemma3n.js
├── examples/
│   └── adaptive-retrieval/   # Adaptive retrieval example
│       ├── index.js
│       ├── package.json
│       └── README.md
└── embeddings.ts             # Unified embedding interface
```

## Available Models

### 1. Gemma3n Feature Extraction

**Location**: `src/models/gemma3n/`

**Purpose**: Efficient embedding generation for text chunks

**Features**:

- Mobile-first architecture
- Optimized for on-device inference
- Small model footprint
- Fast inference times

**Usage**:

```typescript
import { FeatureExtractionPipeline } from "@huggingface/transformers";

const extractor = await pipeline("feature-extraction", "google/gemma-3n-1b");
const embedding = await extractor("Your text here", {
  pooling: "mean",
  normalize: true,
});
```

### 2. all-MiniLM-L6-v2 (Default)

**Location**: Current embedding service (`scripts/knowledge-management/embeddings/embeddings.ts`)

**Purpose**: General-purpose sentence embeddings

**Features**:

- 384-dimensional embeddings
- Pre-trained on 1B+ sentence pairs
- Fast inference (~50ms per sentence)
- Good for semantic similarity

## Integration with Existing Infrastructure

### Existing Embedding Service

Located at: `scripts/knowledge-management/embeddings/embeddings.ts`

**Current model**: `Xenova/all-MiniLM-L6-v2`

**Key functions**:

- `generateEmbedding(text: string): Promise<number[]>`
- `cosineSimilarity(a: number[], b: number[]): number`
- `saveEmbedding(filePath: string, embeddingData: EmbeddingData): Promise<void>`

### Enhanced Embedding Service (This Library)

**New capabilities**:

1. **Multiple Model Support**: Switch between all-MiniLM-L6-v2 and Gemma3n
2. **Adaptive Retrieval**: Context-aware embedding selection
3. **Batch Processing**: Efficient bulk embedding generation
4. **Model Indexing**: Use code-indexing skill to index model architectures

## Adaptive Retrieval Pattern

Based on the `examples/adaptive-retrieval/` example:

```typescript
import { adaptiveRetrieval } from "./embeddings";

// Query with adaptive context
const results = await adaptiveRetrieval({
  query: "Find authentication middleware implementations",
  context: {
    previousQueries: ["authentication", "middleware"],
    userProfile: { role: "developer", expertise: "backend" },
  },
});

// Returns top-k results with relevance scores
results.forEach((result) => {
  console.log(`${result.path} (score: ${result.similarity})`);
});
```

## Installation

```bash
# Install transformers.js
cd transformers-js
npm install

# Install adaptive-retrieval dependencies
cd ../examples/adaptive-retrieval
npm install
```

## Code Indexing Integration

### Index Model Architectures

Use the code-indexing skill to create semantic indexes of model definitions:

```bash
# Index gemma3n model files
python scripts/ingest_chunks.py \
  --mode persistent \
  --persist-dir ./models/.code-index-journal \
  --chunks-file ./models/src/models/gemma3n/chunks.jsonl \
  --create-collections model_architectures
```

### Query Model Implementations

```typescript
import { EmbeddingService } from "./embeddings";

const service = EmbeddingService.getInstance();
await service.initialize();

const query = "How does Gemma3n process feature extraction?";
const embedding = await service.generateEmbedding(query);

// Search in model architecture index
const results = await service.semanticSearch({
  query: embedding,
  collection: "model_architectures",
  topK: 5,
});
```

## Schema Crawler Integration

### Generate TypeScript Types from Model Configs

Use the schema-crawler tool to generate types for model configurations:

```typescript
// Example: Generate types for gemma3n config
import { generateZodFromJSONSchema } from "@/agent-generator/src/mcp-registry/schema-crawler";

const gemma3nConfigSchema = {
  type: "object",
  properties: {
    model_type: { type: "string", enum: ["gemma3n"] },
    hidden_size: { type: "integer" },
    num_attention_heads: { type: "integer" },
    num_hidden_layers: { type: "integer" },
    vocab_size: { type: "integer" },
  },
  required: ["model_type", "hidden_size"],
};

const { zodCode, typeDefinition, validatorCode } = generateZodFromJSONSchema(
  gemma3nConfigSchema,
  "Gemma3nConfig"
);

// Use generated validators
const validateConfig = (config: unknown) => {
  return Gemma3nConfigSchema.parse(config);
};
```

## Agent Framework Integration

### Enhanced Embedding-Aware Agent

```typescript
// embedding-agent.ts with multiple model support
import { pipeline } from "@huggingface/transformers";

interface ModelConfig {
  name: string;
  modelId: string;
  dimension: number;
  task: "feature-extraction" | "sentence-similarity";
}

const MODELS: Record<string, ModelConfig> = {
  minilm: {
    name: "all-MiniLM-L6-v2",
    modelId: "Xenova/all-MiniLM-L6-v2",
    dimension: 384,
    task: "feature-extraction",
  },
  gemma3n: {
    name: "Gemma3n",
    modelId: "google/gemma-3n-1b",
    dimension: 1024,
    task: "feature-extraction",
  },
};

async function semanticSearch(query: string, modelKey: string = "minilm") {
  const config = MODELS[modelKey];
  const extractor = await pipeline(config.task, config.modelId);

  const queryEmbedding = await extractor(query, {
    pooling: "mean",
    normalize: true,
  });

  // Search in code index
  const results = await searchCodeIndex(queryEmbedding, config.dimension);

  return results;
}
```

## Performance Comparison

| Model            | Dimension | Speed (ms) | Memory (MB) | Use Case                    |
| ---------------- | --------- | ---------- | ----------- | --------------------------- |
| all-MiniLM-L6-v2 | 384       | ~50        | 80          | General semantic search     |
| Gemma3n-1B       | 1024      | ~150       | 500         | Deep semantic understanding |

## Best Practices

### 1. Model Selection

- **all-MiniLM-L6-v2**: Default for fast, general-purpose embeddings
- **Gemma3n**: Use for complex semantic queries requiring deeper understanding

### 2. Caching

```typescript
const embeddingCache = new Map<string, number[]>();

async function getCachedEmbedding(text: string, model: string) {
  const key = `${model}:${text}`;
  if (embeddingCache.has(key)) {
    return embeddingCache.get(key)!;
  }

  const embedding = await generateEmbedding(text, model);
  embeddingCache.set(key, embedding);
  return embedding;
}
```

### 3. Batch Processing

```typescript
async function generateBatchEmbeddings(texts: string[], batchSize: number = 32) {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(batch.map((text) => generateEmbedding(text)));
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}
```

## Troubleshooting

### Issue: Model not found

```bash
# Ensure transformers.js is installed
cd transformers-js
npm install

# Verify model availability
node -e "const { pipeline } = require('@huggingface/transformers'); pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2').then(() => console.log('Model loaded'))"
```

### Issue: Out of memory

```typescript
// Use smaller model or reduce batch size
const config = {
  modelId: "Xenova/all-MiniLM-L6-v2", // Smaller than Gemma3n
  batchSize: 16, // Reduced from 32
};
```

## Future Enhancements

- [ ] **Multi-modal embeddings**: Image + text embeddings
- [ ] **Fine-tuning support**: Domain-specific embedding models
- [ ] **Quantization**: 4-bit/8-bit quantized models for mobile
- [ ] **Model registry**: Centralized model management
- [ ] **Automatic model selection**: Context-aware model routing

## Related Documentation

- [Code Indexing Skill](../../agent-generator/src/skills/code-indexing/SKILL.md)
- [Schema Crawler Tool](../../agent-generator/SCHEMA_CRAWLER_README.md)
- [Embedding Service](../../scripts/knowledge-management/embeddings/embeddings.ts)
- [Micro-Agents Framework](../README.md)

## References

- Transformers.js: <https://huggingface.co/docs/transformers.js>
- Gemma3n Model: <https://huggingface.co/google/gemma-3n-1b>
- Adaptive Retrieval: <https://github.com/huggingface/transformers.js/tree/main/examples/adaptive-retrieval>
- Xenova Models: <https://huggingface.co/Xenova>

---

**Maintained by**: ModMe GenUI Team  
**Last Updated**: January 7, 2026  
**Version**: 1.0.0
