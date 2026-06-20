/**
 * @behavior UI.COMPONENT.BUTTON
 * @domain UI
 * @entity COMPONENT
 * @operation BUTTON
 * @status DONE
 * @priority HIGH
 * @effort SMALL
 * @theme EXPERIENCE
 * @persona DEVELOPER
 * @valueDomain CAPABILITY
 * @valueType ENABLING
 * @layer UI
 * @dependencies []
 *
 * @why
 * Provide reusable, accessible Button component that serves as foundation
 * for consistent UI interactions across all applications
 *
 * @success
 * Developers can use Button component with full type safety and accessibility
 *
 * @who
 * As a frontend developer, I want a reusable Button component
 * so that I can build consistent UIs quickly
 *
 * @what
 * Given: Developer needs to render a button
 * When: They import and use <Button> component
 * Then: Button renders with correct styles, accessibility, and behavior
 *
 * @acceptance
 * - [x] Button renders with default variant
 * - [x] Button supports multiple variants (default, destructive, outline, etc.)
 * - [x] Button supports size variants (default, sm, lg, icon)
 * - [x] Button is accessible (proper ARIA attributes)
 * - [x] Button forwards ref correctly
 * - [x] Button accepts className for custom styling
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button.js';

describe('UI.COMPONENT.BUTTON', () => {
  describe('Given: Developer needs to render a button', () => {
    it('When: They use Button with default props, Then: Button renders correctly', () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
    });

    it('When: They use Button with variant="destructive", Then: Destructive styles applied', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button', { name: /delete/i });
      expect(button).toHaveClass('bg-destructive');
    });

    it('When: They use Button with size="sm", Then: Small size styles applied', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button', { name: /small/i });
      expect(button).toHaveClass('h-9');
    });

    it('When: They use Button with disabled, Then: Button is disabled', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button', { name: /disabled/i });
      expect(button).toBeDisabled();
    });
  });
});
