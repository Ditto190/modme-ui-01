# MCP/LSP Integration Patterns for Models Library

> **Comprehensive guide to integrating the transformers.js models library with MCP servers and LSP capabilities**

**Created**: January 7, 2026  
**Version**: 1.0.0  
**Tech Stack**: MCP Protocol, LSP, TypeScript, Python, GreptimeDB

---

## 📚 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Models Library Index](#models-library-index)
3. [MCP Server Integration](#mcp-server-integration)
4. [LSP Server Integration](#lsp-server-integration)
5. [CRUD Operations](#crud-operations)
6. [Agent Library Generation](#agent-library-generation)
7. [Transport & Storage](#transport--storage)
8. [Reference Implementations](#reference-implementations)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP/LSP Integration Layer                │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
      ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
      │ Models Index │    │  MCP Server  │    │  LSP Server  │
      │  (GreptimeDB)│    │   (FastAPI)  │    │ (TypeScript) │
      └──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │   Unified Embedding Service           │
        │   - MiniLM (384-dim)                  │
        │   - Gemma3n (1024-dim)                │
        └───────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
┌──────────────┐                        ┌──────────────┐
│ Code/Instrs  │                        │ Agent Libs   │
│   Ingestion  │                        │  Generation  │
└──────────────┘                        └──────────────┘
```

---

## Models Library Index

### Component Inventory

Based on [CODEBASE_INDEX.md](../../../CODEBASE_INDEX.md), here's the complete index of models library components:

#### Core Modules

| Module                 | Path                      | Purpose                                  | Lines | Dependencies                    |
| ---------------------- | ------------------------- | ---------------------------------------- | ----- | ------------------------------- |
| **Embeddings Service** | `embeddings.ts`           | Unified multi-model embedding API        | 400   | @huggingface/transformers       |
| **Type Definitions**   | `types/gemma3n-config.ts` | Generated Zod schemas + TypeScript types | 300   | zod                             |
| **Type Barrel**        | `types/index.ts`          | Re-exports all types                     | 20    | ./gemma3n-config, ../embeddings |
| **Package Config**     | `package.json`            | NPM package definition                   | 40    | transformers.js, zod            |

#### Available Models

| Model       | Key       | Dimensions | Speed  | Memory | Use Case                |
| ----------- | --------- | ---------- | ------ | ------ | ----------------------- |
| **MiniLM**  | `minilm`  | 384        | ~50ms  | 80MB   | Quick queries, baseline |
| **Gemma3n** | `gemma3n` | 1024       | ~200ms | 200MB  | Complex semantic search |

#### API Surface

```typescript
// Singleton Service
export const embeddingService: UnifiedEmbeddingService

// Core Methods
- initialize(modelKey: string): Promise<void>
- generateEmbedding(text: string, modelKey?: string): Promise<number[]>
- generateBatchEmbeddings(texts: string[], modelKey?: string, batchSize?: number): Promise<number[][]>
- adaptiveRetrieval(query: string, context?: AdaptiveRetrievalContext, indexPath?: string): Promise<SearchResult[]>
- searchCodeIndex(queryEmbedding: number[], indexPath: string, modelKey?: string): Promise<SearchResult[]>
- cosineSimilarity(a: number[], b: number[]): number

// Utility Methods
- saveEmbedding(filePath: string, data: EmbeddingData): Promise<void>
- loadEmbedding(filePath: string): Promise<EmbeddingData>
- getCacheStats(): CacheStats
- clearCache(): void
```

#### Validation Schemas

```typescript
// Gemma3n Configuration Types (Zod-validated)
- Gemma3nAudioConfig
- Gemma3nTextConfig
- Gemma3nFeatureExtractionOptions
- Gemma3nFeatureOutput
- Gemma3nConfig

// Validators
- validateGemma3nConfig(input: unknown): Gemma3nConfig
- validateGemma3nConfigSafe(input: unknown): SafeParseReturnType
- isGemma3nConfig(value: unknown): boolean (type guard)
```

---

## MCP Server Integration

### Server Architecture

The models library exposes MCP tools for parallel embedding generation and semantic search.

#### MCP Tool Definitions

```typescript
// mcp-server.ts
import { Server } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { embeddingService } from "./embeddings";

const server = new Server(
  {
    name: "models-library-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool 1: Generate Single Embedding
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "generate_embedding") {
    const { text, modelKey } = request.params.arguments;

    try {
      await embeddingService.initialize(modelKey || "minilm");
      const embedding = await embeddingService.generateEmbedding(text, modelKey);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              embedding,
              dimensions: embedding.length,
              model: modelKey || "minilm",
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error.message }),
          },
        ],
        isError: true,
      };
    }
  }
});

