# Documentation Inbox

Drop .md files here for automatic categorization and compression.

## How It Works

1. **Drop files** - Place any markdown files in this folder
2. **Categorize** - Run 
pm run inbox:categorize to auto-categorize
3. **Review** - Check docs/knowledge-library.json for new topics
4. **Compress** - Run 
pm run compress:knowledge to generate consolidated docs

## Auto-Categorization

Files are categorized based on keywords in filename and content:

- **build-tools**: build, esbuild, webpack, compile, bundle  
- **infrastructure**: docker, devcontainer, setup, deployment
- **integrations**: api, sdk, integration, genai, mcp
- **architecture**: implementation, summary, design, pattern
- **archive**: session, test, temp, temporary, deprecated

## Workflow

\\\ash
# Full pipeline (one command)
npm run inbox:process

# Or step-by-step
npm run inbox:categorize   # Add to knowledge-library.json
npm run compress:knowledge # Generate consolidated docs
\\\

## Example

Drop SETUP_MYFEATURE.md here → Auto-categorized to infrastructure → Compressed to docs/infrastructure/setup-myfeature.md

---

*Part of the Knowledge Base Compression system*
