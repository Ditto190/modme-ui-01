# Agent/AI Integration Directory

This directory contains configurations and resources for AI-assisted development and maintenance.

## Structure

### `/instructions`

Agent instructions and prompts for specific tasks. These guide AI assistants in understanding the project context and coding standards.

### `/mcp-servers`

Model Context Protocol (MCP) server configurations. MCP allows AI assistants to access external tools and data sources securely.

### `/knowledge`

Knowledge base references, documentation snippets, and architectural decision records (ADRs) that help AI understand the codebase better.

### `/templates`

Templates for common tasks like:

- Component creation
- API endpoint setup
- Test file structure
- Documentation patterns

## Usage

These resources are automatically loaded by compatible AI development tools to provide better context and assistance during development.

## Adding New Resources

1. **Instructions**: Create a `.md` file in `/instructions` with clear, structured guidance
2. **MCP Configs**: Add server configurations in `/mcp-servers` following the MCP specification
3. **Knowledge**: Document important patterns and decisions in `/knowledge`
4. **Templates**: Add reusable templates in `/templates` with clear placeholders

## Security Note

Do not store API keys, credentials, or sensitive data in this directory. Use environment variables instead.
