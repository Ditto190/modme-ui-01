import { describe, expect, it } from 'vitest';
import { cn } from '../../utils/cn.js';

describe('Button Component Logic', () => {
  it('should combine class names correctly', () => {
    const result = cn('base-class', 'additional-class');
    expect(result).toContain('base-class');
    expect(result).toContain('additional-class');
  });

  it('should handle undefined class names', () => {
    const result = cn('base-class', undefined, 'another-class');
    expect(result).toContain('base-class');
    expect(result).toContain('another-class');
  });
});
