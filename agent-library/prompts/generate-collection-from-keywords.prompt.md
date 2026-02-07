---
agent: "agent"
description: "Dynamically generate custom agent collections based on keyword searches across agents, prompts, instructions, and skills"

tools: ["edit", "search", "runCommands", "runTasks", "changes", "fetch", "githubRepo"]
---

# Generate Custom Collection from Keywords

Dynamically create a new GitHub Copilot collection by searching for keywords across all available agents, prompts, instructions, and skills in the repository.

## Purpose

This prompt automates the process of creating curated collections by:

- Searching all agent/prompt/instruction files for matching keywords
- Ranking results by relevance
- Generating properly formatted collection.yml and .md files
- Creating ready-to-use collections that group related resources

## Process

### 1. Gather Keywords

**Ask the user for search keywords:**

- What topics, technologies, or workflows should this collection focus on?
- Examples: "testing automation", "react nextjs frontend", "azure cloud devops", "security vulnerability scanning"

### 2. Execute Collection Generation

**Run the generation script:**

```bash
python agent-library/scripts/generate_collection_from_keywords.py "<keywords>" \
    --max-items 15 \
    --output custom-collection-name
```

**Options:**

- `--max-items N` - Include top N most relevant items (default: 15)
- `--output NAME` - Custom collection ID (default: auto-generated from keywords)
- `--include-agents` - Include agent files (default: true)
- `--include-prompts` - Include prompt files (default: true)
- `--include-instructions` - Include instruction files (default: true)
- `--include-skills` - Include skill files (default: false)

**Example commands:**

```bash
# Testing collection
python agent-library/scripts/generate_collection_from_keywords.py \
    "testing automation tdd" --max-items 20 --output testing-suite

# React development collection
python agent-library/scripts/generate_collection_from_keywords.py \
    "react nextjs typescript frontend" --max-items 25

# DevOps & Infrastructure
python agent-library/scripts/generate_collection_from_keywords.py \
    "devops cicd docker kubernetes terraform" --output devops-toolkit

# Security focus
python agent-library/scripts/generate_collection_from_keywords.py \
    "security vulnerability owasp authentication" --include-skills
```

### 3. Review Generated Files

**The script generates three files:**

1. **`<collection-id>.collection.yml`** - YAML configuration

   ```yaml
   id: react-nextjs-typescript-frontend
   name: React Nextjs Typescript Frontend
   description: Collection focused on react, nextjs, typescript, frontend...
   tags: [react, nextjs, typescript, frontend, ...]
   items:
     - path: agents/expert-react-frontend-engineer.agent.md
       kind: agent
     - path: prompts/create-react-component.prompt.md
       kind: prompt
   display:
     ordering: manual
     show_badge: true
   ```

2. **`<collection-id>.md`** - Human-readable documentation
   - Collection overview
   - Grouped items (agents, prompts, instructions, skills)
   - Usage instructions
   - Metadata (keywords, generation time, match counts)

3. **`<collection-id>.metadata.json`** - Generation metadata
   ```json
   {
     "generated_at": "2026-02-07T...",
     "keywords": ["react", "nextjs"],
     "total_matches": 45,
     "selected_items": 15
   }
   ```

**Files saved to:** `agent-library/collections/`

### 4. Validate Generated Collection

**Check the generated files:**

```bash
# View YAML structure
cat agent-library/collections/<collection-id>.collection.yml

# View markdown documentation
cat agent-library/collections/<collection-id>.md

# View metadata
cat agent-library/collections/<collection-id>.metadata.json
```

**Validate:**

- ✅ All item paths exist
- ✅ Items are relevant to keywords
- ✅ Collection description is accurate
- ✅ Tags are appropriate

### 5. Customize if Needed

**Optional edits:**

1. **Refine item selection** - Edit `.collection.yml` to:
   - Remove low-relevance items
   - Reorder items for better flow
   - Change `ordering: manual` to `ordering: alpha` for alphabetical

2. **Improve description** - Edit both `.collection.yml` and `.md`:
   - Add more context
   - Explain use cases
   - Add prerequisites

3. **Adjust tags** - Update tags in `.collection.yml`:
   - Add domain-specific tags
   - Remove generic tags
   - Align with existing collection taxonomy

4. **Enhance markdown** - Edit `.md` file:
   - Add usage examples
   - Include workflow diagrams
   - Document common patterns

### 6. Integrate with Awesome-Copilot (Optional)

**If you want to contribute back:**

1. **Fork awesome-copilot repo**:

   ```bash
   gh repo fork github/awesome-copilot
   ```

2. **Add collection files**:

   ```bash
   cp agent-library/collections/<collection-id>.* \
      awesome-copilot/collections/
   ```

3. **Update README.collections.md**:
   - Add collection to the table
   - Include description and item count

4. **Submit PR**:
   ```bash
   cd awesome-copilot
   git add collections/<collection-id>.*
   git commit -m "Add <collection-name> collection"
   git push
   gh pr create --title "Add <collection-name> collection"
   ```

## Use Cases

### Use Case 1: Technology-Specific Collection

**Scenario:** Need all React-related resources

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "react hooks components jsx" --max-items 30 --output react-essentials
```

**Result:** Collection with React agents, prompts, and instructions

---

### Use Case 2: Workflow-Focused Collection

**Scenario:** Create collection for TDD workflow

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "test tdd unit integration coverage" --output tdd-workflow
```

