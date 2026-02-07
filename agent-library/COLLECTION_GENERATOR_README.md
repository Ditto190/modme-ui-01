# Dynamic Collection Generator

Generate custom GitHub Copilot collections based on keyword searches across agents, prompts, instructions, and skills.

## Overview

The Dynamic Collection Generator allows you to create curated collections of related resources by searching for keywords across the entire agent library. It automatically:

- Searches all agents, prompts, instructions, and skills
- Ranks results by relevance
- Generates properly formatted `.collection.yml` and `.md` files
- Extracts and consolidates tags
- Creates ready-to-use collections

## Quick Start

### Basic Usage

```bash
# Generate collection from keywords
python agent-library/scripts/generate_collection_from_keywords.py "testing automation tdd"

# Customize output name
python agent-library/scripts/generate_collection_from_keywords.py \
    "react nextjs frontend" --output react-frontend-collection

# Limit results
python agent-library/scripts/generate_collection_from_keywords.py \
    "azure cloud devops" --max-items 25
```

### Using the Prompt

Alternatively, use the Copilot prompt for interactive generation:

```
@workspace /generate-collection-from-keywords

What keywords should I search for to create your collection?
```

## Features

### 1. Intelligent Keyword Matching

- **Content Matching**: Searches entire file content (case-insensitive)
- **Title Matching**: Extra weight for keywords in titles (10x points)
- **Description Matching**: Bonus for keywords in descriptions (5x points)
- **Relevance Scoring**: Automatically ranks results by relevance

### 2. Multi-Type Support

Search across multiple resource types:

- ✅ **Agents** (`*.agent.md`) - Specialized AI agents
- ✅ **Prompts** (`*.prompt.md`) - Reusable prompts
- ✅ **Instructions** (`*.instructions.md`) - File-pattern-based rules
- ✅ **Skills** (`SKILL.md`) - Executable skills with scripts

### 3. Automatic Tag Extraction

- Extracts tags from matched items' frontmatter
- Includes search keywords as primary tags
- Deduplicates and limits to top 10 tags
- Ensures consistent tagging across collections

### 4. Comprehensive Output

For each collection, generates:

1. **`.collection.yml`** - Machine-readable configuration

   ```yaml
   id: testing-automation-tdd
   name: Testing Automation Tdd
   description: Collection focused on testing, automation, tdd...
   tags: [testing, automation, tdd, ...]
   items:
     - path: agents/test-automation-engineer.agent.md
       kind: agent
   display:
     ordering: manual
     show_badge: true
   ```

2. **`.md`** - Human-readable documentation
   - Collection overview
   - Grouped items by type
   - Usage instructions
   - Generation metadata

3. **`.metadata.json`** - Generation details
   ```json
   {
     "generated_at": "2026-02-07T10:30:00",
     "keywords": ["testing", "automation", "tdd"],
     "total_matches": 45,
     "selected_items": 15
   }
   ```

## Command-Line Options

### Required Arguments

- `keywords` - Space-separated keywords to search for

### Optional Arguments

| Option                   | Type   | Default | Description                                             |
| ------------------------ | ------ | ------- | ------------------------------------------------------- |
| `--max-items`            | int    | 15      | Maximum items to include in collection                  |
| `--output`               | string | auto    | Custom collection ID (default: generated from keywords) |
| `--include-agents`       | flag   | true    | Include agent files                                     |
| `--include-prompts`      | flag   | true    | Include prompt files                                    |
| `--include-instructions` | flag   | true    | Include instruction files                               |
| `--include-skills`       | flag   | false   | Include skill files                                     |
| `--agent-library-root`   | path   | auto    | Path to agent-library directory                         |

## Examples

### Example 1: Testing Suite

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "testing tdd unit integration e2e jest pytest" \
    --max-items 30 \
    --include-skills \
    --output testing-suite-complete
```

**Output:**

- `testing-suite-complete.collection.yml`
- `testing-suite-complete.md`
- `testing-suite-complete.metadata.json`

**Result:** Comprehensive testing collection with 30 items including agents, prompts, instructions, and skills

---

### Example 2: Frontend Development

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "react nextjs typescript tailwind component hooks" \
    --max-items 35 \
    --output frontend-mastery
```

**Result:** 35 frontend-focused resources covering React, Next.js, TypeScript, and Tailwind CSS

---

### Example 3: DevOps Automation

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "cicd github-actions docker kubernetes terraform helm" \
    --max-items 40 \
    --include-skills \
    --output devops-automation
```

**Result:** Large DevOps collection with automation scripts and infrastructure resources

---

### Example 4: Security Hardening

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "security owasp authentication authorization encryption" \
    --max-items 25 \
    --output security-hardening
```

**Result:** Security-focused collection with authentication, authorization, and encryption resources

---

### Example 5: API Development

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "api rest graphql openapi swagger fastapi express" \
    --max-items 30 \
    --output api-development
