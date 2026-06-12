# Vibe Web App

A premium interactive design playground built with vanilla HTML/CSS/JavaScript and Vite, showcasing glassmorphism, vibrant gradients, and micro-interactions.

## Features

- **Color & Gradient Sandbox**: Generate beautiful, harmonized gradient combinations with HSL color theory
- **Micro-Interactions**: Explore bounce animations, glowing effects, and 3D tilt interactions
- **Vibe Logger**: Real-time event tracking and logging console
- **Premium Design System**: Custom CSS tokens with glassmorphism effects
- **Responsive Layout**: Adaptive grid layout for different screen sizes

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Build Tool**: Vite 5.2+
- **Design System**: Custom CSS tokens with HSL gradients
- **Font**: Outfit from Google Fonts

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the Vite development server on `http://localhost:3000`

### Production Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── index.html          # Main HTML template
├── app.js              # Main application logic
├── style.css           # Component styles
└── theme.css           # Global design tokens and variables
```

## Design System

All colors, spacing, and effects are defined as CSS custom properties in `theme.css`:

- **Colors**: Primary (Purple), Secondary (Pink), Accent (Cyan)
- **Effects**: Glassmorphism with backdrop blur, soft shadows, smooth transitions
- **Typography**: Outfit font with premium weights (300-700)
- **Animations**: Bounce, fade, scale, and 3D tilt interactions

## Key Components

### Color & Gradient Sandbox
Generates vibrant gradients using HSL color space:
- Random hue selection (0-360°)
- Complementary/analogous color pairing
- High saturation (80-95%) for vibrancy
- Comfortable lighting (50-60%)

### Micro-Interactions
Interactive UI elements with smooth feedback:
- Bouncing buttons with scale animations
- Glowing toggle with body text shadow effect
- 3D tilt card with perspective transforms
- Real-time event logging

### Vibe Logger
Console-style event tracker:
- Timestamped event logs
- Event types: INFO, SYSTEM, SUCCESS, VIBE_CHECK
- Auto-scrolling console
- Clear logs functionality

## Guidelines

- Maintain high-quality visual aesthetics
- Use premium design concepts (glassmorphism, gradients)
- Keep code modular and well-organized
- Ensure smooth, 60fps animations

## Next Steps

- [ ] Connect to a backend API component
- [ ] Add theme switcher for alternative color schemes
- [ ] Export gradient codes as CSS/JSON
- [ ] Mobile-first responsiveness refinement
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)

## Author

Built by Dylan with 💜 in the Antigravity IDE
