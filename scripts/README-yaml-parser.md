# YAML Parser (scripts/yaml-parser.mjs)

This script parses collection YAML files and frontmatter in markdown files, and can generate a normalized "collection set" JSON output suitable for agent collections.

Features:

- Parse pure YAML collection files (`.collection.yml`, `.yml`, `.yaml`).
- Parse frontmatter from markdown files using `vfile-matter`.
- Extract agent metadata and MCP server configs from frontmatter.
- Optionally validate generated collection sets against a JSON Schema (requires `ajv`).

Usage:

```bash
# Parse a single collection file
node ./scripts/yaml-parser.mjs parse path/to/my.collection.yml

# Parse a directory of collections and validate against a schema
node ./scripts/yaml-parser.mjs parse ./collections --schema ./scripts/schema/collection.schema.json

# Or use the npm scripts
npm run collection:validate
npm run collection:generate
```

Notes:

- This module is an ES module (`.mjs`). If your project uses CommonJS, import it dynamically or run it as a CLI.
- Install required libs in your workspace if needed:

```bash
npm install js-yaml vfile vfile-matter
# Optional for validation
npm install ajv
```

Integration:

- Hook this into build scripts to produce `collections.json` that can be consumed by the agent generator.
- If using TypeScript setup, add a thin wrapper in `src/tools` that imports the module and exposes typed interfaces.
