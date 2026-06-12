# Development Guidelines & Conventions

Guidelines for development within the GenerativeUI monorepo.

## General Principles

1. **Code Quality**
   - Maintain high-quality visual aesthetics in frontend applications
   - Use premium design concepts (glassmorphism, clean layouts, vibrant gradients)
   - Keep code modular and well-organized
   - Ensure clear separation between frontend and backend layers

2. **Project Structure**
   - Follow monorepo structure: `apps/` for applications, `packages/` for shared libraries
   - Each project includes `README.md`, `.vscode/settings.json`, and documentation
   - Use consistent naming conventions across packages

3. **Design System**
   - Use CSS custom properties (tokens) for theming
   - Follow the design system defined in shared theme files
   - Implement consistent spacing, typography, and color palette
   - Ensure 60fps animations and smooth transitions

## Tech Stack

### Frontend
- **React/Next.js** for web applications
- **Vanilla HTML/CSS/JS** for lightweight projects and components
- **Vite** for modern build tooling
- **TypeScript** for type safety (where applicable)
- **CSS Tokens** for design consistency

### Backend
- **Python** for agent services and API servers
- **Node.js** for JavaScript-based backend services

### Shared Tools
- **Turbo** for monorepo task orchestration
- **ESLint/Biome** for code linting
- **Jest/Vitest** for testing

## Project Conventions

### File Naming
- Components: `PascalCase` (e.g., `ComponentName.tsx`)
- Utilities: `camelCase` (e.g., `utilityName.ts`)
- Config files: `lowercase-with-hyphens` (e.g., `vite.config.js`)
- CSS files: `lowercase-with-hyphens` (e.g., `style.css`, `theme.css`)

### Git Workflow
- Create feature branches from `main`
- Use descriptive commit messages
- Keep commits focused and atomic
- Require review before merging

### Documentation
- Every project must have a `README.md`
- Include setup instructions and development guidelines
- Document APIs and public interfaces
- Keep docs up-to-date with code changes

## Performance Guidelines

1. **Frontend**
   - Optimize bundle size and lazy load components
   - Use semantic HTML and accessible markup
   - Ensure animations run at 60fps
   - Minimize main thread blocking

2. **Backend**
   - Profile and optimize hot paths
   - Use caching strategically
   - Implement proper error handling
   - Log important events for debugging

## Testing

- Write tests for critical functionality
- Aim for high coverage on business logic
- Use fixtures and mocks appropriately
- Test both happy paths and edge cases

## VS Code Settings

Use shared settings from `packages/monorepo-config/.vscode/settings.json`:
- Font size: 15pt for readability
- Tab size: 2 spaces
- Auto-save enabled (1s delay)
- Word wrap enabled
- Trim trailing whitespace
- Insert final newline

## Learning & Development

See [DEV_SANDBOX.md](../../docs/DEV_SANDBOX.md) for:
- Getting started guides
- Learning resources
- Sandbox environments for experimentation
- Example projects and templates
