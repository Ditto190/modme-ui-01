# Project Guidelines & Conventions

This document outlines the architectural and development guidelines for projects in the GenerativeUI monorepo.

## Design Philosophy

**Vibe-First Development**: Projects prioritize:
- High-quality visual aesthetics and premium design concepts
- Smooth, interactive user experiences
- Clean, maintainable code architecture
- Modular separation of concerns

## Visual Design Standards

### Premium Aesthetics
- **Glassmorphism**: Use frosted glass effects with backdrop blur
- **Gradients**: Vibrant, harmonized color combinations (HSL-based)
- **Clean Layouts**: Generous whitespace and clear information hierarchy
- **Smooth Animations**: 60fps transitions and micro-interactions
- **Consistent Theming**: CSS tokens for colors, spacing, typography

### Color System
Colors are defined using HSL (Hue, Saturation, Lightness):
- **High Vibrance**: Saturation 80-95% for primary colors
- **Comfortable Lighting**: Lightness 50-60% to balance vibrancy
- **Harmonic Pairing**: Colors spaced 60-120° apart on hue wheel
- **Dark Themes**: Base color #0a0b10 with surface layers

### Typography
- **Font Family**: Outfit (or similar premium, modern sans-serif)
- **Font Weights**: Use 300, 400, 500, 600, 700 for hierarchy
- **Size Scale**: 15px base, consistent scaling for readability
- **Line Height**: 1.6 for body text, tighter for headings

## Architecture

### Frontend Structure
```
project/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page-level components
│   ├── utils/            # Helper functions
│   ├── styles/           # Global styles, tokens
│   ├── types/            # TypeScript types (if applicable)
│   └── main.[jsx|tsx]    # Entry point
├── public/               # Static assets
├── tests/                # Test files
└── docs/                 # Project documentation
```

### Backend Structure
```
project/
├── src/
│   ├── routes/           # API endpoints
│   ├── models/           # Data models
│   ├── services/         # Business logic
│   ├── middleware/       # Request handlers
│   └── utils/            # Helper functions
├── tests/                # Test files
└── docs/                 # API documentation
```

### CSS Architecture

#### Token-Based Design
Define all design values as CSS custom properties:
```css
:root {
  /* Colors */
  --color-primary: #8b5cf6;
  --color-secondary: #ec4899;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  
  /* Typography */
  --font-family: 'Outfit', sans-serif;
  --font-size-base: 1rem;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
}
```

#### Component Styles
Organize styles by component:
- Use BEM naming: `.card`, `.card__title`, `.card--active`
- Keep specificity low
- Leverage CSS tokens for consistency
- Use CSS Grid and Flexbox for layout

## Code Quality

### JavaScript/TypeScript
- Use descriptive variable names
- Keep functions focused and pure when possible
- Add JSDoc comments for complex functions
- Use TypeScript for type safety

### React Components
- Prefer functional components with hooks
- Keep components focused (single responsibility)
- Extract custom hooks for reusable logic
- Memoize expensive computations

### Testing
- Write tests for critical functionality
- Test behavior, not implementation
- Use descriptive test names
- Maintain high coverage (>80%)

## Performance Guidelines

### Frontend
- Bundle size: Monitor with build tools
- Lazy loading: Code-split routes and heavy components
- Image optimization: Use responsive images, WebP format
- Caching: Cache static assets aggressively
- Rendering: Avoid layout thrashing, use requestAnimationFrame

### Backend
- Response time: Target <200ms for API endpoints
- Database: Optimize queries, use indexes
- Caching: Use Redis for frequent queries
- Monitoring: Log performance metrics

## Accessibility

- **Semantic HTML**: Use proper heading hierarchy
- **ARIA Labels**: Add for screen readers
- **Keyboard Navigation**: Ensure all interactive elements are keyboard-accessible
- **Color Contrast**: WCAG AA minimum (4.5:1 for text)
- **Testing**: Use axe, WAVE, and screen readers

## Documentation

Every project should include:

### README.md
- Project description and purpose
- Technology stack
- Setup instructions
- Development workflow
- Key features and architecture

### API Documentation (if applicable)
- Endpoint descriptions
- Request/response formats
- Error codes and handling
- Example requests and responses

### Contributing Guidelines
- How to set up development environment
- Code style and conventions
- Testing requirements
- Pull request process

### Change Log
- Record significant changes
- Track breaking changes
- Document new features and fixes

## Tech Stack Reference

### Approved Frontend Technologies
- **React** / **Next.js** — App development
- **Vue.js** — Alternative framework
- **Vanilla JS** — Lightweight projects
- **Vite** — Modern build tool
- **Tailwind CSS** / **CSS Modules** / **CSS Tokens** — Styling

### Approved Backend Technologies
- **Node.js** — JavaScript runtime
- **Python** — Data processing, ML
- **Express.js** — Node web framework
- **FastAPI** — Python web framework
- **PostgreSQL** / **MongoDB** — Databases

### Development Tools
- **VS Code** — Editor
- **Turbo** — Monorepo orchestration
- **ESLint** / **Biome** — Linting
- **Jest** / **Vitest** — Testing
- **Git** — Version control

## Git Workflow

1. **Branches**: Feature branches from `main`
2. **Commits**: Clear, descriptive messages
3. **PRs**: Required review before merge
4. **Squash**: Squash commits when merging feature branches
5. **Tags**: Create tags for releases

## Continuous Integration

- Run linting on every commit
- Run tests on every PR
- Build and deploy on merge to main
- Monitor performance and errors
- Track code coverage

## Security

- **Dependencies**: Keep up-to-date, audit regularly
- **Secrets**: Never commit to repo, use environment variables
- **Input Validation**: Validate all user input
- **CORS**: Configure appropriately
- **HTTPS**: Use in production
- **Authentication**: Implement secure auth patterns

## Performance Monitoring

- Track Core Web Vitals
- Monitor API response times
- Alert on error rates
- Profile regularly
- Track user experience metrics

## Deployment

- **Development**: Deploy on every commit to dev branch
- **Staging**: Deploy on every commit to staging branch
- **Production**: Manual deploy or scheduled pipeline
- **Rollback**: Have rollback strategy ready
- **Monitoring**: Monitor after deployment

## Version Management

Use semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

---

## Resources

- Design System: See shared-schemas package
- Examples: Review example applications
- Debugging: Check docs/DEBUGGING.md
- Contributing: See docs/CONTRIBUTING.md
