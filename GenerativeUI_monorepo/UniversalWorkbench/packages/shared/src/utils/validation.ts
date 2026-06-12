/**
 * Zod Validation Utilities
 *
 * Comprehensive validation helpers using Zod for runtime type safety.
 */

import { z } from 'zod';

/**
 * Common validation schemas
 */

// String validators
export const NonEmptyString = z.string().min(1, 'Cannot be empty');
export const EmailString = z.string().email('Invalid email format');
export const UrlString = z.string().url('Invalid URL format');
export const UuidString = z.string().uuid('Invalid UUID format');

// Number validators
export const PositiveNumber = z.number().positive('Must be positive');
export const NonNegativeNumber = z.number().nonnegative('Cannot be negative');
export const PortNumber = z.number().int().min(1).max(65535);

// Date validators
export const ISODateString = z.string().datetime('Invalid ISO date format');
export const FutureDateString = z
  .string()
  .datetime()
  .refine((date) => new Date(date) > new Date(), 'Must be a future date');

/**
 * Validation result types
 */
export type ValidationSuccess<T> = {
  success: true;
  data: T;
};

export type ValidationError = {
  success: false;
  errors: Array<{
    path: string[];
    message: string;
  }>;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/**
 * Safe validation wrapper that returns result instead of throwing
 */
export function validateSafe<Output, Input = unknown>(
  schema: z.ZodType<Output, z.ZodTypeDef, Input>,
  data: unknown
): ValidationResult<Output> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      path: err.path.map(String),
      message: err.message,
    })),
  };
}

/**
 * Validation that throws on error (for use in try/catch)
 */
export function validate<Output, Input = unknown>(
  schema: z.ZodType<Output, z.ZodTypeDef, Input>,
  data: unknown
): Output {
  return schema.parse(data);
}

/**
 * Async validation wrapper
 */
export async function validateAsync<Output, Input = unknown>(
  schema: z.ZodType<Output, z.ZodTypeDef, Input>,
  data: unknown
): Promise<Output> {
  return schema.parseAsync(data);
}

/**
 * Create a validator function from a schema
 */
export function createValidator<Output, Input = unknown>(
  schema: z.ZodType<Output, z.ZodTypeDef, Input>
) {
  return {
    validate: (data: unknown): Output => validate(schema, data),
    validateSafe: (data: unknown): ValidationResult<Output> => validateSafe(schema, data),
    validateAsync: (data: unknown): Promise<Output> => validateAsync(schema, data),
    schema,
  };
}

/**
 * Common patterns
 */

// Pagination
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().optional(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

// API Response envelope
export function createResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: ISODateString,
  });
}

// API Error
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Transform utilities
 */

// String to number
export const StringToNumber = z.string().transform((val) => {
  const num = Number(val);
  if (Number.isNaN(num)) {
    throw new Error('Invalid number');
  }
  return num;
});

// String to boolean
export const StringToBoolean = z.string().transform((val) => {
  const lower = val.toLowerCase();
  if (lower === 'true' || lower === '1' || lower === 'yes') {
    return true;
  }
  if (lower === 'false' || lower === '0' || lower === 'no') {
    return false;
  }
  throw new Error('Invalid boolean value');
});

// Comma-separated string to array
export const CommaSeparatedToArray = z.string().transform((val) =>
  val
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
);

/**
 * Runtime type guards using Zod
 */

export function isType<T>(schema: z.ZodSchema<T>, value: unknown): value is T {
  return schema.safeParse(value).success;
}

/**
 * Environment variable validation
 */
export function validateEnv<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.infer<z.ZodObject<T>> {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    for (const _error of result.error.errors) {
    }
    throw new Error('Environment validation failed');
  }

  return result.data;
}

/**
 * Example: Environment schema
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['dev', 'stg', 'prd', 'test']).default('dev'),
  PORT: z.string().transform(Number).pipe(PortNumber).default('3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;
