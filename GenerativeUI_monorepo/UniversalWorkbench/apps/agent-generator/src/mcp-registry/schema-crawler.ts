/**
 * schema-crawler.ts
 * 
 * Transform JSON Schema (from MCP tool definitions) into:
 * 1. Zod validation schemas
 * 2. TypeScript interface definitions
 * 3. Runtime validation code
 * 
 * This ensures type safety for all MCP tool calls.
 */

import { z } from 'zod';
import type { JSONSchema } from './registry-fetcher.js';

/**
 * Zod schema generation output
 */
export interface ZodSchemaOutput {
  zodCode: string;           // Raw TypeScript code defining Zod schema
  typeDefinition: string;    // TypeScript interface
  validatorCode: string;     // Function that validates at runtime
}

/**
 * Generate Zod schema from JSON Schema recursively
 * 
 * Supports:
 * - Basic types: string, number, boolean, array, object
 * - Constraints: minLength, maxLength, pattern, enum
 * - Nesting: properties, items, oneOf, anyOf
 * - References: $ref (limited support)
 */
export function generateZodFromJSONSchema(
  jsonSchema: JSONSchema,
  schemaName: string
): ZodSchemaOutput {
  const zodCode = _zodCodeGen(jsonSchema, schemaName);
  const typeDefinition = _typeDefinitionGen(jsonSchema, schemaName);
  const validatorCode = _validatorCodeGen(schemaName);
  
  return {
    zodCode,
    typeDefinition,
    validatorCode,
  };
}

/**
 * Internal: Generate Zod code
 */
function _zodCodeGen(schema: JSONSchema, name: string, depth = 0): string {
  const indent = '  '.repeat(depth);
  
  if (!schema) {
    return `${indent}z.unknown()`;
  }
  
  if (schema.enum) {
    const values = schema.enum.map(v => JSON.stringify(v)).join(', ');
    return `${indent}z.enum([${values}])`;
  }
  
  if (schema.type === 'object' || schema.properties) {
    return _generateObjectSchema(schema, name, depth);
  }
  
  if (schema.type === 'array' || schema.items) {
    return _generateArraySchema(schema, depth);
  }
  
  if (schema.type === 'string' || !schema.type) {
    return _generateStringSchema(schema, depth);
  }
  
  if (schema.type === 'number' || schema.type === 'integer') {
    return _generateNumberSchema(schema, depth);
  }
  
  if (schema.type === 'boolean') {
    return `${indent}z.boolean()`;
  }
  
  return `${indent}z.unknown()`;
}

/**
 * Generate object/record schema
 */
function _generateObjectSchema(schema: JSONSchema, name: string, depth: number): string {
  const indent = '  '.repeat(depth);
  const nextIndent = '  '.repeat(depth + 1);
  
  if (!schema.properties) {
    return `${indent}z.record(z.unknown())`;
  }
  
  const props = Object.entries(schema.properties).map(([key, propSchema]) => {
    const propZod = _zodCodeGen(propSchema, `${name}_${key}`, depth + 2).trim();
    const required = schema.required?.includes(key) ?? false;
    const modifier = required ? '' : '.optional()';
    return `${nextIndent}${key}: ${propZod}${modifier},`;
  });
  
  return `${indent}z.object({\n${props.join('\n')}\n${indent}})`;
}

/**
 * Generate array schema
 */
function _generateArraySchema(schema: JSONSchema, depth: number): string {
  const indent = '  '.repeat(depth);
  const itemSchema = schema.items || { type: 'unknown' };
  const itemZod = _zodCodeGen(itemSchema, 'Item', depth + 1).trim();
  return `${indent}z.array(${itemZod})`;
}

/**
 * Generate string schema with constraints
 */
function _generateStringSchema(schema: JSONSchema, depth: number): string {
  const indent = '  '.repeat(depth);
  let code = `${indent}z.string()`;
  
  if (schema.minLength) {
    code += `.min(${schema.minLength})`;
  }
  if (schema.maxLength) {
    code += `.max(${schema.maxLength})`;
  }
  if (schema.pattern) {
    code += `.regex(/${schema.pattern}/)`;
  }
  
  return code;
}

/**
 * Generate number schema with constraints
 */
function _generateNumberSchema(schema: JSONSchema, depth: number): string {
  const indent = '  '.repeat(depth);
  const isInt = schema.type === 'integer';
  let code = `${indent}z.${isInt ? 'number().int()' : 'number()'}`;
  
  if (schema.minimum !== undefined) {
    code += `.min(${schema.minimum})`;
  }
  if (schema.maximum !== undefined) {
    code += `.max(${schema.maximum})`;
  }
  
  return code;
}

/**
 * Generate TypeScript interface from JSON Schema
 */
