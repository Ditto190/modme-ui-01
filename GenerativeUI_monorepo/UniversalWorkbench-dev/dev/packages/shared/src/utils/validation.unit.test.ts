import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CommaSeparatedToArray,
  createValidator,
  EmailString,
  isType,
  NonEmptyString,
  PaginationSchema,
  PositiveNumber,
  StringToNumber,
  validate,
  validateSafe,
} from './validation.js';

describe('validation utilities', () => {
  describe('validateSafe', () => {
    it('should return success for valid data', () => {
      const schema = z.object({ name: z.string() });
      const result = validateSafe(schema, { name: 'test' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('test');
      }
    });

    it('should return errors for invalid data', () => {
      const schema = z.object({ name: z.string() });
      const result = validateSafe(schema, { name: 123 });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('validate', () => {
    it('should return data for valid input', () => {
      const schema = z.object({ age: z.number() });
      const result = validate(schema, { age: 25 });

      expect(result.age).toBe(25);
    });

    it('should throw for invalid input', () => {
      const schema = z.object({ age: z.number() });

      expect(() => validate(schema, { age: 'not a number' })).toThrow();
    });
  });

  describe('createValidator', () => {
    it('should create validator with all methods', () => {
      const schema = z.object({ count: z.number() });
      const validator = createValidator(schema);

      expect(validator.validate({ count: 5 })).toEqual({ count: 5 });
      expect(validator.validateSafe({ count: 5 }).success).toBe(true);
      expect(validator.schema).toBe(schema);
    });
  });

  describe('common validators', () => {
    it('NonEmptyString should reject empty strings', () => {
      expect(() => validate(NonEmptyString, '')).toThrow();
      expect(validate(NonEmptyString, 'hello')).toBe('hello');
    });

    it('EmailString should validate email format', () => {
      expect(() => validate(EmailString, 'invalid')).toThrow();
      expect(validate(EmailString, 'test@example.com')).toBe('test@example.com');
    });

    it('PositiveNumber should reject zero and negative', () => {
      expect(() => validate(PositiveNumber, 0)).toThrow();
      expect(() => validate(PositiveNumber, -5)).toThrow();
      expect(validate(PositiveNumber, 10)).toBe(10);
    });
  });

  describe('PaginationSchema', () => {
    it('should apply defaults', () => {
      const result = validate(PaginationSchema, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should accept valid pagination', () => {
      const result = validate(PaginationSchema, { page: 2, limit: 50 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });

    it('should reject invalid values', () => {
      expect(() => validate(PaginationSchema, { page: 0 })).toThrow();
      expect(() => validate(PaginationSchema, { limit: 200 })).toThrow();
    });
  });

  describe('isType', () => {
    it('should return true for valid type', () => {
      const schema = z.string();

      expect(isType(schema, 'hello')).toBe(true);
      expect(isType(schema, 123)).toBe(false);
    });
  });

  describe('transforms', () => {
    it('StringToNumber should convert string to number', () => {
      expect(validate(StringToNumber, '42')).toBe(42);
      expect(() => validate(StringToNumber, 'not a number')).toThrow();
    });

    it('CommaSeparatedToArray should split and trim', () => {
      expect(validate(CommaSeparatedToArray, 'a, b, c')).toEqual(['a', 'b', 'c']);
      expect(validate(CommaSeparatedToArray, 'one')).toEqual(['one']);
      expect(validate(CommaSeparatedToArray, '')).toEqual([]);
    });
  });
});
