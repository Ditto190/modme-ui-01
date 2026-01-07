# Models Library Quick Start

## 🚀 Installation Status

✅ **COMPLETE** - All components installed and verified

## 📦 What's Included

- **UnifiedEmbeddingService** - Multi-model embedding support (MiniLM + Gemma3n)
- **TypeScript Types** - Generated Zod schemas for Gemma3n configuration
- **Test Suite** - Comprehensive model testing (`test-models.js`)
- **Enhanced Agent** - Embedding agent with adaptive retrieval
- **Documentation** - 400+ lines of integration guides

## 🏃 Quick Commands

### Verify Installation
```bash
cd experiments/micro-agents/models
bash verify-install.sh
```

### Run Tests (if Node.js modules are set up)
```bash
node test-models.js
```

### Use Embedding Agent
```bash
cd experiments/micro-agents
npx tsx base/embedding-agent.ts
```

### Generate Code Index
```bash
cd experiments/micro-agents
npm run journal-code-index
```

## 📊 Available Models

| Model | Dimension | Speed | Memory | Use Case |
|-------|-----------|-------|--------|----------|
| **MiniLM** | 384 | Fast (~50ms) | ~80MB | Quick lookups, general search |
| **Gemma3n** | 1024 | Medium (~150ms) | ~500MB | Complex queries, deep semantics |

## 🔧 Basic Usage

### Generate Embedding
```typescript
import { embeddingService } from './models/embeddings';

await embeddingService.initialize('minilm');
const embedding = await embeddingService.generateEmbedding(
  'How do I implement async functions?'
);
```

### Adaptive Retrieval
```typescript
import { adaptiveRetrieval } from './models/embeddings';

const results = await adaptiveRetrieval(
  'Explain REST vs GraphQL',
  { previousQueries: ['What is REST?'] }
);
```

### Batch Processing
```typescript
const embeddings = await embeddingService.generateBatchEmbeddings(
  ['Query 1', 'Query 2', 'Query 3'],
  'minilm',
  32 // batch size
);
```

## 📚 Documentation

- **[README.md](./README.md)** - Complete guide (400+ lines)
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Detailed summary
- **[types/gemma3n-config.ts](./types/gemma3n-config.ts)** - TypeScript types

## 🎯 Next Steps

1. **Test Installation**: `bash verify-install.sh`
2. **Read Docs**: `cat README.md | less`
3. **Try Agent**: `npx tsx ../base/embedding-agent.ts`
4. **Index Code**: `npm run journal-code-index`

## 🐛 Troubleshooting

### Models not loading?
- Check internet connection (downloads from HuggingFace Hub)
- Verify: `npm list @huggingface/transformers`

### Dimension mismatch?
- Ensure same model used for indexing and search
- Check embedding metadata: `loadEmbedding('path/to/file')`

### Slow inference?
- Use MiniLM for fast queries
- Enable caching for frequent queries
- Use batch processing

## 💡 Tips

- Use **adaptive retrieval** for variable query complexity
- **Cache** frequently used embeddings
- **Batch process** when generating multiple embeddings
- Use **MiniLM** for speed, **Gemma3n** for accuracy

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: January 7, 2026