// Tool 2: Batch Embeddings (Parallel Processing)
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "generate_batch_embeddings") {
    const { texts, modelKey, batchSize } = request.params.arguments;

    try {
      await embeddingService.initialize(modelKey || "minilm");
      const embeddings = await embeddingService.generateBatchEmbeddings(texts, modelKey, batchSize);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              embeddings,
              count: embeddings.length,
              dimensions: embeddings[0]?.length || 0,
              model: modelKey || "minilm",
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error.message }),
          },
        ],
        isError: true,
      };
    }
  }
});

// Tool 3: Adaptive Semantic Search
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "adaptive_search") {
    const { query, context, indexPath } = request.params.arguments;

    try {
      const results = await embeddingService.adaptiveRetrieval(query, context, indexPath);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              results,
              count: results.length,
              model_used: results[0]?.model || "minilm",
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error.message }),
          },
        ],
        isError: true,
      };
    }
  }
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
```

#### Tool Schema Definitions

Using [schema-crawler.ts](../../../agent-generator/src/mcp-registry/schema-crawler.ts):

```typescript
// Generate JSON Schemas for MCP tools
import { generateZodModule } from "../../../agent-generator/src/mcp-registry/schema-crawler";

const generateEmbeddingSchema = {
  type: "object",
  properties: {
    text: {
      type: "string",
      description: "Text to generate embedding for",
      minLength: 1,
      maxLength: 10000,
    },
    modelKey: {
      type: "string",
      enum: ["minilm", "gemma3n"],
      description: "Model to use for embedding generation",
    },
  },
  required: ["text"],
};

const batchEmbeddingsSchema = {
  type: "object",
  properties: {
    texts: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 100,
      description: "Array of texts to generate embeddings for",
    },
    modelKey: {
      type: "string",
      enum: ["minilm", "gemma3n"],
    },
    batchSize: {
      type: "integer",
      minimum: 1,
      maximum: 50,
      default: 10,
    },
  },
  required: ["texts"],
};

// Generate Zod schemas + TypeScript types
const generateEmbeddingModule = generateZodModule("generate_embedding", generateEmbeddingSchema);

const batchEmbeddingsModule = generateZodModule("generate_batch_embeddings", batchEmbeddingsSchema);
```

---

## LSP Server Integration

### Language Server Features

Provide IDE integration for embedding-related code completion and validation.

#### LSP Server Implementation

```typescript
// lsp-server.ts
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { MODELS } from "./embeddings";

// Create connection
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Initialize server
connection.onInitialize((params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [".", '"', "'"],
      },
      hoverProvider: true,
    },
  };
});

// Completion: Suggest model keys
connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const line = document.getText({
    start: { line: params.position.line, character: 0 },
    end: params.position,
  });

  // Detect embedding service usage
  if (line.includes("embeddingService.") || line.includes("modelKey")) {
    return Object.keys(MODELS).map((key, index) => ({
      label: key,
      kind: CompletionItemKind.Constant,
      data: index,
      detail: `${MODELS[key].dimensions}-dim embedding model`,
      documentation: MODELS[key].description,
    }));
  }

  return [];
});

// Hover: Show model information
connection.onHover((params: TextDocumentPositionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const wordRange = getWordRangeAtPosition(document, params.position);
  const word = document.getText(wordRange);

  if (MODELS[word]) {
    const model = MODELS[word];
    return {
      contents: {
        kind: "markdown",
        value: [
          `**${word}** embedding model`,
          "",
          `- Dimensions: ${model.dimensions}`,
          `- Speed: ~${model.speed}ms`,
          `- Memory: ${model.memory}MB`,
          "",
          `*${model.description}*`,
        ].join("\n"),
      },
    };
  }

  return null;
});

