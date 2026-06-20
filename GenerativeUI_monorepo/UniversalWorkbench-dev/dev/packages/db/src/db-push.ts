#!/usr/bin/env tsx
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
/**
 * Push schema to database (for rapid local development)
 * Usage: yarn push or DATABASE_URL=<url> yarn push
 */
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';

// Load .env from monorepo root BEFORE importing client
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

async function pushSchema() {
  // Dynamic import to ensure dotenv loads first
  const { db } = await import('./client.js');

  try {
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        email text NOT NULL UNIQUE,
        name text,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
    `);

    // Create posts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS posts (
        id text PRIMARY KEY,
        title text NOT NULL,
        content text,
        published boolean DEFAULT false NOT NULL,
        author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS posts_author_idx ON posts(author_id);
      CREATE INDEX IF NOT EXISTS posts_published_idx ON posts(published);
    `);
    process.exit(0);
  } catch (_error) {
    process.exit(1);
  }
}

pushSchema();
