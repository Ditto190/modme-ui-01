# Monorepo Configuration Package

Shared configurations, development templates, and guidelines for the GenerativeUI monorepo.

## Contents

### `.vscode/`
VS Code settings for consistent development environment across the monorepo:
- `settings.json` — Shared editor preferences (font, formatting, extensions)

### `templates/`
Project templates for creating new applications and packages:
- `app-template/` — Template for new monorepo applications
- `package-template/` — Template for new shared packages
- `project-checklist.md` — Setup checklist for new projects

## How to Use

### Apply settings to a project
Copy `.vscode/settings.json` to any project's `.vscode/` folder:

```bash
cp -r .vscode/* ../your-project/.vscode/
```

### Create a new project from template
Use the templates as a starting point:

```bash
cp -r templates/app-template apps/my-new-app
```

## Shared Development Guidelines

See `GUIDELINES.md` for development conventions and best practices used across the monorepo.
