import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildServer } from './server.js';

type UserRecord = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PostRecord = {
  id: string;
  title: string;
  content: string | null;
  published: boolean;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
};

const { dataStore, usersTable, postsTable } = vi.hoisted(() => {
  const store: {
    users: UserRecord[];
    posts: PostRecord[];
  } = {
    users: [
      {
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z'),
      },
      {
        id: 'user-2',
        email: 'bob@example.com',
        name: 'Bob',
        createdAt: new Date('2024-01-02T00:00:00Z'),
        updatedAt: new Date('2024-01-02T12:00:00Z'),
      },
    ],
    posts: [
      {
        id: 'post-1',
        title: 'Hello World',
        content: 'This is a demo post',
        published: true,
        authorId: 'user-1',
        createdAt: new Date('2024-01-03T00:00:00Z'),
        updatedAt: new Date('2024-01-03T00:00:00Z'),
      },
      {
        id: 'post-2',
        title: 'Another Post',
        content: 'More content for Alice',
        published: false,
        authorId: 'user-1',
        createdAt: new Date('2024-01-04T00:00:00Z'),
        updatedAt: new Date('2024-01-04T00:00:00Z'),
      },
      {
        id: 'post-3',
        title: 'Bob Post',
        content: 'Bob writes once',
        published: true,
        authorId: 'user-2',
        createdAt: new Date('2024-01-05T00:00:00Z'),
        updatedAt: new Date('2024-01-05T00:00:00Z'),
      },
    ],
  };

  return {
    dataStore: store,
    usersTable: { __table: 'users' },
    postsTable: { __table: 'posts' },
  };
});

function aggregateUsers(filterId?: string) {
  return dataStore.users
    .filter((user) => (filterId === undefined ? true : user.id === filterId))
    .map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      postsCount: dataStore.posts.filter((post) => post.authorId === user.id).length,
    }));
}

function projectPosts(filterId?: string) {
  return dataStore.posts
    .filter((post) => (filterId === undefined ? true : post.id === filterId))
    .map((post) => ({
      post,
      author: dataStore.users.find((user) => user.id === post.authorId) ?? null,
    }));
}

vi.mock('@adaptiveworx/db', () => {
  const select = vi.fn(() => ({
    from(table: unknown) {
      if (table === usersTable) {
        const joinResult = {
          where(condition: { value?: string }) {
            const filterId = condition?.value;
            return {
              groupBy() {
                return {
                  orderBy() {
                    return Promise.resolve(aggregateUsers(filterId));
                  },
                };
              },
            };
          },
          groupBy() {
            return {
              orderBy() {
                return Promise.resolve(aggregateUsers());
              },
            };
          },
        };
        return {
          leftJoin() {
            return joinResult;
          },
        };
      }

      if (table === postsTable) {
        const joinResult = {
          where(condition: { value?: string }) {
            const filterId = condition?.value;
            return Promise.resolve(projectPosts(filterId));
          },
          orderBy() {
            return Promise.resolve(projectPosts());
          },
        };
        return {
          leftJoin() {
            return joinResult;
          },
        };
      }

      throw new Error('Unsupported table');
    },
  }));

  const execute = vi.fn(async () => [{ result: 1 }]);

  return {
    __esModule: true,
    db: {
      select,
      execute,
      insert: vi.fn(() => ({
        values: () => ({
          returning: async () => [],
        }),
      })),
      update: vi.fn(() => ({
        set: () => ({
          where: () => ({
            returning: async () => [],
          }),
        }),
      })),
      delete: vi.fn(() => ({
        where: () => Promise.resolve([]),
      })),
    },
    migrationDb: {},
    insertUserSchema: { parse: <T>(input: T) => input },
    insertPostSchema: { parse: <T>(input: T) => input },
    users: usersTable,
    posts: postsTable,
  };
});

vi.mock('drizzle-orm', () => ({
  __esModule: true,
  desc: (column: unknown) => ({ type: 'desc', column }),
  eq: (_column: unknown, value: string) => ({ type: 'eq', value }),
  sql: (strings: TemplateStringsArray) => strings.join(''),
}));

describe('API server smoke tests', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await buildServer({ logger: false });
  });

  afterAll(async () => {
    await server.close();
  });

  it('responds to /health', async () => {
    const response = await server.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });

  it('lists users with post counts', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/users' });

    expect(response.statusCode).toBe(200);

    const payload = response.json() as {
      users: Array<{
        id: string;
        email: string;
        name: string | null;
        postsCount: number;
      }>;
    };

    expect(payload.users).toHaveLength(2);
    expect(payload.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'user-1',
          email: 'alice@example.com',
          postsCount: 2,
        }),
        expect.objectContaining({
          id: 'user-2',
          email: 'bob@example.com',
          postsCount: 1,
        }),
      ])
    );
  });

  it('lists posts with author details', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/posts' });

    expect(response.statusCode).toBe(200);

    const payload = response.json() as {
      posts: Array<{
        id: string;
        title: string;
        author: { id: string; email: string; name: string | null };
      }>;
    };

    expect(payload.posts).toHaveLength(3);
    const first = payload.posts.find((post) => post.id === 'post-1');
    expect(first).toMatchObject({
      id: 'post-1',
      title: 'Hello World',
      author: {
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
      },
    });
  });
});