**Result:** Collection with testing agents, test generation prompts, coverage instructions

---

### Use Case 3: Domain-Specific Collection

**Scenario:** Build security-focused collection

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "security authentication authorization owasp vulnerability" \
    --max-items 25 --include-skills --output security-toolkit
```

**Result:** Comprehensive security collection with agents, prompts, instructions, and skills

---

### Use Case 4: Project Onboarding Collection

**Scenario:** Create collection for new team members

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "documentation readme onboarding setup getting-started" \
    --output team-onboarding
```

**Result:** Collection focused on documentation and onboarding resources

---

### Use Case 5: Multi-Framework Collection

**Scenario:** Full-stack development collection

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "nextjs react typescript nodejs express api database" \
    --max-items 40 --output fullstack-development
```

**Result:** Large collection spanning frontend and backend resources

## Search Algorithm

**Relevance Scoring:**

1. **Keyword Matches in Content** (1 point each)
   - Count occurrences in entire file

2. **Title Matches** (10 points)
   - Keywords in frontmatter `title` field

3. **Description Matches** (5 points)
   - Keywords in frontmatter `description` field

4. **Tag Matches** (implicit)
   - Matched items contribute to collection tags

**Sorting:**

- Items sorted by relevance score (highest first)
- Top N items selected based on `--max-items`

## Output Structure

**Collection Files Location:**

```
agent-library/
└── collections/
    ├── <collection-id>.collection.yml  # YAML config
    ├── <collection-id>.md              # Documentation
    └── <collection-id>.metadata.json   # Generation metadata
```

**Item Path Format:**

```yaml
items:
  - path: agents/my-agent.agent.md
    kind: agent
  - path: prompts/my-prompt.prompt.md
    kind: prompt
  - path: instructions/my-instruction.instructions.md
    kind: instruction
  - path: skills/my-skill/SKILL.md
    kind: skill
```

## Tips for Best Results

1. **Use Specific Keywords**
   - ✅ "react hooks components testing"
   - ❌ "development"

2. **Combine Technology + Task**
   - ✅ "azure terraform infrastructure deployment"
   - ❌ "cloud"

3. **Adjust Max Items**
   - Small focused collections: 10-15 items
   - Comprehensive collections: 25-40 items
   - Domain libraries: 40-100 items

4. **Include Skills When Relevant**
   - Add `--include-skills` for hands-on automation
   - Skills include scripts, references, and assets

5. **Iterate and Refine**
   - Generate initial collection
   - Review results
   - Regenerate with refined keywords if needed

## Troubleshooting

**Problem:** Not enough matches

**Solution:**

```bash
# Use broader keywords
python agent-library/scripts/generate_collection_from_keywords.py \
    "test testing" --max-items 30

# Include skills
python agent-library/scripts/generate_collection_from_keywords.py \
    "test" --include-skills
```

---

**Problem:** Too many irrelevant matches

**Solution:**

```bash
# Use more specific keywords
python agent-library/scripts/generate_collection_from_keywords.py \
    "react unit test jest enzyme" --max-items 15

# Reduce max-items
python agent-library/scripts/generate_collection_from_keywords.py \
    "security" --max-items 10
```

---

**Problem:** Script not found

**Solution:**

```bash
# Check current directory
pwd

# Navigate to project root if needed
cd /path/to/modme-ui-01-test-worktree

# Run with explicit path
python agent-library/scripts/generate_collection_from_keywords.py ...
```

## Integration with GitHub Copilot

**Using the Generated Collection:**

1. **In VS Code Copilot Chat:**
   - Collections are automatically detected
   - Items appear in agent/prompt suggestions

2. **Manual Access:**
   - Agents: Select from Copilot agent list
   - Prompts: Use `/` command in chat
   - Instructions: Auto-apply based on file patterns

3. **MCP Server Integration:**
   - Collections work with awesome-copilot MCP server
   - Install via official MCP registry

## Next Steps

After generating a collection:

1. ✅ **Review and validate** generated files
2. ✅ **Test the collection** in GitHub Copilot
3. ✅ **Customize** as needed
4. ✅ **Share** with team or contribute to awesome-copilot
5. ✅ **Document** custom workflows or patterns
6. ✅ **Iterate** - Generate variations for different use cases

## Examples Gallery

**Example 1: Testing Suite**

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "testing tdd unit integration e2e jest pytest" \
    --max-items 30 --include-skills --output testing-suite-complete
```

**Example 2: Frontend Mastery**

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "react nextjs typescript tailwind component hooks" \
    --max-items 35 --output frontend-mastery
```

**Example 3: DevOps Automation**

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "cicd github-actions docker kubernetes terraform helm" \
    --max-items 40 --include-skills --output devops-automation
```

**Example 4: Security Hardening**

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "security owasp authentication authorization encryption" \
    --max-items 25 --output security-hardening
```

**Example 5: API Development**

```bash
python agent-library/scripts/generate_collection_from_keywords.py \
    "api rest graphql openapi swagger fastapi express" \
    --max-items 30 --output api-development
```

---

**🎯 Ready to generate your custom collection?**

Ask the user: "What keywords should I search for to create your collection?"