// Start listening
documents.listen(connection);
connection.listen();
```

#### VS Code Extension Integration

```typescript
// extension.ts (VS Code Extension)
import * as path from "path";
import { workspace, ExtensionContext } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // Server path
  const serverModule = context.asAbsolutePath(path.join("out", "server", "lsp-server.js"));

  // Server options
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ["--nolazy", "--inspect=6009"] },
    },
  };

  // Client options
  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "typescript" },
      { scheme: "file", language: "javascript" },
    ],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
  };

  // Create client
  client = new LanguageClient(
    "modelsLibraryLSP",
    "Models Library Language Server",
    serverOptions,
    clientOptions
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) return undefined;
  return client.stop();
}
```

---

## CRUD Operations

### Code/Instructions Ingestion Pipeline

Using the models library with MCP for ingesting external code and instructions:

#### Ingestion Flow

```
1. Fetch Code/Instructions (GitHub MCP tools)
   ↓
2. Chunk Content (pykomodo)
   ↓
3. Generate Embeddings (Models Library MCP)
   ↓
4. Store in ChromaDB (Session or Persistent)
   ↓
5. Index in Journal (.code-index-journal/)
```

#### Implementation

```typescript
// ingest-pipeline.ts
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { embeddingService } from "./embeddings";
import ChromaDB from "chromadb";

interface IngestionConfig {
  githubOwner: string;
  githubRepo: string;
  branch?: string;
  paths?: string[];
  modelKey?: "minilm" | "gemma3n";
  chromaCollection: string;
}

async function ingestCodeRepository(config: IngestionConfig): Promise<void> {
  // 1. Connect to GitHub MCP server
  const githubClient = new Client({
    name: "code-ingestion-client",
    version: "1.0.0",
  });

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
  });

  await githubClient.connect(transport);

  // 2. Fetch repository files
  const files = await githubClient.request({
    method: "tools/call",
    params: {
      name: "get_file_contents",
      arguments: {
        owner: config.githubOwner,
        repo: config.githubRepo,
        path: "", // Root directory
      },
    },
  });

  // 3. Chunk files
  const chunks = await chunkFiles(files, {
    chunkSize: 1000,
    overlap: 200,
  });

  // 4. Generate embeddings (parallel)
  await embeddingService.initialize(config.modelKey || "minilm");
  const embeddings = await embeddingService.generateBatchEmbeddings(
    chunks.map((c) => c.content),
    config.modelKey,
    10 // Batch size
  );

  // 5. Store in GreptimeDB (Postgres-compatible ingestion)
  // Example using the greptime client wrapper (Node.js) or direct `pg` client
  import { greptimeClient } from "./greptimedb_client";

  // Ensure GreptimeDB client is initialized
  await greptimeClient.init();

  // Upsert each chunk as a record (id is unique per chunk)
  await Promise.all(
    chunks.map(async (c, i) => {
      const id = `chunk-${i}`;
      await greptimeClient.upsertEmbedding({
        id,
        path: c.file,
        text: c.content,
        embedding: embeddings[i],
        sections: [],
        timestamp: Date.now(),
        modelId: config.modelKey || "minilm",
        dimension: embeddings[i]?.length || null,
      });
    })
  );

  console.log(`✅ Ingested ${chunks.length} chunks from ${config.githubRepo}`);
}

// Helper: Chunk files
async function chunkFiles(
  files: any[],
  options: { chunkSize: number; overlap: number }
): Promise<
  Array<{
    file: string;
    content: string;
    startLine: number;
    endLine: number;
    language: string;
  }>
