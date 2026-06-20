What works in practice: Lessons from 2,500+ repos
My analysis of over 2,500 agents.md files revealed a clear divide between the ones that fail and the ones that work. The successful agents aren’t just vague helpers; they are specialists. Here’s what the best-performing files do differently:

Put commands early: Put relevant executable commands in an early section: npm test, npm run build, pytest -v. Include flags and options, not just tool names. Your agent will reference these often.
Code examples over explanations: One real code snippet showing your style beats three paragraphs describing it. Show what good output looks like.
Set clear boundaries: Tell AI what it should never touch (e.g., secrets, vendor directories, production configs, or specific folders). “Never commit secrets” was the most common helpful constraint.
Be specific about your stack: Say “React 18 with TypeScript, Vite, and Tailwind CSS” not “React project.” Include versions and key dependencies.
Cover six core areas: Hitting these areas puts you in the top tier: commands, testing, project structure, code style, git workflow, and boundaries.
Example of a great agent.md file
Below is an example for adding a documentation agent.md persona in your repo to .github/agents/docs-agent.md:

---

name: docs_agent
description: Expert technical writer for this project

---

You are an expert technical writer for this project.

## Your role

- You are fluent in Markdown and can read TypeScript code
- You   for a developer audience, focusing on clarity and practical examples
- Your task: read code from `src/` and generate or update documentation in `docs/`

## Project knowledge

- **Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS
- **File Structure:**
  - `src/` – Application source code (you READ from here)
  - `docs/` – All documentation (you WRITE to here)
  - `tests/` – Unit, Integration, and Playwright tests

## Commands you can use

Build docs: `npm run docs:build` (checks for broken links)
Lint markdown: `npx markdownlint docs/` (validates your work)

## Documentation practices

Be concise, specific, and value dense
Write so that a new developer to this codebase can understand your writing, don’t assume your audience are experts in the topic/area you are writing about.

## Boundaries

- ✅ **Always do:** Write new files to `docs/`, follow the style examples, run markdownlint
- ⚠️ **Ask first:** Before modifying existing documents in a major way
- 🚫 **Never do:** Modify code in `src/`, edit config files, commit secrets

Why this agent.md file works well

States a clear role: Defines who the agent is (expert technical writer), what skills it has (Markdown, TypeScript), and what it does (read code, write docs).
Executable commands: Gives AI tools it can run (npm run docs:build and npx markdownlint docs/). Commands come first.
Project knowledge: Specifies tech stack with versions (React 18, TypeScript, Vite, Tailwind CSS) and exact file locations.
Real examples: Shows what good output looks like with actual code. No abstract descriptions.
Three-tier boundaries: Set clear rules using always do, ask first, never do. Prevents destructive mistakes.
How to build your first agent
Pick one simple task. Don’t build a “general helper.” Pick something specific like:

Writing function documentation
Adding unit tests
Fixing linting errors
Start minimal—you only need three things:

Agent name: test-agent, docs-agent, lint-agent
Description: “Writes unit tests for TypeScript functions”
Persona: “You are a quality software engineer who writes comprehensive tests”
Copilot can also help generate one for you. Using your preferred IDE, open a new file at .github/agents/test-agent.md and use this prompt:

Create a test agent for this repository. It should:

- Have the persona of a QA software engineer.
- Write tests for this codebase
- Run tests and analyzes results
- Write to “/tests/” directory only
- Never modify source code or remove failing tests
- Include specific examples of good test structure
  Copilot will generate a complete agent.md file with persona, commands, and boundaries based on your codebase. Review it, add in YAML frontmatter, adjust the commands for your project, and you’re ready to use @test-agent.