```

**Result:** API development collection covering REST, GraphQL, and API documentation

## How It Works

### Search Algorithm

1. **Content Parsing**
   - Reads all matching files in specified directories
   - Extracts YAML frontmatter
   - Indexes file content

2. **Keyword Matching**
   - Case-insensitive keyword search
   - Counts occurrences in content
   - Identifies matched keywords

3. **Relevance Scoring**

   ```
   Score = (content_matches × 1) + (title_matches × 10) + (description_matches × 5)
   ```

   - Content match: 1 point per occurrence
   - Title match: 10 points per keyword
   - Description match: 5 points per keyword

4. **Result Ranking**
   - Sort by relevance score (highest first)
   - Select top N items (based on `--max-items`)

5. **Collection Generation**
   - Generate collection ID from keywords
   - Extract and consolidate tags
   - Build YAML structure
   - Generate Markdown documentation
   - Save metadata

### File Structure

```
agent-library/
├── agents/                    # Agent files (*.agent.md)
├── prompts/                   # Prompt files (*.prompt.md)
├── instructions/              # Instruction files (*.instructions.md)
├── skills/                    # Skill directories (SKILL.md)
├── collections/               # Generated collections
│   ├── my-collection.collection.yml
│   ├── my-collection.md
│   └── my-collection.metadata.json
└── scripts/
    └── generate_collection_from_keywords.py
```

## Best Practices

### 1. Choosing Keywords

**✅ Good Keywords:**

- Specific technologies: `react`, `nextjs`, `typescript`
- Clear tasks: `testing`, `authentication`, `deployment`
- Combined concepts: `cicd docker`, `api rest graphql`

**❌ Avoid:**

- Generic terms: `development`, `code`
- Single very broad keywords: `programming`
- Misspellings (searches are exact)

### 2. Optimal Collection Sizes

| Collection Type       | Recommended Size |
| --------------------- | ---------------- |
| Focused/Specific      | 10-15 items      |
| General Topic         | 20-30 items      |
| Comprehensive Library | 40-100 items     |

**Rationale:**

- Too few items: Limited value
- Too many items: Overwhelming, reduces discoverability

### 3. Combining Keywords

**Strategy 1: Technology Stack**

```bash
"react typescript tailwind nextjs"
```

Result: Full-stack frontend collection

**Strategy 2: Workflow Focus**

```bash
"testing automation ci continuous-integration"
```

Result: QA/CI-focused collection

**Strategy 3: Domain-Specific**

```bash
"security authentication jwt oauth2 encryption"
```

Result: Security-focused collection

### 4. Iteration Process

1. **Generate initial collection** with broad keywords
2. **Review results** - Check relevance and coverage
3. **Refine keywords** - Add/remove based on results
4. **Regenerate** with improved keywords
5. **Manual edits** - Fine-tune YAML and Markdown
6. **Test** - Use in GitHub Copilot

## Output File Formats

### Collection YAML (`.collection.yml`)

```yaml
id: my-collection # Unique identifier (kebab-case)
name: My Collection # Display name
description: "..." # Brief description
tags: # Searchable tags
  - tag1
  - tag2
items: # Collection items
  - path: agents/agent1.agent.md
    kind: agent
  - path: prompts/prompt1.prompt.md
    kind: prompt
display: # Display settings
  ordering: manual # manual | alpha
  show_badge: true # Boolean
  featured: false # Boolean
```

### Collection Markdown (`.md`)

Structure:

```markdown
# My Collection

Collection description...

**Tags**: tag1, tag2, ...

## Collection Details

- **Generated**: 2026-02-07T...
- **Keywords**: keyword1, keyword2
- **Total Matches**: 45
- **Selected Items**: 15

## Items in this Collection

### Agents

- [agent1.agent.md](agents/agent1.agent.md)

### Prompts

- [prompt1.prompt.md](prompts/prompt1.prompt.md)

### Instructions

- [instruction1.instructions.md](instructions/instruction1.instructions.md)

### Skills

- [skill1](skills/skill1/SKILL.md)

## Usage

