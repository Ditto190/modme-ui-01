import { db } from '@adaptiveworx/db';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { postRoutes } from './routes/posts.js';
import { userRoutes } from './routes/users.js';

function createDefaultLogger(): FastifyServerOptions['logger'] {
  if (process.env['NODE_ENV'] === 'development') {
    return {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    };
  }

  return true;
}

export async function buildServer(options: FastifyServerOptions = {}): Promise<FastifyInstance> {
  // Build server options, ensuring logger is always defined
  const serverOptions = {
    ...options,
  };

  // Only set logger if not already provided
  if (!('logger' in options)) {
    Object.assign(serverOptions, { logger: createDefaultLogger() });
  }

  const server = Fastify(serverOptions as FastifyServerOptions);

  await server.register(helmet);
  await server.register(cors, {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
    credentials: true,
  });
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  server.get('/health', async () => {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: 'ok', timestamp: new Date().toISOString() };
    } catch (error) {
      server.log.error(error);
      throw new Error('Database connection failed');
    }
  });

  await server.register(userRoutes, { prefix: '/api/users' });
  await server.register(postRoutes, { prefix: '/api/posts' });

  return server;
}
