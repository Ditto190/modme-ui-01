import { z } from 'zod';
import type { Post, User } from './schema/index.js';

// Additional runtime validation schemas (beyond Drizzle-generated)
// Note: Basic validation is in schema/*.ts via drizzle-zod

export const UserRuntimeSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PostRuntimeSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().nullable(),
  published: z.boolean(),
  authorId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Re-export for convenience
export type UserRuntime = z.infer<typeof UserRuntimeSchema>;
export type PostRuntime = z.infer<typeof PostRuntimeSchema>;

// Extended types for API responses
export type UserWithCounts = User & {
  postsCount: number;
};

export type PostWithAuthor = Post & {
  author: User | null;
};
