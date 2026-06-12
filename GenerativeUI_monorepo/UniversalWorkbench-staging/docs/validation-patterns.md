# Zod Validation Patterns

## Overview

This template includes comprehensive Zod validation utilities in `src/utils/validation.ts`.

## Core Principles

1. **Runtime Type Safety** - Validate data at boundaries (API, file I/O, external data)
2. **Type Inference** - Derive TypeScript types from Zod schemas
3. **Fail Fast** - Validate early, fail with clear errors
4. **Composable** - Build complex schemas from simple ones

## Common Validators

### String Validators

```typescript
import {
  NonEmptyString,
  EmailString,
  UrlString,
  UuidString,
} from './utils/validation';

// Validate email
const email = validate(EmailString, 'user@example.com');

// Validate UUID
const id = validate(UuidString, '123e4567-e89b-12d3-a456-426614174000');
```

### Number Validators

```typescript
import { PositiveNumber, PortNumber } from './utils/validation';

// Validate port
const port = validate(PortNumber, 3000);

// Validate positive
const count = validate(PositiveNumber, 42);
```

### Custom Schemas

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: UuidString,
  email: EmailString,
  name: NonEmptyString,
  age: PositiveNumber.optional(),
  createdAt: ISODateString,
});

type User = z.infer<typeof UserSchema>;
```

## Validation Methods

### Safe Validation (Returns Result)

```typescript
import { validateSafe } from './utils/validation';

const result = validateSafe(UserSchema, data);

if (result.success) {
  console.log('Valid user:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}
```

### Throwing Validation (Use in Try/Catch)

```typescript
import { validate } from './utils/validation';

try {
  const user = validate(UserSchema, data);
  // user is fully typed
} catch (error) {
  console.error('Invalid data:', error);
}
```

### Create Validator Function

```typescript
import { createValidator } from './utils/validation';

const userValidator = createValidator(UserSchema);

// All methods available
const user1 = userValidator.validate(data); // throws
const result = userValidator.validateSafe(data); // returns result
const user2 = await userValidator.validateAsync(data); // async
```

## Common Patterns

### Pagination

```typescript
import { PaginationSchema } from './utils/validation';

const pagination = validate(PaginationSchema, {
  page: 2,
  limit: 50,
});
// { page: 2, limit: 50, offset: undefined }
```

### API Response Envelope

```typescript
import { createResponseSchema } from './utils/validation';

const UserResponseSchema = createResponseSchema(UserSchema);

type UserResponse = z.infer<typeof UserResponseSchema>;
// {
//   success: boolean;
//   data?: User;
//   error?: string;
//   timestamp: string;
// }
```

### Transform Data

```typescript
import { StringToNumber, CommaSeparatedToArray } from './utils/validation';

// String to number
const port = validate(StringToNumber, '3000'); // 3000 (number)

// CSV to array
const tags = validate(CommaSeparatedToArray, 'tag1, tag2, tag3');
// ['tag1', 'tag2', 'tag3']
```

## Environment Validation

```typescript
import { validateEnv, z } from './utils/validation';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['dev', 'stg', 'prd']),
  PORT: z.string().transform(Number),
  API_KEY: NonEmptyString,
  DATABASE_URL: UrlString,
});

// Validates process.env at startup
const env = validateEnv(EnvSchema);
// Fully typed, throws if invalid

export { env };
```

## Type Guards

```typescript
import { isType } from './utils/validation';

function processData(data: unknown): void {
  if (isType(UserSchema, data)) {
    // data is User here
    console.log(data.email);
  } else {
    throw new Error('Invalid user data');
  }
}
```

## Complex Schemas

### Nested Objects

```typescript
const AddressSchema = z.object({
  street: NonEmptyString,
  city: NonEmptyString,
  zip: z.string().regex(/^\d{5}$/),
});

const UserWithAddressSchema = UserSchema.extend({
  address: AddressSchema,
});
```

### Arrays

```typescript
const TagSchema = z.string().min(1).max(50);

const PostSchema = z.object({
  title: NonEmptyString,
  content: NonEmptyString,
  tags: z.array(TagSchema).min(1).max(10),
  author: UserSchema,
});
```

### Unions & Discriminated Unions

```typescript
// Union
const IdSchema = z.union([UuidString, z.number().positive()]);

// Discriminated union
const EventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('user.created'),
    userId: UuidString,
  }),
  z.object({
    type: z.literal('user.deleted'),
    userId: UuidString,
    reason: z.string(),
  }),
]);
```

### Refinements & Custom Validation

```typescript
const PasswordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number');

const AgeSchema = z.number().refine(
  (age) => age >= 18,
  'Must be 18 or older'
);
```

## Best Practices

### 1. Validate at Boundaries

```typescript
// ✅ Good - Validate external data
export async function createUser(input: unknown): Promise<User> {
  const validated = validate(CreateUserSchema, input);
  return await db.users.create(validated);
}

// ❌ Bad - Trust external data
export async function createUser(input: User): Promise<User> {
  return await db.users.create(input);
}
```

### 2. Derive Types from Schemas

```typescript
// ✅ Good - Single source of truth
const UserSchema = z.object({ /* ... */ });
type User = z.infer<typeof UserSchema>;

// ❌ Bad - Duplicate definitions
interface User { /* ... */ }
const UserSchema = z.object({ /* ... */ });
```

### 3. Separate Input/Output Types

```typescript
// Input (from client)
const CreateUserInputSchema = z.object({
  email: EmailString,
  name: NonEmptyString,
});

// Output (from database)
const UserSchema = CreateUserInputSchema.extend({
  id: UuidString,
  createdAt: ISODateString,
});

type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
type User = z.infer<typeof UserSchema>;
```

### 4. Reuse Common Patterns

```typescript
// Create reusable timestamp schema
const TimestampSchema = z.object({
  createdAt: ISODateString,
  updatedAt: ISODateString,
});

// Compose into other schemas
const UserSchema = z.object({
  id: UuidString,
  email: EmailString,
}).merge(TimestampSchema);
```

## Error Handling

### Structured Error Messages

```typescript
const result = validateSafe(UserSchema, data);

if (!result.success) {
  for (const error of result.errors) {
    console.error(`${error.path.join('.')}: ${error.message}`);
  }
}
```

### Custom Error Messages

```typescript
const UserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  age: z.number().positive('Age must be a positive number'),
});
```

## Testing Validation

```typescript
import { describe, it, expect } from 'vitest';

describe('UserSchema', () => {
  it('should validate correct user', () => {
    const result = validateSafe(UserSchema, {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      name: 'John Doe',
      createdAt: '2024-01-01T00:00:00Z',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = validateSafe(UserSchema, {
      email: 'invalid-email',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.some((e) => e.path.includes('email'))).toBe(true);
    }
  });
});
```

## Resources

- [Zod Documentation](https://zod.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- Source: `src/utils/validation.ts`
- Tests: `src/utils/validation.unit.test.ts`
