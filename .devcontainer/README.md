# DevContainer Setup

This directory contains the DevContainer configuration for the ModMe GenUI Workspace.

## What is a DevContainer?

A DevContainer (Development Container) is a fully-featured development environment running in a Docker container. It provides:

- **Consistency**: Same environment for all developers
- **Portability**: Works on any machine with Docker
- **Speed**: Pre-configured tools and dependencies
- **Isolation**: Doesn't affect your host system

## Quick Start

### GitHub Codespaces

1. Click **Code** → **Codespaces** → **Create codespace**
2. Wait for container to build (~3-5 minutes first time)
3. Start coding immediately with `npm run dev`

### VS Code + Docker Desktop

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Install VS Code extension: [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open this repository in VS Code
4. Click **Reopen in Container** when prompted
5. Wait for setup to complete (~5-10 minutes first time)

## Configuration Files

### `devcontainer.json`

Main configuration file that defines:

- Base Docker image and features
- VS Code extensions to install
- Port forwarding (3000 for UI, 8000 for Agent)
- Post-create commands
- Environment variables

### `Dockerfile`

Custom Docker image with:

- Node.js 22.9.0 (via nvm)
- Python 3.12
- uv package manager for Python
- All system dependencies

### `post-create.sh`

Automated setup script that runs after container creation:

- Installs Node.js dependencies
- Sets up Python virtual environment
- Installs agent dependencies
- Creates `.env` from `.env.example`
- Creates data directory

## Included Tools

### Development

- Node.js 22.9.0+ with nvm
- Python 3.12+ with uv
- npm, pip
- Git, GitHub CLI

### VS Code Extensions

- Python (ms-python.python)
- Pylance (ms-python.vscode-pylance)
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)
- GitHub Copilot (GitHub.copilot)
- Docker (ms-azuretools.vscode-docker)
- And more...

## Ports

The following ports are automatically forwarded:

| Port | Service | Description        |
| ---- | ------- | ------------------ |
| 3000 | UI      | Next.js frontend   |
| 8000 | Agent   | Python ADK backend |

## Environment Variables

Environment variables are set in the container:

- `NODE_ENV=development`
- `PYTHONPATH=${workspaceFolder}/agent`
- `WORKSPACE_TYPE=genui-devcontainer`

Additional variables can be set in `.env` file (created from `.env.example`).

## Customization

### Adding VS Code Extensions

Edit `devcontainer.json` and add to the `customizations.vscode.extensions` array:

```json
"customizations": {
  "vscode": {
    "extensions": [
      "your-extension-id"
    ]
  }
}
```

### Adding System Packages

Edit `Dockerfile` and add to the `apt-get install` command:

```dockerfile
RUN apt-get update && apt-get install -y \
    your-package \
    && rm -rf /var/lib/apt/lists/*
```

### Adding Node.js Global Packages

Edit `Dockerfile` after nvm installation:

```dockerfile
RUN bash -c "source ${NVM_DIR}/nvm.sh && npm install -g your-package"
```

## Troubleshooting

### Container Fails to Build

1. Check Docker Desktop is running
2. Ensure you have enough disk space (>10GB free)
3. Try rebuilding: Command Palette → `Dev Containers: Rebuild Container`

### Ports Not Forwarding

1. Check nothing is using ports 3000 or 8000 on your host
2. Manually forward ports in VS Code Ports panel

### Python Virtual Environment Issues

1. Delete `agent/.venv` directory
2. Rebuild container
3. Or manually run: `cd agent && uv sync`

### Node Modules Issues

1. Delete `node_modules` directory
2. Rebuild container
3. Or manually run: `npm install`

## Performance Tips

### Speed Up Builds

- DevContainer images are cached after first build
- Subsequent builds are much faster (~1-2 minutes)
- Use `Dev Containers: Rebuild Container` only when needed

### Reduce Disk Usage

- Remove unused containers: `docker system prune`
- Remove unused volumes: `docker volume prune`

## Security

- DevContainers run as `vscode` user (non-root)
- Local `data/` directory is mounted with proper permissions
- API keys and secrets should be in `.env` (git-ignored)
- Never commit secrets to version control

## Learn More

- [VS Code DevContainers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [DevContainer Specification](https://containers.dev/)
- [GitHub Codespaces](https://docs.github.com/en/codespaces)
