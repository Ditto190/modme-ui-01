#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const INBOX_DIR = path.join(__dirname, '../../docs/inbox');
const LIBRARY_PATH = path.join(__dirname, '../../docs/knowledge-library.json');

// AI-powered categorization keywords
const CATEGORIES = {
  'build-tools': ['build', 'esbuild', 'webpack', 'vite', 'compile', 'bundle', 'typescript'],
  'infrastructure': ['docker', 'devcontainer', 'container', 'setup', 'environment', 'deployment'],
  'integrations': ['api', 'sdk', 'integration', 'genai', 'toolbox', 'mcp', 'external'],
  'architecture': ['implementation', 'summary', 'architecture', 'design', 'pattern', 'refactoring'],
  'archive': ['session', 'test', 'temp', 'temporary', 'deprecated', 'old', 'legacy']
};

async function categorizeDocument(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();
  
  const scores = {};
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    scores[category] = 0;
    for (const keyword of keywords) {
      if (fileName.includes(keyword)) scores[category] += 3;
      if (content.includes(keyword)) scores[category] += 1;
    }
  }
  
  const bestCategory = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return bestCategory[1] > 0 ? bestCategory[0] : 'archive';
}

async function processInbox() {
  if (!fs.existsSync(INBOX_DIR)) {
    console.log('📥 Inbox directory not found');
    return;
  }

  const files = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.md'));
  
  if (files.length === 0) {
    console.log('📭 Inbox is empty');
    return;
  }

  console.log(📥 Processing  files from inbox...);

  const library = JSON.parse(fs.readFileSync(LIBRARY_PATH, 'utf8'));
  const newTopics = [];

  for (const file of files) {
    const filePath = path.join(INBOX_DIR, file);
    const category = await categorizeDocument(filePath);
    const topicId = path.basename(file, '.md').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    console.log(  📄  →  (id: ));

    if (!library.topics.find(t => t.id === topicId)) {
      newTopics.push({
        id: topicId,
        name: path.basename(file, '.md').replace(/-/g, ' '),
        category,
        status: 'pending',
        summary: 'Imported from inbox - needs review',
        keywords: [],
        source_files: [file],
        consolidated_path: docs//.md,
        key_concepts: {},
        commands: {},
        related_topics: [],
        metadata: {
          archived_date: new Date().toISOString().split('T')[0],
          imported_from: 'inbox'
        }
      });
    }
  }

  if (newTopics.length > 0) {
    library.topics.push(...newTopics);
    library.last_updated = new Date().toISOString();
    
    for (const topic of newTopics) {
      if (!library.index.by_category[topic.category]) {
        library.index.by_category[topic.category] = [];
      }
      library.index.by_category[topic.category].push(topic.id);
    }

    fs.writeFileSync(LIBRARY_PATH, JSON.stringify(library, null, 2));
    console.log(\n✅ Added  new topics to knowledge library);
    console.log('\n📦 Next steps:');
    console.log('  1. Review new topics in docs/knowledge-library.json');
    console.log('  2. Update summaries and keywords');
    console.log('  3. Run: npm run compress:knowledge');
  }
}

processInbox().catch(console.error);
