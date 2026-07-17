import { describe, it, expect } from 'vitest';
import { convertPicoschema, mapPicoType } from '../lib/dotprompt-runner.mjs';

describe('dotprompt schema converter', () => {
  it('maps primitive types', () => {
    expect(mapPicoType('string')).toBe('STRING');
    expect(mapPicoType('number')).toBe('NUMBER');
    expect(mapPicoType('boolean')).toBe('BOOLEAN');
  });

  it('converts basic picoschema object', () => {
    const inputSchema = {
      title: 'string',
      rating: 'number',
      tags: 'array:string',
      'optionalField?': 'string',
    };

    const converted = convertPicoschema(inputSchema);

    expect(converted.type).toBe('OBJECT');
    expect(converted.properties.title.type).toBe('STRING');
    expect(converted.properties.rating.type).toBe('NUMBER');
    expect(converted.properties.tags.type).toBe('ARRAY');
    expect(converted.properties.tags.items.type).toBe('STRING');
    expect(converted.properties.optionalField.type).toBe('STRING');
    expect(converted.required).toContain('title');
    expect(converted.required).toContain('rating');
    expect(converted.required).toContain('tags');
    expect(converted.required).not.toContain('optionalField');
  });

  it('converts array notation formats', () => {
    const schemaWithPicoArray = {
      tags: 'string(array)',
    };
    const converted = convertPicoschema(schemaWithPicoArray);
    expect(converted.properties.tags.type).toBe('ARRAY');
    expect(converted.properties.tags.items.type).toBe('STRING');
  });

  it('handles field descriptions and sub-objects', () => {
    const inputSchema = {
      category: 'string, one of the allowed categories',
      nested: {
        field: 'string',
      },
    };
    const converted = convertPicoschema(inputSchema);
    expect(converted.properties.category.type).toBe('STRING');
    expect(converted.properties.category.description).toBe('one of the allowed categories');
    expect(converted.properties.nested.type).toBe('OBJECT');
    expect(converted.properties.nested.properties.field.type).toBe('STRING');
  });
});
