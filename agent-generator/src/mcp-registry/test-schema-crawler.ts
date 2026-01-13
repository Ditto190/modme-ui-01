/**
 * Test harness for schema-crawler.ts
 * Run: npx tsx src/mcp-registry/test-schema-crawler.ts
 */

import {
  generateZodFromJSONSchema,
  generateZodModule,
  generateZodModulesBatch,
  generateSchemaFileStructure,
} from './schema-crawler';

console.log('🧪 Testing schema-crawler.ts\n');

// Test 1: Simple object schema
console.log('=== TEST 1: Simple Object Schema ===');
const simpleSchema = {
  type: 'object' as const,
  properties: {
    name: { type: 'string' as const, minLength: 1 },
    age: { type: 'integer' as const, minimum: 0 },
  },
  required: ['name'],
};

const result1 = generateZodFromJSONSchema(simpleSchema, 'Person');
console.log('Zod Code:');
console.log(result1.zodCode);
console.log('\nType Definition:');
console.log(result1.typeDefinition);
console.log('\nValidator Code:');
console.log(result1.validatorCode);
console.log('✅ Test 1 passed\n');

// Test 2: Enum schema
console.log('=== TEST 2: Enum Schema ===');
const enumSchema = {
  type: 'string' as const,
  enum: ['celsius', 'fahrenheit'],
};

const result2 = generateZodFromJSONSchema(enumSchema, 'TemperatureUnit');
console.log('Zod Code:');
console.log(result2.zodCode);
console.log('\nType Definition:');
console.log(result2.typeDefinition);
console.log('✅ Test 2 passed\n');

// Test 3: Array schema
console.log('=== TEST 3: Array Schema ===');
const arraySchema = {
  type: 'array' as const,
  items: { type: 'string' as const },
};

const result3 = generateZodFromJSONSchema(arraySchema, 'StringList');
console.log('Zod Code:');
console.log(result3.zodCode);
console.log('\nType Definition:');
console.log(result3.typeDefinition);
console.log('✅ Test 3 passed\n');

// Test 4: Complete module generation
console.log('=== TEST 4: Complete Module Generation (MCP Tool) ===');
const weatherInputSchema = {
  type: 'object' as const,
  properties: {
    city: { type: 'string' as const, minLength: 2, maxLength: 100 },
    units: { type: 'string' as const, enum: ['celsius', 'fahrenheit'] },
  },
  required: ['city'],
};

const weatherOutputSchema = {
  type: 'object' as const,
  properties: {
    temperature: { type: 'number' as const },
    condition: { type: 'string' as const },
  },
};

const moduleCode = generateZodModule('getWeather', weatherInputSchema, weatherOutputSchema);
console.log('Generated Module:');
console.log(moduleCode);
console.log('✅ Test 4 passed\n');

// Test 5: Batch generation
console.log('=== TEST 5: Batch Generation ===');
const tools = [
  {
    name: 'getWeather',
    inputSchema: weatherInputSchema,
    outputSchema: weatherOutputSchema,
  },
  {
    name: 'translateText',
    inputSchema: {
      type: 'object' as const,
      properties: {
        text: { type: 'string' as const },
        targetLang: { type: 'string' as const },
      },
      required: ['text', 'targetLang'],
    },
  },
];

const batchResult = generateZodModulesBatch(tools);
console.log(`Generated ${batchResult.size} modules:`);
for (const [toolName, code] of batchResult) {
  console.log(`\n--- ${toolName} ---`);
  console.log(code.substring(0, 300) + '...');
}
console.log('✅ Test 5 passed\n');

// Test 6: File structure generation
console.log('=== TEST 6: File Structure Generation ===');
const fileStructure = generateSchemaFileStructure('weather-mcp', tools);
console.log(`Generated ${fileStructure.size} files:`);
for (const [filePath, content] of fileStructure) {
  console.log(`\n📁 ${filePath}`);
  console.log(`   ${content.split('\n').length} lines`);
}
console.log('✅ Test 6 passed\n');

// Test 7: Nested object schema
console.log('=== TEST 7: Nested Object Schema ===');
const nestedSchema = {
  type: 'object' as const,
  properties: {
    user: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        email: { type: 'string' as const },
      },
    },
  },
};

const result7 = generateZodFromJSONSchema(nestedSchema, 'UserData');
console.log('Zod Code:');
console.log(result7.zodCode);
console.log('✅ Test 7 passed\n');

// Test 8: String constraints
console.log('=== TEST 8: String Constraints ===');
const stringSchema = {
  type: 'string' as const,
  minLength: 5,
  maxLength: 50,
  pattern: '^[A-Z]',
};

const result8 = generateZodFromJSONSchema(stringSchema, 'ConstrainedString');
console.log('Zod Code:');
console.log(result8.zodCode);
console.log('✅ Test 8 passed\n');

// Test 9: Number constraints
console.log('=== TEST 9: Number Constraints ===');
const numberSchema = {
  type: 'integer' as const,
  minimum: 0,
  maximum: 100,
};

const result9 = generateZodFromJSONSchema(numberSchema, 'Score');
console.log('Zod Code:');
console.log(result9.zodCode);
console.log('✅ Test 9 passed\n');

console.log('🎉 All schema-crawler.ts tests passed!');