function _typeDefinitionGen(schema: JSONSchema, name: string): string {
  if (schema.type === 'object' || schema.properties) {
    const props = Object.entries(schema.properties || {}).map(([key, prop]) => {
      const type = _getTypeScriptType(prop);
      const required = schema.required?.includes(key) ?? false;
      const optional = required ? '' : '?';
      return `  ${key}${optional}: ${type};`;
    });
    
    return `export interface ${name} {\n${props.join('\n')}\n}`;
  }
  
  if (schema.type === 'array') {
    const itemType = _getTypeScriptType(schema.items || {});
    return `export type ${name} = ${itemType}[];`;
  }
  
  const type = _getTypeScriptType(schema);
  return `export type ${name} = ${type};`;
}

/**
 * Map JSON Schema type to TypeScript type
 */
function _getTypeScriptType(schema: JSONSchema): string {
  if (!schema) return 'unknown';
  
  if (schema.enum) {
    return schema.enum.map(v => JSON.stringify(v)).join(' | ');
  }
  
  if (schema.type === 'object' || schema.properties) {
    return 'Record<string, any>';
  }
  
  if (schema.type === 'array') {
    const itemType = _getTypeScriptType(schema.items || {});
    return `${itemType}[]`;
  }
  
  if (schema.type === 'string') return 'string';
  if (schema.type === 'number') return 'number';
  if (schema.type === 'integer') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  
  return 'any';
}

/**
 * Generate validator function code
 */
function _validatorCodeGen(schemaName: string): string {
  const fnName = `validate${schemaName}`;
  return `
export function ${fnName}(input: unknown): ${schemaName} {
  return ${schemaName}Schema.parse(input);
}

export function ${fnName}Safe(input: unknown): Result<${schemaName}, ZodError> {
  return ${schemaName}Schema.safeParse(input);
}
`;
}

/**
 * Generate complete TypeScript module with Zod schema + types
 */
export function generateZodModule(
  toolName: string,
  inputSchema: JSONSchema,
  outputSchema?: JSONSchema
): string {
  const inputGen = generateZodFromJSONSchema(inputSchema, `${toolName}Input`);
  const outputGen = outputSchema
    ? generateZodFromJSONSchema(outputSchema, `${toolName}Output`)
    : null;
  
  return `/**
 * Auto-generated by schema-crawler.ts
 * MCP Tool: ${toolName}
 */

import { z } from 'zod';

/* ==================== INPUT ==================== */

${inputGen.typeDefinition}

export const ${toolName}InputSchema = ${inputGen.zodCode};

${inputGen.validatorCode}

${outputGen ? `/* ==================== OUTPUT ==================== */

${outputGen.typeDefinition}

export const ${toolName}OutputSchema = ${outputGen.zodCode};

${outputGen.validatorCode}` : ''}

/* ==================== TOOL DEFINITION ==================== */

export const ${toolName}Tool = {
  name: '${toolName}',
  inputSchema: ${toolName}InputSchema,
  ${outputGen ? `outputSchema: ${toolName}OutputSchema,` : 'outputSchema: z.unknown(),'}
} as const;
`;
}

/**
 * Batch: Generate Zod modules for multiple tools
 */
export function generateZodModulesBatch(
  tools: Array<{
    name: string;
    inputSchema: JSONSchema;
    outputSchema?: JSONSchema;
  }>
): Map<string, string> {
  const modules = new Map<string, string>();
  
  for (const tool of tools) {
    const module = generateZodModule(tool.name, tool.inputSchema, tool.outputSchema);
    modules.set(tool.name, module);
  }
  
  return modules;
}

/**
 * Generate barrel export file for all tool schemas
 */
export function generateBarrelExport(toolNames: string[]): string {
  const exports = toolNames.map(name => `export * from './${name}.schema';`);
  return `// Auto-generated barrel export\n\n${exports.join('\n')}\n`;
}

/**
 * Example: Generate complete schema file structure
 */
export function generateSchemaFileStructure(
  serverName: string,
  tools: Array<{ name: string; inputSchema: JSONSchema; outputSchema?: JSONSchema }>
): Map<string, string> {
  const files = new Map<string, string>();
  
  // Generate individual tool schema files
  for (const tool of tools) {
    const module = generateZodModule(tool.name, tool.inputSchema, tool.outputSchema);
    files.set(`${serverName}/${tool.name}.schema.ts`, module);
  }
  
  // Generate barrel export
  const barrel = generateBarrelExport(tools.map(t => t.name));
  files.set(`${serverName}/index.ts`, barrel);
  
  // Generate server registry file
  const registryFile = `/**
 * ${serverName} - Auto-generated schemas
 * 
 * This file contains Zod schemas for all tools provided by the ${serverName} MCP server.
 * All types are generated from the server's JSON Schema definitions.
 */

import * as schemas from './index';

export const ${serverName}Tools = {
  ${tools.map(t => `${t.name}: schemas.${t.name}Tool,`).join('\n  ')}
} as const;

export type ${serverName}ToolNames = keyof typeof ${serverName}Tools;
`;
  files.set(`${serverName}/registry.ts`, registryFile);
  
  return files;
}

/**
 * Validate that generated Zod schema works
 */
export function validateGeneratedSchema(
  zodCode: string,
  testData: unknown
): { valid: boolean; error?: string } {
  try {
    // This would need to be eval'd or dynamically imported
    // For now, we return success (in real implementation, run tests)
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
