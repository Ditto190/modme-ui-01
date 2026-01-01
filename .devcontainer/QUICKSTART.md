# DevContainer Quick Start 🚀

## One-Click Setup Options

### 🌐 GitHub Codespaces (Cloud)
```
1. Click the "Code" button on GitHub
2. Select "Codespaces" tab
3. Click "Create codespace on main"
4. Wait ~3-5 minutes ☕
5. Run: npm run dev
```

### 🐳 VS Code + Docker (Local)
```
1. Open repository in VS Code
2. Click "Reopen in Container" popup
   (or: F1 → "Dev Containers: Reopen in Container")
3. Wait ~5-10 minutes ☕
4. Run: npm run dev
```

## What You Get

✅ **Node.js 22.9.0** with nvm  
✅ **Python 3.12** with uv  
✅ **13 VS Code extensions** pre-installed  
✅ **Auto-installed dependencies**  
✅ **Port forwarding** (3000, 8000)  

## First Time Setup

After container starts:

```bash
# 1. Configure your API key
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY

# 2. Start development
npm run dev

# 3. Access the app
# UI:    http://localhost:3000
# Agent: http://localhost:8000
```

## Common Commands

```bash
# Health check
./scripts/health-check.sh

# Rebuild container
# F1 → "Dev Containers: Rebuild Container"

# View logs
# Check terminal output or Docker Desktop logs
```

## Troubleshooting

### Container won't build?
- Check Docker Desktop is running
- Ensure >10GB disk space available
- Try: F1 → "Dev Containers: Rebuild Container"

### Ports not forwarding?
- Check nothing is using ports 3000 or 8000
- View ports panel in VS Code (Ctrl+Shift+P → "View: Ports")

### Dependencies missing?
```bash
# Reinstall Node.js dependencies
npm install

# Reinstall Python dependencies
cd agent && uv sync
```

## Need Help?

📖 Full docs: [.devcontainer/README.md](.devcontainer/README.md)  
🤝 Contributing: [../CONTRIBUTING.md](../CONTRIBUTING.md)  
📋 Summary: [../DEVCONTAINER_SETUP.md](../DEVCONTAINER_SETUP.md)

---

**Pro tip:** Use `workspace.code-workspace` for multi-root workspace!
