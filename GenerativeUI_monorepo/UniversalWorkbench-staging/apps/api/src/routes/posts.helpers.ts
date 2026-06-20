import type { Post, User } from '@adaptiveworx/db';

export type AuthorSummary = Pick<User, 'id' | 'name' | 'email'>;
export type PostWithAuthor = Post & {
  author: AuthorSummary;
};

export type PostQueryResult = {
  post: Post;
  author: AuthorSummary | null;
};

export function mapPostWithAuthor(row: PostQueryResult): PostWithAuthor {
  const author =
    row.author ??
    ({
      id: row.post.authorId,
      name: null,
      email: 'unknown@local',
    } satisfies AuthorSummary);

  return {
    ...row.post,
    author,
  };
}
