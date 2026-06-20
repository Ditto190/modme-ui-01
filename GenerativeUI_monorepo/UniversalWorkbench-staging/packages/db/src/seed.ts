#!/usr/bin/env tsx
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
/**
 * Seed database with test data
 * Usage: yarn seed
 */
import { config } from 'dotenv';

// Load .env from monorepo root BEFORE importing client
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Dynamic import to ensure dotenv loads first
  const { db } = await import('./client.js');
  const { users, posts } = await import('./schema/index.js');

  // Clear existing data
  await db.delete(posts);
  await db.delete(users);

  // Create test users
  const [alice] = await db
    .insert(users)
    .values({
      email: 'alice@example.com',
      name: 'Alice Developer',
    })
    .returning();

  if (alice === undefined) throw new Error('Failed to create alice');

  const [bob] = await db
    .insert(users)
    .values({
      email: 'bob@example.com',
      name: 'Bob Engineer',
    })
    .returning();

  if (bob === undefined) throw new Error('Failed to create bob');

  // Create posts for Alice
  await db.insert(posts).values([
    {
      title: 'Getting Started with PERN Stack',
      content: 'A comprehensive guide to building modern web applications...',
      published: true,
      authorId: alice.id,
    },
    {
      title: 'Advanced TypeScript Patterns',
      content: 'Deep dive into type safety and runtime validation...',
      published: false,
      authorId: alice.id,
    },
  ]);

  // Create post for Bob
  await db.insert(posts).values({
    title: 'Building Scalable APIs',
    content: 'Best practices for API design and implementation...',
    published: true,
    authorId: bob.id,
  });

  console.log('✅ Database seeded successfully!');
  console.log({ alice, bob });
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});
