import { db, insertPostSchema, posts, users } from '@adaptiveworx/db';
import { validateBody } from '@adaptiveworx/shared/validation-middleware';
import { desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { mapPostWithAuthor, type PostWithAuthor } from './posts.helpers.js';

export type { AuthorSummary, PostQueryResult, PostWithAuthor } from './posts.helpers.js';

async function fetchPostById(id: string): Promise<PostWithAuthor | null> {
  const [postRow] = await db
    .select({
      post: posts,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, id));

  if (postRow === undefined) {
    return null;
  }

  return mapPostWithAuthor(postRow);
}

export const postRoutes: FastifyPluginAsync = async (server) => {
  // GET /api/posts - List all posts
  server.get('/', async () => {
    const allPosts = await db
      .select({
        post: posts,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt));

    return { posts: allPosts.map(mapPostWithAuthor) };
  });

  // GET /api/posts/:id - Get single post
  server.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const post = await fetchPostById(request.params.id);

    if (post === null) {
      return reply.code(404).send({ error: 'Post not found' });
    }

    return { post };
  });

  // POST /api/posts - Create post
  server.post('/', { preHandler: validateBody(insertPostSchema) }, async (request) => {
    const data = insertPostSchema.parse(request.body);
    // Type assertion needed due to exactOptionalPropertyTypes + Drizzle insert types
    const [created] = await db
      .insert(posts)
      .values(data as typeof posts.$inferInsert)
      .returning();

    if (created === undefined) {
      throw new Error('Failed to create post');
    }

    const post = await fetchPostById(created.id);
    if (post === null) {
      throw new Error('Failed to load post after creation');
    }

    return { post };
  });

  // PUT /api/posts/:id - Update post
  server.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const [updated] = await db
      .update(posts)
      .set(request.body as typeof posts.$inferInsert)
      .where(eq(posts.id, request.params.id))
      .returning();

    if (updated === undefined) {
      return reply.code(404).send({ error: 'Post not found' });
    }

    const post = await fetchPostById(updated.id);
    if (post === null) {
      throw new Error(`Failed to load post ${updated.id} after update`);
    }

    return { post };
  });

  // DELETE /api/posts/:id - Delete post
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const existing = await fetchPostById(request.params.id);

    if (existing === null) {
      return reply.code(404).send({ error: 'Post not found' });
    }

    await db.delete(posts).where(eq(posts.id, request.params.id));

    return { post: existing };
  });
};