Usage instructions...
```

### Metadata JSON (`.metadata.json`)

```json
{
  "generated_at": "2026-02-07T10:30:00.123456",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "total_matches": 45,
  "selected_items": 15
}
```

## Troubleshooting

### Problem: Not enough matches

**Symptoms:**

- Few or no items found
- Empty collection generated

**Solutions:**

1. **Broaden keywords:**

   ```bash
   # Instead of: "react-testing-library"
   python ... "react testing"
   ```

2. **Include skills:**

   ```bash
   python ... "testing" --include-skills
   ```

3. **Increase max items:**
   ```bash
   python ... "testing" --max-items 30
   ```

---

### Problem: Too many irrelevant matches

**Symptoms:**

- Many unrelated items in results
- Low relevance scores

**Solutions:**

1. **Use more specific keywords:**

   ```bash
   # Instead of: "test"
   python ... "react unit test jest enzyme"
   ```

2. **Reduce max items:**

   ```bash
   python ... "security" --max-items 10
   ```

3. **Combine technology + task:**
   ```bash
   python ... "nextjs api routes validation"
   ```

---

### Problem: Script not found

**Symptoms:**

```
FileNotFoundError: [Errno 2] No such file or directory: 'agent-library/scripts/generate_collection_from_keywords.py'
```

**Solutions:**

1. **Check current directory:**

   ```bash
   pwd
   # Should be in modme-ui-01-test-worktree or modme-ui-01
   ```

2. **Navigate to project root:**

   ```bash
   cd /path/to/modme-ui-01-test-worktree
   ```

3. **Use explicit path:**
   ```bash
   python d:/Github_Projects/Modme_2026/modme-ui-01-test-worktree/agent-library/scripts/generate_collection_from_keywords.py ...
   ```

---

### Problem: Agent library not detected

**Symptoms:**

```
❌ Error: Could not find agent-library directory
```

**Solutions:**

1. **Specify agent-library root:**

   ```bash
   python ... --agent-library-root /path/to/agent-library
   ```

2. **Run from correct directory:**
   ```bash
   cd modme-ui-01-test-worktree
   python agent-library/scripts/generate_collection_from_keywords.py ...
   ```

---

### Problem: Permission errors

**Symptoms:**

```
PermissionError: [Errno 13] Permission denied: 'collections/...'
```

**Solutions:**

1. **Check file permissions:**

   ```bash
   ls -la agent-library/collections/
   ```

2. **Run with appropriate permissions:**

   ```bash
   # Unix/Linux/Mac
   chmod +x agent-library/scripts/generate_collection_from_keywords.py

   # Windows
   # Run PowerShell as Administrator
   ```

## Integration with GitHub Copilot

### Using Generated Collections

1. **Place in `.github/copilot/collections/`:**

   ```bash
   cp agent-library/collections/my-collection.* \
      .github/copilot/collections/
   ```

2. **Reference in workspace:**
   - Copilot automatically detects collections
   - Agents appear in agent picker
   - Prompts available via `/` commands

3. **MCP Server Integration:**
   - Collections work with awesome-copilot MCP server
   - Install via `gh copilot extension install awesome-copilot`

### Sharing Collections

**Option 1: Team Repository**

```bash
# Commit to team repo
git add agent-library/collections/my-collection.*
git commit -m "Add my-collection for team"
git push
```

**Option 2: Contribute to Awesome-Copilot**

```bash
# Fork and PR to github/awesome-copilot
gh repo fork github/awesome-copilot
cp agent-library/collections/my-collection.* awesome-copilot/collections/
cd awesome-copilot
git add collections/my-collection.*
git commit -m "Add my-collection"
gh pr create
```

## Advanced Usage

### Custom Search Patterns

The script searches for exact keyword matches. For more complex patterns:

1. **Use grep preprocessing:**

   ```bash
   # Find files matching regex pattern
   grep -r "pattern" agent-library/agents/ | \
       cut -d: -f1 | \
       xargs -I {} echo "{}"
   ```

2. **Combine with collection generator:**
   ```bash
   # Generate from specific files
   python agent-library/scripts/generate_collection_from_keywords.py \
       "keyword" --max-items 50
   ```

### Batch Generation

Generate multiple collections:

```bash
#!/bin/bash

declare -a collections=(
    "react nextjs:frontend"
    "testing tdd:testing"
    "security owasp:security"
    "devops cicd:devops"
)

for collection in "${collections[@]}"; do
    IFS=':' read -r keywords output <<< "$collection"
    python agent-library/scripts/generate_collection_from_keywords.py \
        "$keywords" --output "$output"
done
```

### Post-Processing

Automatically enhance generated collections:

```python
import yaml
from pathlib import Path

# Load generated collection
with open('collections/my-collection.collection.yml') as f:
    collection = yaml.safe_load(f)

# Add custom metadata
collection['maintainers'] = ['@username']
collection['version'] = '1.0.0'

# Save updated collection
with open('collections/my-collection.collection.yml', 'w') as f:
    yaml.dump(collection, f)
```

## Related Resources

- **[AGENT_SKILL_BUILDER_GUIDE.md](AGENT_SKILL_BUILDER_GUIDE.md)** - Building agents and skills
- **[TOOLSET_MANAGEMENT.md](../docs/TOOLSET_MANAGEMENT.md)** - Managing toolsets
- **[suggest-awesome-github-copilot-collections.prompt.md](prompts/suggest-awesome-github-copilot-collections.prompt.md)** - Suggesting existing collections
- **[awesome-copilot](https://github.com/github/awesome-copilot)** - Official collection repository

## Contributing

Improvements to the collection generator:

1. **Fork the repository**
2. **Make changes** to `generate_collection_from_keywords.py`
3. **Test** with various keyword combinations
4. **Submit PR** with examples

## License

Part of ModMe GenUI Workbench - MIT License

---

**Questions? Issues?**

- File an issue in the repository
- Check existing documentation
- Ask in team channel
