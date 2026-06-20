import type { UserWithCounts } from '@adaptiveworx/db';

export type UserAggregateRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
  postsCount: number | null;
};

export function mapUserWithCounts(row: UserAggregateRow): UserWithCounts {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    postsCount: Number(row.postsCount ?? 0),
  };
}
