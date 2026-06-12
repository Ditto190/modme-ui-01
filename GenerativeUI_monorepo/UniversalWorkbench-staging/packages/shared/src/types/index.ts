// Re-export types from @adaptiveworx/db (Drizzle-generated)
export type { NewPost, NewUser, Post, User } from '@adaptiveworx/db';

// Shared API types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
