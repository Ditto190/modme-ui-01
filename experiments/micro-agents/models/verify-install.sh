#!/bin/bash
# Quick installation verification

echo "🔍 Verifying Models Library Installation..."
echo ""

# Check directory structure
echo "📂 Directory Structure:"
ls -lah . | grep -E "(README|package|embeddings|test-models)"
echo ""

# Check types
echo "📝 Type Definitions:"
ls -lah types/ 2>/dev/null || echo "  ⚠️  No types directory"
echo ""

# Check transformers-js
echo "📦 Transformers.js:"
if [ -d "transformers-js/node_modules/@huggingface/transformers" ]; then
  echo "  ✅ @huggingface/transformers installed"
  du -sh transformers-js/node_modules/@huggingface/transformers 2>/dev/null
else
  echo "  ❌ @huggingface/transformers NOT found"
fi
echo ""

# Check examples
echo "📚 Examples:"
if [ -d "examples/adaptive-retrieval" ]; then
  echo "  ✅ adaptive-retrieval example present"
  ls examples/adaptive-retrieval/ | head -5
else
  echo "  ❌ adaptive-retrieval NOT found"
fi
echo ""

# Check gemma3n source
echo "🤖 Gemma3n Source Files:"
find transformers-js/node_modules/@huggingface/transformers/src/models/gemma3n -type f 2>/dev/null | wc -l | xargs echo "  Files found:"
echo ""

echo "✅ Installation verification complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Run full tests: node test-models.js"
echo "  2. Test embedding agent: npx tsx ../base/embedding-agent.ts"
echo "  3. Read documentation: cat README.md"
