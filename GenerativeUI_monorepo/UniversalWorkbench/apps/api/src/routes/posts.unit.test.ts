import { describe, expect, it } from 'vitest';
import { mapPostWithAuthor, type PostQueryResult, type PostWithAuthor } from './posts.helpers.js';

const mockPost = {
  id: 'post-1',
  title: 'Hello World',
  content: 'Sample content',
  published: true,
  authorId: 'user-1',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
} as const;

describe('mapPostWithAuthor', () => {
  it('includes author details when provided', () => {
    const row: PostQueryResult = {
      post: mockPost,
      author: {
        id: 'user-1',
        name: 'Example Author',
        email: 'author@example.com',
      },
    };

    const result = mapPostWithAuthor(row);

    const expected: PostWithAuthor = {
      ...mockPost,
      author: {
        id: 'user-1',
        name: 'Example Author',
        email: 'author@example.com',
      },
    };

    expect(result).toEqual(expected);
  });

  it('falls back to placeholder author when missing', () => {
    const row: PostQueryResult = {
      post: mockPost,
      author: null,
    };

    const result = mapPostWithAuthor(row);

    expect(result.author).toEqual({
      id: 'user-1',
      name: null,
      email: 'unknown@local',
    });
  });
});
