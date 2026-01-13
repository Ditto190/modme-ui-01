# Models Library - Codebase Index

> **Comprehensive inventory of the transformers.js models library**  
> Following the structure of [CODEBASE_INDEX.md](../../../CODEBASE_INDEX.md)

**Created**: January 7, 2026  
**Version**: 1.0.0  
**Location**: `/experiments/micro-agents/models/`

---

## 📂 Directory Structure

```
models/
├── embeddings.ts                    # 400 lines - Core embedding service
├── types/                           # Type definitions
│   ├── gemma3n-config.ts           # 300 lines - Generated Zod schemas
│   └── index.ts                     # 20 lines - Type barrel export
├── package.json                     # 40 lines - NPM configuration
├── node_modules/                    # 55 packages (48MB)
│   └── @huggingface/transformers/  # 40MB - Core ML library
├── test-models.js                   # 165 lines - Integration tests
├── verify-install.sh                # 50 lines - Installation verification
├── README.md                        # 400+ lines - Integration guide
├── IMPLEMENTATION_SUMMARY.md        # 500 lines - Technical implementation
├── QUICK_START.md                   # 150 lines - Quick reference
├── MCP_LSP_INTEGRATION.md          # NEW - MCP/LSP integration patterns
├── MODELS_INDEX.md                  # THIS FILE
└── .git/                            # Git sparse-checkout sources
    └── transformers.js/             # Gemma3n + adaptive-retrieval examples
```

---

## 🧩 Component Catalog

### Core Modules

#### 1. Unified Embedding Service (`embeddings.ts`)

**Path**: `experiments/micro-agents/models/embeddings.ts`  
**Lines**: 400  
**Purpose**: Multi-model embedding generation and semantic search

**Key Features**:

- Singleton service pattern
- Lazy model initialization
- Adaptive model selection
- Batch processing with parallel execution
- Cosine similarity computation
- ChromaDB integration for semantic search
- Caching layer for performance

**Dependencies**:

```json
{
  "@huggingface/transformers": "^3.8.1",
  "chromadb": "^1.9.2",
  "pg": "^8.11.0",
  "@types/pg": "^8.6.6",
  "zod": "^3.23.8"
}
```

**API Surface**:

```typescript
class UnifiedEmbeddingService {
  // Initialization
  async initialize(modelKey: ModelKey): Promise<void>;

  // Single embedding
  async generateEmbedding(text: string, modelKey?: ModelKey): Promise<number[]>;

  // Batch embeddings
  async generateBatchEmbeddings(
    texts: string[],
    modelKey?: ModelKey,
    batchSize?: number
  ): Promise<number[][]>;

  // Adaptive retrieval
  async adaptiveRetrieval(
    query: string,
    context?: AdaptiveRetrievalContext,
    indexPath?: string
  ): Promise<SearchResult[]>;

  // Semantic search
  async searchCodeIndex(
    queryEmbedding: number[],
    indexPath: string,
    modelKey?: ModelKey
  ): Promise<SearchResult[]>;

  // Utilities
  cosineSimilarity(a: number[], b: number[]): number;
  async saveEmbedding(filePath: string, data: EmbeddingData): Promise<void>;
  async loadEmbedding(filePath: string): Promise<EmbeddingData>;
  getCacheStats(): CacheStats;
  clearCache(): void;
}

// Singleton export
export const embeddingService: UnifiedEmbeddingService;
```

**Type Definitions**:

```typescript
type ModelKey = "minilm" | "gemma3n";

interface ModelConfig {
  name: string;
  dimensions: number;
  speed: string;
  memory: string;
  description: string;
}

interface AdaptiveRetrievalContext {
  previousQueries?: string[];
  userProfile?: {
    preferredModels?: ModelKey[];
    complexityThreshold?: number;
  };
}

interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  model: ModelKey;
}

interface EmbeddingData {
  text: string;
  embedding: number[];
  model: ModelKey;
  timestamp: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}
```

---

#### 2. Type Definitions (`types/gemma3n-config.ts`)

**Path**: `experiments/micro-agents/models/types/gemma3n-config.ts`  
**Lines**: 300  
**Purpose**: Generated TypeScript types with Zod validation

**Generation Method**: Generated using [schema-crawler.ts](../../../agent-generator/src/mcp-registry/schema-crawler.ts)

**Exported Types**:

