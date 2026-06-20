import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

if (process.env['DATABASE_URL'] === undefined || process.env['DATABASE_URL'] === '') {
  throw new Error('DATABASE_URL environment variable is required');
}

// Connection for querying
const queryClient = postgres(process.env['DATABASE_URL']);
export const db = drizzle(queryClient, { schema });

// Connection for migrations (single connection)
const migrationClient = postgres(process.env['DATABASE_URL'], { max: 1 });
export const migrationDb = drizzle(migrationClient, { schema });