> {
  // Implementation using pykomodo or similar chunking strategy
  // Returns array of chunked file contents with metadata
  return [];
}
```

#### CRUD Tool Definitions

```typescript
// crud-tools.ts
export const crudTools = {
  // CREATE: Ingest new code/instructions
  ingest: {
    name: "ingest_code",
    description: "Ingest code from GitHub repository into embedding index",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        branch: { type: "string", default: "main" },
        paths: { type: "array", items: { type: "string" } },
        modelKey: { type: "string", enum: ["minilm", "gemma3n"] },
        collection: { type: "string" },
      },
      required: ["owner", "repo", "collection"],
    },
  },

  // READ: Search indexed code
  search: {
    name: "search_code_index",
    description: "Semantic search across indexed code",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1 },
        collection: { type: "string" },
        topK: { type: "integer", minimum: 1, maximum: 100, default: 10 },
        modelKey: { type: "string", enum: ["minilm", "gemma3n"] },
      },
      required: ["query", "collection"],
    },
  },

  // UPDATE: Re-index with new embeddings
  reindex: {
    name: "reindex_collection",
    description: "Regenerate embeddings for a collection",
    inputSchema: {
      type: "object",
      properties: {
        collection: { type: "string" },
        newModelKey: { type: "string", enum: ["minilm", "gemma3n"] },
        batchSize: { type: "integer", default: 50 },
      },
      required: ["collection", "newModelKey"],
    },
  },

  // DELETE: Remove from index
  delete: {
    name: "delete_from_index",
    description: "Remove entries from embedding index",
    inputSchema: {
      type: "object",
      properties: {
        collection: { type: "string" },
        ids: { type: "array", items: { type: "string" } },
      },
      required: ["collection", "ids"],
    },
  },
};
```

---

## Agent Library Generation

### Generating Agent Skills from Indexed Code

Using [skill-creator](../../../agent-generator/src/skills/skill-creator/) to generate reusable skills:

#### Generation Workflow

```typescript
// agent-library-generator.ts
import { embeddingService } from "./embeddings";
import { generateAgentPrompt } from "../../../agent/tools/generate_schemas";
import * as fs from "fs/promises";
import * as path from "path";

interface SkillTemplate {
  name: string;
  description: string;
  parameters: Record<string, any>;
  examples: string[];
  implementation: string;
}

async function generateAgentLibrary(collectionName: string, outputDir: string): Promise<void> {
  // 1. Query indexed code for patterns
  const queries = [
    "function implementation patterns",
    "error handling strategies",
    "API integration examples",
    "data transformation utilities",
  ];

  const patterns: SkillTemplate[] = [];

  for (const query of queries) {
    // 2. Semantic search
    const results = await embeddingService.adaptiveRetrieval(
      query,
      { previousQueries: queries },
      collectionName
    );

    // 3. Extract patterns
    const extracted = await extractSkillPatterns(results);
    patterns.push(...extracted);
  }

  // 4. Generate SKILL.md files
  for (const pattern of patterns) {
    const skillDir = path.join(outputDir, pattern.name);
    await fs.mkdir(skillDir, { recursive: true });

    const skillMd = generateSkillMarkdown(pattern);
    await fs.writeFile(path.join(skillDir, "SKILL.md"), skillMd);

    // 5. Generate implementation
    const implFile = path.join(skillDir, "implementation.ts");
    await fs.writeFile(implFile, pattern.implementation);
  }

  console.log(`✅ Generated ${patterns.length} agent skills`);
}

function generateSkillMarkdown(template: SkillTemplate): string {
  return `# ${template.name}

## Description

${template.description}

## Parameters

\`\`\`json
${JSON.stringify(template.parameters, null, 2)}
\`\`\`

## Examples

${template.examples
  .map((ex, i) => `### Example ${i + 1}\n\n\`\`\`typescript\n${ex}\n\`\`\`\n`)
  .join("\n")}

## Implementation

See [implementation.ts](./implementation.ts)

## References

- Generated from indexed code patterns
- Model: gemma3n (1024-dim semantic analysis)
- Extraction date: ${new Date().toISOString()}
`;
}

async function extractSkillPatterns(searchResults: any[]): Promise<SkillTemplate[]> {
  // Use LLM to extract reusable patterns from search results
  // This would integrate with the MCP sampling tool
  return [];
}
```

#### Skill Template Structure

Following [spec.md](../../../.copilot/templates/spec/spec.md) template format:

```json
{
  "skills": [
    {
      "name": "semantic_code_search",
      "nl_query": "Find error handling patterns",
      "implementation": "async function semanticSearch(query: string) { ... }",
      "intent": "Search indexed code for specific patterns",
      "manifest": "Search indexed code for patterns matching a given description",
      "parameterized": {
        "parameterized_intent": "Search indexed code for $1",
        "parameterized_implementation": "async function semanticSearch(query: string = $1) { ... }"
      }
    }
  ]
}
```

---

## Transport & Storage

### Multi-Layer Storage Architecture

#### Layer 1: Session Storage (GreptimeDB Postgres endpoint)