```typescript
// Audio Configuration
export interface Gemma3nAudioConfig {
  num_mel_bins?: number;
  sampling_rate?: number;
  do_normalize?: boolean;
}

// Text Configuration
export interface Gemma3nTextConfig {
  max_length?: number;
  padding?: string;
  truncation?: boolean;
}

// Feature Extraction Options
export interface Gemma3nFeatureExtractionOptions {
  pooling?: "mean" | "cls";
  normalize?: boolean;
  audio_config?: Gemma3nAudioConfig;
  text_config?: Gemma3nTextConfig;
}

// Feature Output
export interface Gemma3nFeatureOutput {
  embeddings: number[];
  pooled_output?: number[];
  attention_mask?: number[];
}

// Main Configuration
export interface Gemma3nConfig {
  model_type?: string;
  hidden_size?: number;
  num_hidden_layers?: number;
  num_attention_heads?: number;
  intermediate_size?: number;
  hidden_act?: string;
  max_position_embeddings?: number;
}
```

**Zod Schemas**:

```typescript
export const Gemma3nAudioConfigSchema = z.object({
  num_mel_bins: z.number().optional(),
  sampling_rate: z.number().optional(),
  do_normalize: z.boolean().optional(),
});

// ... all interfaces have matching Zod schemas
```

**Validators**:

```typescript
// Throwing validators
export function validateGemma3nConfig(input: unknown): Gemma3nConfig
export function validateGemma3nAudioConfig(input: unknown): Gemma3nAudioConfig
// ... validators for all types

// Safe validators (returns Result type)
export function validateGemma3nConfigSafe(input: unknown): SafeParseReturnType<...>
export function validateGemma3nAudioConfigSafe(input: unknown): SafeParseReturnType<...>
// ... safe validators for all types

// Type guards
export function isGemma3nConfig(value: unknown): value is Gemma3nConfig
export function isGemma3nAudioConfig(value: unknown): value is Gemma3nAudioConfig
// ... type guards for all types
```

**Default Values**:

```typescript
export const DEFAULT_GEMMA3N_CONFIG: Gemma3nConfig = {
  model_type: "gemma3n",
  hidden_size: 1024,
  num_hidden_layers: 12,
  num_attention_heads: 16,
  intermediate_size: 4096,
  hidden_act: "gelu",
  max_position_embeddings: 8192,
};

export const DEFAULT_AUDIO_CONFIG: Gemma3nAudioConfig = {
  num_mel_bins: 80,
  sampling_rate: 16000,
  do_normalize: true,
};

export const DEFAULT_TEXT_CONFIG: Gemma3nTextConfig = {
  max_length: 512,
  padding: "max_length",
  truncation: true,
};
```

---

#### 3. Type Barrel (`types/index.ts`)

**Path**: `experiments/micro-agents/models/types/index.ts`  
**Lines**: 20  
**Purpose**: Centralized type exports

```typescript
// Re-export all Gemma3n types
export * from "./gemma3n-config";

// Re-export embedding service types
export type {
  ModelKey,
  ModelConfig,
  AdaptiveRetrievalContext,
  SearchResult,
  EmbeddingData,
  CacheStats,
} from "../embeddings";

// Re-export embedding service
export { embeddingService } from "../embeddings";
```

---

### Available Models

#### Model Registry

```typescript
export const MODELS: Record<ModelKey, ModelConfig> = {
  minilm: {
    name: "Xenova/all-MiniLM-L6-v2",
    dimensions: 384,
    speed: "~50ms",
    memory: "80MB",
    description:
      "Fast, lightweight model for quick queries and baseline comparisons",
  },
  gemma3n: {
    name: "Google/gemma-3n",
    dimensions: 1024,
    speed: "~200ms",
    memory: "200MB",
    description:
      "Google's mobile-first model with high-dimensional embeddings for complex semantic search",
  },
};
```

#### Model Selection Matrix

| Use Case                    | Recommended Model | Rationale                                              |
| --------------------------- | ----------------- | ------------------------------------------------------ |
| **Quick queries**           | `minilm`          | Low latency (~50ms), sufficient for most tasks         |
| **Complex semantic search** | `gemma3n`         | High-dimensional (1024) captures nuanced relationships |
| **Batch processing**        | `minilm`          | Faster throughput for large datasets                   |
| **Multi-lingual**           | `gemma3n`         | Better cross-lingual understanding                     |
| **Code similarity**         | `gemma3n`         | Captures structural patterns better                    |
| **Baseline benchmarks**     | `minilm`          | Standard reference point                               |

