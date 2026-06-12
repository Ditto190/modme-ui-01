# Development Sandbox Guide

A comprehensive guide to the development and learning resources in this monorepo.

## Overview

This monorepo includes structured environments for:
- **Learning & Experimentation**: Safe spaces to try ideas and learn
- **Real Projects**: Production applications and shared libraries
- **Examples**: Reference implementations and best practices

## Sandbox Environments

### Learning Projects
Safe environments for testing ideas, learning new technologies, and experimenting:
- Located in project examples and sample applications
- Can be freely modified without affecting production code
- Good for prototyping and exploring new patterns

### Example Applications

#### 1. Vibe Web App (`apps/vibe-web-app/`)
Interactive design playground showcasing:
- **Color & Gradient Sandbox**: Generate beautiful gradients using HSL color theory
- **Micro-Interactions**: Bounce, glow, and 3D tilt effects
- **Premium Design System**: Glassmorphism, custom tokens, smooth animations
- **Live Logger**: Real-time event tracking console

**Tech Stack**: Vanilla JS, HTML/CSS, Vite, Custom CSS Tokens
**Getting Started**:
```bash
cd apps/vibe-web-app
npm install
npm run dev
```

#### 2. Example React Application (`packages/example-react-application/`)
Full-featured React app demonstrating:
- Component architecture
- State management
- Testing setup (Jest, Cypress)
- Build optimization

#### 3. Example Next.js Application (`packages/example-next-application/`)
Server-side rendering example showing:
- Next.js routing and layouts
- API routes
- Static generation and ISR
- TypeScript integration

#### 4. Example React Module (`packages/example-react-module/`)
Reusable component library demonstrating:
- Component composition
- Module exports
- Build configuration (Rollup)
- Documentation

### Shared Resources

#### Design System
- Location: `packages/shared-schemas/`
- Color palette, typography, spacing, animations
- CSS custom properties (tokens) for consistency
- Usage examples and guidelines

#### Documentation
- `docs/GETTING_STARTED.md` — Quick start guide
- `docs/REACT_APPLICATION.md` — React best practices
- `docs/REACT_MODULE.md` — Creating reusable modules
- `docs/CONTRIBUTING.md` — Contributing guidelines
- `docs/DEBUGGING.md` — Debugging techniques

## How to Use the Sandbox

### For Learning
1. Open an example application
2. Study the code structure and patterns
3. Modify components and see live changes
4. Experiment with new ideas
5. Refer to documentation when stuck

### For Prototyping
1. Copy an example as a template
2. Create new project in `apps/` or `packages/`
3. Modify as needed for your use case
4. Test thoroughly before integrating
5. Move to production when ready

### For Testing Ideas
1. Use sandbox projects for experimentation
2. Try different approaches
3. Document what works well
4. Share learnings with team
5. Integrate successful patterns

## Project Structure

```
GenerativeUI_monorepo/
├── apps/                          # Applications
│   ├── agent-generator/           # Code generation tool
│   ├── agent-server/              # Agent API server
│   ├── web-dashboard/             # Dashboard UI
│   └── vibe-web-app/              # Design playground [NEW]
│
├── packages/                      # Shared libraries
│   ├── example-react-application/ # React app example
│   ├── example-next-application/  # Next.js app example
│   ├── example-react-module/      # Reusable components
│   ├── shared-schemas/            # Shared types & data
│   └── monorepo-config/           # Configuration & guidelines [NEW]
│
├── docs/                          # Documentation
│   ├── GETTING_STARTED.md
│   ├── REACT_APPLICATION.md
│   ├── REACT_MODULE.md
│   ├── CONTRIBUTING.md
│   ├── DEBUGGING.md
│   └── DEV_SANDBOX.md             # This file
│
└── scripts/                       # Utility scripts
```

## Common Tasks

### Running a Development Server
```bash
# Navigate to project
cd apps/vibe-web-app

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

### Building for Production
```bash
cd apps/your-app
npm run build
```

### Running Tests
```bash
cd packages/example-react-application
npm test

# With coverage
npm run test:coverage
```

### Using Turbo for Monorepo Tasks
```bash
# Run dev across all projects
turbo run dev

# Build all projects
turbo run build

# Run specific task
turbo run test --filter=@monorepo/shared-schemas
```

## Development Workflow

### Creating a New Project
1. Copy a template from `packages/monorepo-config/templates/`
2. Update `package.json` with new name and description
3. Modify `.vscode/settings.json` for project-specific preferences
4. Add to turbo.json if orchestration needed
5. Document setup in README.md

### Working with Multiple Projects
- VS Code Workspaces: Open root folder to access all projects
- Terminal: Navigate between projects as needed
- Turbo: Orchestrate tasks across workspace
- Shared dependencies: Use npm workspaces or npm hoisting

### Debugging

**Frontend Debugging**:
- Use browser DevTools (F12)
- Check console for errors
- Use Network tab to debug API calls
- Use React DevTools extension

**Node/Backend Debugging**:
- Use `node --inspect`
- Connect VS Code debugger
- Set breakpoints and step through code
- Check logs for errors

See `docs/DEBUGGING.md` for detailed debugging guide.

## Tips & Best Practices

1. **VS Code Setup**
   - Apply shared settings from `packages/monorepo-config/.vscode/`
   - Install recommended extensions per project
   - Use Multi-root workspace for monorepo navigation

2. **Code Organization**
   - Keep components focused and single-purpose
   - Extract shared logic to utilities
   - Use consistent naming and structure
   - Document complex functions

3. **Performance**
   - Profile before optimizing
   - Watch bundle size
   - Lazy load routes and components
   - Use dev tools to identify bottlenecks

4. **Collaboration**
   - Use branches for feature development
   - Request code reviews
   - Document decisions and tradeoffs
   - Keep README files current

## Getting Help

- Check relevant documentation in `docs/`
- Review example projects for patterns
- Look at existing code for inspiration
- Consult debugging guide for issues
- Ask team members for guidance

## Next Steps

1. Choose an example project to explore
2. Run the development server
3. Experiment with the code
4. Refer to the design system
5. Create your own project when ready