```python
# session_storage.py
import psycopg2

# Connect to GreptimeDB's Postgres-compatible endpoint
conn = psycopg2.connect("host=localhost port=4003 user=greptime password=greptime dbname=postgres")
cur = conn.cursor()

# Create a session-scoped table (if you prefer per-session tables, include session id prefix)
cur.execute('''
CREATE TABLE IF NOT EXISTS code_index (
  id TEXT PRIMARY KEY,
  path TEXT,
  text TEXT,
  embedding DOUBLE PRECISION[],
  sections TEXT[],
  timestamp BIGINT,
  modelId TEXT,
  dimension INT
);
''')
conn.commit()

# Insert example
# cur.execute("INSERT INTO code_index(id, path, text, embedding, timestamp) VALUES(%s,%s,%s,%s,%s)", (id, path, text, embedding, ts))
```

#### Layer 2: Persistent Storage (Artifact Export)

```python
# persistent_storage.py
from scripts.session_memory import SessionMemory

# Initialize persistent memory
memory = SessionMemory(
    mode="persistent",
    persist_dir="./chroma_data",
    embedding_dim=768
)

# Store interactions
memory.store_interaction(
    "code_ingestion",
    json.dumps({
        "source": "github/owner/repo",
        "chunks": 1500,
        "model": "minilm"
    })
)

# Store state changes
memory.store_state_change(
    "indexed_repositories",
    ["owner/repo1", "owner/repo2"]
)

# Export as artifact
memory.export_artifact("./artifacts/session_memory.tar.gz")
```

#### Layer 3: Journal Storage (.code-index-journal/)

```typescript
// journal-storage.ts
import * as fs from "fs/promises";
import * as path from "path";

interface JournalEntry {
  id: string;
  timestamp: string;
  source: string;
  embedding: number[];
  metadata: Record<string, any>;
}

async function storeInJournal(
  entry: JournalEntry,
  journalPath: string = ".code-index-journal"
): Promise<void> {
  const date = new Date().toISOString().split("T")[0];
  const journalDir = path.join(journalPath, date);

  await fs.mkdir(journalDir, { recursive: true });

  const entryFile = path.join(journalDir, `${entry.id}.json`);
  await fs.writeFile(entryFile, JSON.stringify(entry, null, 2));
}

async function searchJournal(
  query: string,
  journalPath: string = ".code-index-journal"
): Promise<JournalEntry[]> {
  // Scan journal directories
  const dirs = await fs.readdir(journalPath);
  const results: JournalEntry[] = [];

  for (const dir of dirs) {
    const files = await fs.readdir(path.join(journalPath, dir));
    for (const file of files) {
      if (file.endsWith(".json")) {
        const content = await fs.readFile(path.join(journalPath, dir, file), "utf-8");
        results.push(JSON.parse(content));
      }
    }
  }

  // Semantic search
  const queryEmbedding = await embeddingService.generateEmbedding(query);

  return results
    .map((entry) => ({
      ...entry,
      similarity: embeddingService.cosineSimilarity(queryEmbedding, entry.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);
}
```

---

## Reference Implementations

### Parallel Tool Calls Pattern

Based on the provided MCP client example:

```typescript
// parallel-embeddings.ts
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

async function generateParallelEmbeddings(
  texts: string[],
  serverUrl: string = "http://localhost:3000/mcp"
): Promise<Map<string, number[]>> {
  const client = new Client({
    name: "parallel-embeddings-client",
    version: "1.0.0",
  });

  // Connect to MCP server
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  await client.connect(transport);

  // Create parallel tool calls
  const toolCalls = texts.map((text, index) => ({
    caller: `embedding-${index}`,
    request: {
      method: "tools/call",
      params: {
        name: "generate_embedding",
        arguments: {
          text,
          modelKey: "minilm",
          caller: `embedding-${index}`,
        },
      },
    },
  }));

  console.log(`Starting ${toolCalls.length} parallel embedding generations...`);

  // Execute in parallel
  const promises = toolCalls.map(({ caller, request }) =>
    client
      .request(request)
      .then((result) => ({ caller, result }))
      .catch((error) => {
        console.error(`Error in ${caller}:`, error);
        throw error;
      })
  );

  const results = await Promise.all(promises);

  // Organize results
  const embeddings = new Map<string, number[]>();
  results.forEach(({ caller, result }) => {
    const data = JSON.parse(result.content[0].text);
    embeddings.set(caller, data.embedding);
  });

  await transport.close();
  return embeddings;
}
```