#### Adaptive Selection Logic

```typescript
// Automatically select model based on query complexity
const results = await embeddingService.adaptiveRetrieval(query, {
  previousQueries: ["What is the error rate?", "Show me performance metrics"],
  userProfile: {
    preferredModels: ["gemma3n"],
    complexityThreshold: 0.7,
  },
});

// Complexity factors:
// - Query length (> 50 words → complex)
// - Technical terms (> 5 terms → complex)
// - Previous query similarity (low similarity → explore mode → gemma3n)
// - User preferences (can override automatic selection)
```

---

### Configuration Files

#### Package Configuration (`package.json`)

**Path**: `experiments/micro-agents/models/package.json`  
**Lines**: 40

```json
{
  "name": "@modme/models-library",
  "version": "1.0.0",
  "description": "Unified embedding service with transformers.js - Gemma3n and MiniLM support",
  "type": "module",
  "main": "embeddings.ts",
  "types": "types/index.ts",
  "exports": {
    ".": {
      "import": "./embeddings.ts",
      "types": "./types/index.ts"
    },
    "./types": {
      "import": "./types/index.ts",
      "types": "./types/index.ts"
    }
  },
  "scripts": {
    "test": "node test-models.js",
    "verify": "bash verify-install.sh",
    "clean": "rm -rf node_modules package-lock.json"
  },
  "keywords": [
    "embeddings",
    "transformers",
    "gemma3n",
    "minilm",
    "semantic-search",
    "mcp",
    "lsp"
  ],
  "dependencies": {
    "@huggingface/transformers": "^3.8.1",
    "chromadb": "^1.9.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.3"
  },
  "engines": {
    "node": ">=22.9.0"
  }
}
```

**Key Points**:

- ES Module support (`"type": "module"`)
- Dual exports (main service + types)
- Test scripts included
- Node.js 22.9.0+ required (matches workspace)

---

### Testing & Verification

#### Test Suite (`test-models.js`)

**Path**: `experiments/micro-agents/models/test-models.js`  
**Lines**: 165  
**Purpose**: Integration tests for all embedding features

**Test Coverage**:

```javascript
// Test 1: Model Initialization
await embeddingService.initialize("minilm");
await embeddingService.initialize("gemma3n");

// Test 2: Single Embedding Generation
const embedding = await embeddingService.generateEmbedding(
  "test text",
  "minilm"
);
assert(embedding.length === 384);

// Test 3: Batch Processing
const embeddings = await embeddingService.generateBatchEmbeddings(
  ["text1", "text2", "text3"],
  "minilm",
  2 // Batch size
);
assert(embeddings.length === 3);

// Test 4: Cosine Similarity
const similarity = embeddingService.cosineSimilarity([1, 0, 0], [0, 1, 0]);
assert(similarity === 0);

// Test 5: Save/Load Embeddings
await embeddingService.saveEmbedding("./test-embedding.json", data);
const loaded = await embeddingService.loadEmbedding("./test-embedding.json");
assert.deepEqual(loaded, data);

// Test 6: Cache Statistics
const stats = embeddingService.getCacheStats();
console.log("Cache hit rate:", stats.hitRate);
```

**Run Tests**:

```bash
cd experiments/micro-agents/models
npm test
```

---

#### Installation Verification (`verify-install.sh`)

**Path**: `experiments/micro-agents/models/verify-install.sh`  
**Lines**: 50  
**Purpose**: Verify complete installation

**Checks**:

1. ✅ Node.js version (>= 22.9.0)
2. ✅ NPM packages installed (55 packages)
3. ✅ Transformers.js present (40MB)
4. ✅ Type definitions exist
5. ✅ Git sparse-checkout sources available
6. ✅ All documentation files present

**Run Verification**:

```bash
cd experiments/micro-agents/models
bash verify-install.sh
```

**Expected Output**:

```
✅ Node.js version: v22.9.0
✅ NPM packages: 55 packages installed
✅ @huggingface/transformers: 3.8.1
✅ GreptimeDB (Postgres/pg): available at Postgres-compatible endpoint (e.g. port 4003)
✅ zod: 3.23.8
✅ Type definitions: 2 files
✅ Documentation: 6 files
✅ All checks passed!
```

---

## 📡 Module Dependencies

### Dependency Graph

