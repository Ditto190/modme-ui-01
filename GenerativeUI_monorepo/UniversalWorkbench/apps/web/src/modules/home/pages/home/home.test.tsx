import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomePage } from './home';

describe('HomePage', () => {
  it('renders hero and stack overview', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('heading', {
        name: /welcome to the adaptive template/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByRole('heading', { name: /stack overview/i }),
    ).toBeDefined();
    expect(screen.getByRole('link', { name: /view users/i })).toBeDefined();
  });
});
