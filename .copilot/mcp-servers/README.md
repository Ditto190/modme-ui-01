# MCP Server Configurations

Model Context Protocol (MCP) allows AI assistants to securely access external tools and data sources.

## Available Servers

### Filesystem Server
Provides controlled access to the local `data/` directory for reading and writing files.

### GitHub Server
Integrates with GitHub API for repository operations, issues, PRs, etc.

### Custom Agent Server
Your custom Python ADK agent running on localhost:8000.

## Configuration

Copy `example-config.json` and customize it for your needs. The configuration should be loaded by your AI development tool.

## Environment Variables

Make sure all referenced environment variables (like `GITHUB_TOKEN`, `GOOGLE_API_KEY`) are set in your `.env` file.

## Security

- Only grant access to necessary directories
- Use read-only access when possible
- Rotate tokens regularly
- Never commit tokens to version control

## Learn More

- [MCP Specification](https://modelcontextprotocol.io/)
- [Available MCP Servers](https://github.com/modelcontextprotocol/servers)
