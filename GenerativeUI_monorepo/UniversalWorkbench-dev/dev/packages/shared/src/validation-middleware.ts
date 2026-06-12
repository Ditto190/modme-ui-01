/**
 * Fastify Validation Middleware
 *
 * Request validation using Zod schemas with automatic error handling.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { validateSafe } from './utils/validation.js';

/**
 * Validate request body
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = validateSafe(schema, request.body);

    if (!result.success) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: result.errors,
      });
    }

    // Attach validated data to request
    request.body = result.data;
  };
}

/**
 * Validate query parameters
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = validateSafe(schema, request.query);

    if (!result.success) {
      return reply.code(400).send({
        error: 'Invalid query parameters',
        details: result.errors,
      });
    }

    request.query = result.data;
  };
}

/**
 * Validate route params
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const result = validateSafe(schema, request.params);

    if (!result.success) {
      return reply.code(400).send({
        error: 'Invalid route parameters',
        details: result.errors,
      });
    }

    request.params = result.data;
  };
}

/**
 * Combined validation (body + query + params)
 */
export function validateRequest<
  TBody extends z.ZodTypeAny = z.ZodAny,
  TQuery extends z.ZodTypeAny = z.ZodAny,
  TParams extends z.ZodTypeAny = z.ZodAny,
>(config: { body?: TBody; query?: TQuery; params?: TParams }) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const errors: Array<{ field: string; errors: unknown }> = [];

    if (config.body !== undefined) {
      const result = validateSafe(config.body, request.body);
      if (!result.success) {
        errors.push({ field: 'body', errors: result.errors });
      } else {
        request.body = result.data;
      }
    }

    if (config.query !== undefined) {
      const result = validateSafe(config.query, request.query);
      if (!result.success) {
        errors.push({ field: 'query', errors: result.errors });
      } else {
        request.query = result.data;
      }
    }

    if (config.params !== undefined) {
      const result = validateSafe(config.params, request.params);
      if (!result.success) {
        errors.push({ field: 'params', errors: result.errors });
      } else {
        request.params = result.data;
      }
    }

    if (errors.length > 0) {
      return reply.code(400).send({
        error: 'Validation failed',
        details: errors,
      });
    }
  };
}
