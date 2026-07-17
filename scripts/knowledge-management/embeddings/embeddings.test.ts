import { describe, expect, it } from 'vitest';
import { EmbeddingService } from './embeddings';

describe('EmbeddingService', () => {
  it('generates embeddings from mocked pipeline', async () => {
    const service = EmbeddingService.getInstance();
    const embedding = await service.generateEmbedding(
      'This is a test journal entry about TypeScript programming.',
    );

    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
    expect(typeof embedding[0]).toBe('number');
  });

  it('extracts searchable text from markdown', () => {
    const service = EmbeddingService.getInstance();
    const markdown = `---
title: "Test Entry"
date: 2025-05-31T12:00:00.000Z
---

## Feelings

I feel great about this feature implementation.

## Technical Insights

TypeScript interfaces are really powerful for maintaining code quality.`;

    const { text, sections } = service.extractSearchableText(markdown);

    expect(text).toContain('I feel great about this feature implementation');
    expect(text).toContain('TypeScript interfaces are really powerful');
    expect(text).not.toContain('title: "Test Entry"');
    expect(sections).toEqual(['Feelings', 'Technical Insights']);
  });

  it('computes cosine similarity', () => {
    const service = EmbeddingService.getInstance();
    const identical = service.cosineSimilarity([1, 0, 0], [1, 0, 0]);
    const orthogonal = service.cosineSimilarity([1, 0, 0], [0, 1, 0]);

    expect(identical).toBeCloseTo(1.0, 5);
    expect(orthogonal).toBeCloseTo(0.0, 5);
  });
});
