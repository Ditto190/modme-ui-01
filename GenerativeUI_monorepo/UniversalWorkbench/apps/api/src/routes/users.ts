import { db, insertUserSchema, posts, users } from '@adaptiveworx/db';
import { validateBody } from '@adaptiveworx/shared/validation-middleware';
import { desc, eq, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { mapUserWithCounts } from './users.helpers.js';

export const userRoutes: FastifyPluginAsync = async (server) => {
  /**
   * @feature USER.ITEM.LIST
   * @domain USER
   * @entity ITEM
   * @operation LIST
   * @layer API
   * @dependencies [DB.USERS.SCHEMA, DB.POSTS.SCHEMA]
   * @implements
   *   - GET /api/users endpoint
   *   - Aggregate posts count per user
   *   - Order by creation date descending
   * @tests
   *   - Integration: List users with counts
   */
  server.get('/', async () => {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        postsCount: sql<number>`COALESCE(COUNT(${posts.id}), 0)`,
      })
      .from(users)
      .leftJoin(posts, eq(posts.authorId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));

    return { users: allUsers.map(mapUserWithCounts) };
  });

  /**
   * @feature USER.ITEM.READ
   * @domain USER
   * @entity ITEM
   * @operation READ
   * @layer API
   * @dependencies [DB.USERS.SCHEMA, DB.POSTS.SCHEMA]
   * @implements
   *   - GET /api/users/:id endpoint
   *   - Fetch single user with posts count
   *   - 404 if user not found
   * @tests
   *   - Integration: Get user by ID
   *   - Integration: 404 for non-existent user
   */
  server.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        postsCount: sql<number>`COALESCE(COUNT(${posts.id}), 0)`,
      })
      .from(users)
      .leftJoin(posts, eq(posts.authorId, users.id))
      .where(eq(users.id, request.params.id))
      .groupBy(users.id);

    if (user === undefined) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return { user: mapUserWithCounts(user) };
  });

  /**
   * @feature USER.ITEM.CREATE
   * @domain USER
   * @entity ITEM
   * @operation CREATE
   * @layer API
   * @dependencies [DB.USERS.SCHEMA]
   * @implements
   *   - POST /api/users endpoint
   *   - Zod validation via middleware
   *   - Insert user into database
   *   - Return created user
   * @tests
   *   - Integration: Create valid user
   *   - Integration: Reject invalid email
   *   - Integration: Enforce email uniqueness
   */
  server.post('/', { preHandler: validateBody(insertUserSchema) }, async (request) => {
    const data = insertUserSchema.parse(request.body);
    // Type assertion needed due to exactOptionalPropertyTypes + Drizzle insert types
    const [user] = await db
      .insert(users)
      .values(data as typeof users.$inferInsert)
      .returning();
    return { user };
  });

  /**
   * @feature USER.ITEM.DELETE
   * @domain USER
   * @entity ITEM
   * @operation DELETE
   * @layer API
   * @dependencies [DB.USERS.SCHEMA]
   * @implements
   *   - DELETE /api/users/:id endpoint
   *   - Remove user from database
   *   - Cascade delete related posts
   *   - 404 if user not found
   * @tests
   *   - Integration: Delete existing user
   *   - Integration: 404 for non-existent user
   *   - Integration: Verify cascade delete of posts
   */
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const [deleted] = await db.delete(users).where(eq(users.id, request.params.id)).returning();

    if (deleted === undefined) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return { user: deleted };
  });
};
