#!/usr/bin/env tsx
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
/**
 * Reset database (drop all tables)
 * Usage: yarn reset
 */
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';

// Load .env from monorepo root BEFORE importing client
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

async function resetDatabase() {
  // Dynamic import to ensure dotenv loads first
  const { db } = await import('./client.js');

  try {
    await db.execute(sql`DROP TABLE IF EXISTS posts CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
    process.exit(0);
  } catch (_error) {
    process.exit(1);
  }
}

resetDatabase();
