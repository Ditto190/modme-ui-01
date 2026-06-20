import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from './users.js';

/**
 * @feature DB.POSTS.SCHEMA
 * @domain DB
 * @entity POSTS
 * @operation SCHEMA
 * @layer DB
 * @dependencies [DB.USERS.SCHEMA]
 * @implements
 *   - Post table with title, content, published status
 *   - Foreign key to users (author)
 *   - Cascade delete when user is deleted
 *   - Indexes on authorId and published status
 *   - Zod validation schemas
 * @tests
 *   - Unit: Schema validation
 *   - Integration: Foreign key constraints
 */
export const posts = pgTable(
  'posts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    content: text('content'),
    published: boolean('published').notNull().default(false),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    authorIdx: index('posts_author_idx').on(table.authorId),
    publishedIdx: index('posts_published_idx').on(table.published),
  })
);

// Zod schemas for validation
export const insertPostSchema = createInsertSchema(posts, {
  title: z.string().min(1),
  content: z.string().optional(),
  published: z.boolean().default(false),
});

export const selectPostSchema = createSelectSchema(posts);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