```
embeddingService (embeddings.ts)
├─> @huggingface/transformers        # ML models
├─> greptime (Postgres-compatible)     # Observability + vector store
├─> zod                               # Runtime validation
└─> types/gemma3n-config.ts          # Type definitions
    └─> zod                           # Schema validation

types/index.ts
├─> types/gemma3n-config.ts
└─> embeddings.ts
```

### External Dependencies

| Package                     | Version | Size  | Purpose                        |
| --------------------------- | ------- | ----- | ------------------------------ |
| `@huggingface/transformers` | 3.8.1   | 40MB  | ML model runtime               |
| `pg` (GreptimeDB)           | ^8.11.0 | 1.2MB | Postgres client for GreptimeDB |
| `zod`                       | 3.23.8  | 1MB   | Runtime schema validation      |
| `@types/node`               | 22.0.0  | 2MB   | Node.js type definitions       |
| `typescript`                | 5.6.3   | 10MB  | TypeScript compiler            |

**Total Size**: ~48MB (excluding node_modules overhead)

### Internal Dependencies

- **embedding-agent.ts** (base/embedding-agent.ts): Enhanced with real semantic search using embeddingService
- **MCP Server** (future): Will expose embeddingService as MCP tools
- **LSP Server** (future): Will provide IDE completions for model keys

---

## 🔌 API Contracts

### Public Interface

#### UnifiedEmbeddingService

**Initialization**:

```typescript
// Must call before first use
await embeddingService.initialize("minilm");
// Or
await embeddingService.initialize("gemma3n");
```

**Single Embedding**:

```typescript
const embedding: number[] = await embeddingService.generateEmbedding(
  "Search for error handling patterns",
  "gemma3n" // Optional, uses current model if omitted
);

// Returns: number[] with length 384 (minilm) or 1024 (gemma3n)
```

**Batch Embeddings**:

```typescript
const embeddings: number[][] = await embeddingService.generateBatchEmbeddings(
  ["text1", "text2", "text3"],
  "minilm",
  10 // Batch size for parallel processing
);

// Returns: number[][] where each inner array is 384 or 1024 dimensions
```

**Adaptive Retrieval**:

```typescript
const results: SearchResult[] = await embeddingService.adaptiveRetrieval(
  "Find authentication patterns",
  {
    previousQueries: ["What is JWT?", "OAuth2 flow"],
    userProfile: {
      preferredModels: ["gemma3n"],
      complexityThreshold: 0.7,
    },
  },
  "./chroma_data/code_index" // ChromaDB collection path
);

// Returns: SearchResult[] sorted by relevance (cosine similarity)
```

**Semantic Search**:

```typescript
const queryEmbedding = await embeddingService.generateEmbedding(
  "error handling"
);
const results: SearchResult[] = await embeddingService.searchCodeIndex(
  queryEmbedding,
  "./chroma_data/code_index",
  "gemma3n"
);

// Returns: Top 10 most similar code snippets
```

**Utilities**:

```typescript
// Cosine similarity
const similarity: number = embeddingService.cosineSimilarity(
  embedding1,
  embedding2
)
// Returns: -1 to 1 (1 = identical, 0 = orthogonal, -1 = opposite)

// Save/Load
await embeddingService.saveEmbedding('./cache/query1.json', {
  text: 'example query',
  embedding: [0.1, 0.2, ...],
  model: 'minilm',
  timestamp: new Date().toISOString(),
})

const loaded = await embeddingService.loadEmbedding('./cache/query1.json')

// Cache management
const stats = embeddingService.getCacheStats()
// Returns: { hits: 42, misses: 8, hitRate: 84, size: 50 }

embeddingService.clearCache()
```

---

### Type Contracts

All types are runtime-validated using Zod schemas:

```typescript
import {
  validateGemma3nConfig,
  validateGemma3nConfigSafe,
  isGemma3nConfig,
  DEFAULT_GEMMA3N_CONFIG,
} from "./types/gemma3n-config";

// Throwing validator
const config = validateGemma3nConfig(userInput);

// Safe validator (returns Result)
const result = validateGemma3nConfigSafe(userInput);
if (result.success) {
  console.log(result.data); // Type-safe config
} else {
  console.error(result.error); // Zod error details
}

// Type guard
if (isGemma3nConfig(unknownValue)) {
  // TypeScript now knows unknownValue is Gemma3nConfig
}

// Use defaults
const config = { ...DEFAULT_GEMMA3N_CONFIG, hidden_size: 2048 };
```

