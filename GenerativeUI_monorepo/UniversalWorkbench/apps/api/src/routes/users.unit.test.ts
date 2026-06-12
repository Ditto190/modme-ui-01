import type { UserWithCounts } from '@adaptiveworx/db';
import { describe, expect, it } from 'vitest';
import { mapUserWithCounts } from './users.helpers.js';

describe('mapUserWithCounts', () => {
  const baseRow = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Example User',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
    postsCount: 3,
  };

  it('maps aggregate row to user with counts', () => {
    const result = mapUserWithCounts(baseRow);

    const expected: UserWithCounts = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Example User',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      postsCount: 3,
    };

    expect(result).toEqual(expected);
  });

  it('defaults missing post counts to zero', () => {
    const result = mapUserWithCounts({ ...baseRow, postsCount: null });

    expect(result.postsCount).toBe(0);
  });

  it('supports users without a name', () => {
    const result = mapUserWithCounts({ ...baseRow, name: null });

    expect(result.name).toBeNull();
  });
});