### Schema Generation Integration

Using [generate_schemas.py](../../../agent/tools/generate_schemas.py):

```python
# mcp-schema-integration.py
from agent.tools.generate_schemas import generate_tool_schemas, generate_agent_prompt
from google.adk.tools import ToolContext

def generate_mcp_schemas(tool_context: ToolContext) -> dict:
    """Generate schemas for all MCP tools in models library"""

    # 1. Generate tool schemas
    schemas_result = generate_tool_schemas(
        tool_context,
        tools_dir="experiments/micro-agents/models",
        output_file="experiments/micro-agents/models/mcp-tools-schema.json"
    )

    if schemas_result["status"] == "error":
        return schemas_result

    # 2. Generate agent prompt from skills
    prompt_result = generate_agent_prompt(
        tool_context,
        skills_dir="agent-generator/src/skills",
        output_file="experiments/micro-agents/models/agent-prompt.md",
        include_instructions=True
    )

    if prompt_result["status"] == "error":
        return prompt_result

    return {
        "status": "success",
        "message": "Generated MCP schemas and agent prompt",
        "schemas_count": schemas_result["schemas_count"],
        "skills_count": prompt_result["skills_count"],
        "outputs": {
            "schemas": schemas_result["output_path"],
            "prompt": prompt_result["output_path"]
        }
    }
```

---

## Best Practices

### 1. Model Selection

```typescript
// Use adaptive retrieval for automatic model selection
const results = await embeddingService.adaptiveRetrieval(
  query,
  {
    previousQueries: [...], // Context for complexity assessment
    userProfile: {
      preferredModels: ['gemma3n'], // User preferences
      complexityThreshold: 0.7,     // When to use Gemma3n
    },
  },
  indexPath
);

// Or explicit model selection
const embedding = await embeddingService.generateEmbedding(
  text,
  'gemma3n' // Force specific model
);
```

### 2. Batch Processing

```typescript
// Process large datasets in batches
const largeDatasetchunks = chunkArray(texts, 50);

for (const chunk of chunks) {
  const embeddings = await embeddingService.generateBatchEmbeddings(
    chunk,
    "minilm",
    10 // Sub-batch size for parallel processing
  );

  // Store incrementally
  await storeEmbeddings(embeddings);
}
```

### 3. Caching Strategy

```typescript
// Check cache before generating
const cacheStats = embeddingService.getCacheStats();
console.log(`Cache hit rate: ${cacheStats.hitRate}%`);

// Clear cache when switching models
embeddingService.clearCache();
await embeddingService.initialize("gemma3n");
```

### 4. Error Handling

```typescript
try {
  const embedding = await embeddingService.generateEmbedding(text);
} catch (error) {
  if (error.message.includes("Model not initialized")) {
    await embeddingService.initialize("minilm");
    return embeddingService.generateEmbedding(text);
  }
  throw error;
}
```

---

## Next Steps

1. **Implement MCP Server**: Create FastAPI server with models library tools
2. **Build LSP Extension**: VS Code extension for embedding completions
3. **Deploy ChromaDB**: Set up HTTP server for session storage
4. **Create Ingestion Pipeline**: Automate code repository indexing
5. **Generate Agent Library**: Extract patterns into reusable skills
6. **Document API**: OpenAPI spec for MCP tools
7. **Add Monitoring**: Prometheus metrics for embedding operations
8. **Implement Caching**: Redis cache for frequently accessed embeddings

---

## Related Documentation

- [Models Library README](./README.md) - Core functionality
- [IMPLEMENTATION_SUMMARY](./IMPLEMENTATION_SUMMARY.md) - Technical details
- [QUICK_START](./QUICK_START.md) - Getting started guide
- [Schema Crawler README](../../../agent-generator/SCHEMA_CRAWLER_README.md) - Type generation
- [CODEBASE_INDEX](../../../CODEBASE_INDEX.md) - Complete codebase inventory

---

**Version**: 1.0.0  
**Last Updated**: January 7, 2026  
**Maintained by**: ModMe GenUI Team