---

## 🎯 Entry Points

### For Application Code

```typescript
// Import singleton service
import { embeddingService } from "@modme/models-library";

// Import types
import type {
  ModelKey,
  SearchResult,
  AdaptiveRetrievalContext,
} from "@modme/models-library/types";

// Usage
await embeddingService.initialize("minilm");
const embedding = await embeddingService.generateEmbedding("hello world");
```

### For MCP Server Integration

```typescript
// Import for MCP tool definitions
import { embeddingService } from "./experiments/micro-agents/models/embeddings";
import { MODELS } from "./experiments/micro-agents/models/embeddings";

// Define MCP tools
const tools = [
  {
    name: "generate_embedding",
    handler: async (params) => {
      const { text, modelKey } = params;
      await embeddingService.initialize(modelKey || "minilm");
      return embeddingService.generateEmbedding(text, modelKey);
    },
  },
];
```

### For LSP Server Integration

```typescript
// Import for code completions
import { MODELS } from "./experiments/micro-agents/models/embeddings";
import type { ModelKey } from "./experiments/micro-agents/models/types";

// Provide completions
const modelKeys: CompletionItem[] = Object.keys(MODELS).map((key) => ({
  label: key,
  kind: CompletionItemKind.Constant,
  detail: `${MODELS[key].dimensions}-dim model`,
}));
```

---

## 📖 Documentation Files

| File                        | Lines | Purpose                          | Status      |
| --------------------------- | ----- | -------------------------------- | ----------- |
| `README.md`                 | 400+  | Integration guide with examples  | ✅ Complete |
| `IMPLEMENTATION_SUMMARY.md` | 500   | Technical implementation details | ✅ Complete |
| `QUICK_START.md`            | 150   | Quick reference guide            | ✅ Complete |
| `MCP_LSP_INTEGRATION.md`    | 1000+ | MCP/LSP integration patterns     | ✅ Complete |
| `MODELS_INDEX.md`           | THIS  | Codebase inventory               | ✅ Complete |

---

## 🔄 Integration Points

### With Schema Crawler

**Purpose**: Generate Zod schemas from JSON Schema definitions

**Usage**:

```typescript
import { generateZodModule } from "../../../agent-generator/src/mcp-registry/schema-crawler";

const schema = {
  type: "object",
  properties: {
    text: { type: "string", minLength: 1 },
    modelKey: { type: "string", enum: ["minilm", "gemma3n"] },
  },
  required: ["text"],
};

const module = generateZodModule("generate_embedding", schema);
// Generates complete TypeScript module with Zod schemas and validators
```

**Files Using Schema Crawler**:

- `types/gemma3n-config.ts` (generated from JSON Schema)

---

### With Skill Creator

**Purpose**: Package embedding operations as reusable agent skills

**Usage**:

```python
from agent.skills_ref.scripts.init_skill import init_skill

# Initialize new skill
init_skill(
    skill_name='semantic_code_search',
    description='Search code using semantic embeddings',
    parameters={
        'query': {'type': 'string', 'required': True},
        'collection': {'type': 'string', 'required': True},
        'topK': {'type': 'integer', 'default': 10},
    }
)

# Generates SKILL.md with standardized structure
```

**Generated Skills**:

- `semantic_code_search` - Search indexed code
- `ingest_repository` - Ingest GitHub repository
- `generate_agent_library` - Extract patterns from code

---

### With Embedding Agent

**Purpose**: Provide semantic search capabilities to AI agents

**Integration**:

```typescript
// base/embedding-agent.ts
import { embeddingService } from "../models/embeddings";

class EmbeddingAgent {
  async semanticSearch(query: string): Promise<SearchResult[]> {
    // Real implementation using embeddingService
    return embeddingService.adaptiveRetrieval(query, {
      previousQueries: this.queryHistory,
    });
  }
}
```

**Enhanced Features**:

- Real semantic search (not mocked)
- Adaptive model selection based on query complexity
- Query history tracking for context-aware retrieval

---

### With GreptimeDB (Postgres-compatible)

**Purpose**: GreptimeDB serves as the full observability store (metrics, logs, traces) and also persists embeddings for semantic search via its Postgres-compatible interface.

**Integration (Node.js)**:

