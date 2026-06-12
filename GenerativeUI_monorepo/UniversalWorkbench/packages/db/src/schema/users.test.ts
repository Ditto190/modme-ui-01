/**
 * @behavior DB.SCHEMA.USERS
 * @domain DB
 * @entity SCHEMA
 * @operation USERS
 * @status DONE
 * @priority CRITICAL
 * @effort TRIVIAL
 * @theme QUALITY
 * @persona DEVELOPER
 * @valueDomain TECHNICAL
 * @valueType ENABLING
 * @layer DB
 * @dependencies []
 *
 * @why
 * Define type-safe user database schema that serves as foundation
 * for all user-related operations in the application
 *
 * @success
 * User schema is defined with proper types, constraints, and validation
 * integrated with Drizzle ORM and Zod
 *
 * @who
 * As a backend developer, I want a strongly-typed user schema
 * so that I can work with user data safely throughout the application
 *
 * @what
 * Given: Application needs to store user data
 * When: User schema is defined with Drizzle
 * Then: Schema provides type safety, constraints, and Zod validation
 *
 * @acceptance
 * - [x] User table defined with id, email, name, createdAt
 * - [x] Email is unique and required
 * - [x] ID uses UUID with auto-generation
 * - [x] Timestamps use timezone-aware types
 * - [x] Zod schema exported for validation
 * - [x] TypeScript types inferred from schema
 */

import { describe, expect, it } from 'vitest';
import type { NewUser } from './users.js';
import { insertUserSchema, users } from './users.js';

describe('DB.SCHEMA.USERS', () => {
  describe('Given: Application needs to store user data', () => {
    it('When: Schema is imported, Then: Table definition exists', () => {
      expect(users).toBeDefined();
      expect(users.id).toBeDefined();
      expect(users.email).toBeDefined();
      expect(users.name).toBeDefined();
      expect(users.createdAt).toBeDefined();
    });

    it('When: Zod schema is used, Then: Valid data passes validation', () => {
      const validUser: NewUser = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = insertUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('When: Invalid email provided, Then: Zod validation fails', () => {
      const invalidUser = {
        email: 'not-an-email',
        name: 'Test User',
      };

      const result = insertUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });
});
