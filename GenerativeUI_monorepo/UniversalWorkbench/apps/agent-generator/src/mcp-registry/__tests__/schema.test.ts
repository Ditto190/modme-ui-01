import { generateZodFromJSONSchema } from '../schema-crawler.js';
import { test } from 'node:test';
import assert from 'node:assert';

test('generates Zod from JSON Schema', () => {
    const schema = { type: 'string', minLength: 5 };
    const result = generateZodFromJSONSchema(schema, 'TestType');
    // Simple check for presence of zod string 
    // real implementation might differ slightly in output format
    assert.ok(result.zodCode.includes('z.string()'), 'Output should contain z.string()');
});