```typescript
// Use the greptime client wrapper or `pg` to connect to GreptimeDB's Postgres endpoint
import { greptimeClient } from "./greptimedb_client";

await greptimeClient.init();

const texts = ["function foo() {}", "class Bar {}"];
const embeddings = await embeddingService.generateBatchEmbeddings(
  texts,
  "minilm"
);

await Promise.all(
  embeddings.map(async (emb, i) => {
    await greptimeClient.upsertEmbedding({
      id: `chunk-${i}`,
      path: `example-${i}.ts`,
      text: texts[i],
      embedding: emb,
      sections: [],
      timestamp: Date.now(),
      modelId: "minilm",
      dimension: emb.length,
    });
  })
);
```

**Storage Layers**:

1. **Session/Persistent Storage**: GreptimeDB Postgres endpoint (single binary or cluster)
2. **Artifact Export**: Back up embeddings to Parquet/CSV for long-term archival
3. **Journal Storage**: `.code-index-journal/` directory for local snapshots and debugging

---

## 🚀 Quick Start Examples

### Example 1: Generate Single Embedding

```typescript
import { embeddingService } from "@modme/models-library";

// Initialize
await embeddingService.initialize("minilm");

// Generate
const embedding = await embeddingService.generateEmbedding(
  "What is the error rate?"
);

console.log(`Generated ${embedding.length}-dimensional embedding`);
// Output: Generated 384-dimensional embedding
```

### Example 2: Batch Processing

```typescript
const codeSnippets = [
  "async function fetchData() { ... }",
  "class UserService { ... }",
  'export const API_URL = "..." ',
];

const embeddings = await embeddingService.generateBatchEmbeddings(
  codeSnippets,
  "gemma3n",
  2 // Process 2 at a time
);

console.log(`Generated ${embeddings.length} embeddings`);
// Output: Generated 3 embeddings
```

### Example 3: Semantic Code Search

```typescript
// Generate query embedding
await embeddingService.initialize("gemma3n");
const queryEmbedding = await embeddingService.generateEmbedding(
  "Find error handling patterns"
);

// Search ChromaDB
const results = await embeddingService.searchCodeIndex(
  queryEmbedding,
  "./chroma_data/code_index",
  "gemma3n"
);

results.forEach((result) => {
  console.log(`${result.score.toFixed(3)}: ${result.content.slice(0, 100)}...`);
});
```

### Example 4: Adaptive Retrieval

```typescript
const results = await embeddingService.adaptiveRetrieval(
  "Complex authentication flow with JWT",
  {
    previousQueries: ["What is JWT?", "OAuth2 basics"],
    userProfile: {
      preferredModels: ["gemma3n"],
      complexityThreshold: 0.7,
    },
  },
  "./chroma_data/code_index"
);

console.log(`Model selected: ${results[0]?.model}`);
// Output: Model selected: gemma3n (due to complex query)
```

---

## 🔧 Maintenance & Updates

### Version History

| Version | Date       | Changes                               |
| ------- | ---------- | ------------------------------------- |
| 1.0.0   | 2026-01-07 | Initial release with MiniLM + Gemma3n |

### Updating Models

To add a new model:

1. Update `MODELS` constant in `embeddings.ts`:

   ```typescript
   export const MODELS = {
     minilm: { ... },
     gemma3n: { ... },
     newmodel: {
       name: 'vendor/model-name',
       dimensions: 512,
       speed: '~100ms',
       memory: '150MB',
       description: 'New model description',
     },
   }
   ```

2. Update `ModelKey` type:

   ```typescript
   export type ModelKey = "minilm" | "gemma3n" | "newmodel";
   ```

3. Regenerate type definitions:

   ```bash
   npm run generate:types
   ```

4. Update tests in `test-models.js`

5. Update documentation

---

## 🔗 Related Resources

- **[MCP/LSP Integration Guide](./MCP_LSP_INTEGRATION.md)** - MCP server and LSP integration patterns
- **[README](./README.md)** - Core functionality and usage
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Technical details
- **[Quick Start](./QUICK_START.md)** - Getting started guide
- **[Schema Crawler](../../../agent-generator/SCHEMA_CRAWLER_README.md)** - Type generation tool
- **[Skill Creator](../../../agent-generator/src/skills/skill-creator/)** - Agent skill packaging
- **[ChromaDB Indexing](../../../docs/CHROMADB_INDEXING.md)** - Vector database setup

---

**Version**: 1.0.0  
**Last Updated**: January 7, 2026  
**Maintained by**: ModMe GenUI Team
