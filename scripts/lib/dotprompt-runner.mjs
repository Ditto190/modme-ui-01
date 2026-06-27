import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import matter from 'gray-matter';
import Handlebars from 'handlebars';
import { GoogleGenAI } from '@google/genai';

// Clean Gemini API Key if needed
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

export function mapPicoType(picoType) {
  switch (picoType.toLowerCase()) {
    case 'string': return 'STRING';
    case 'number': return 'NUMBER';
    case 'integer': return 'INTEGER';
    case 'boolean': return 'BOOLEAN';
    default: return 'STRING';
  }
}

export function convertPicoschema(schema) {
  if (!schema) return undefined;
  
  // If it's a primitive type already
  if (typeof schema === 'string') {
    return { type: mapPicoType(schema) };
  }

  const properties = {};
  const required = [];
  
  for (const [key, value] of Object.entries(schema)) {
    const isOptional = key.endsWith('?');
    const cleanKey = isOptional ? key.slice(0, -1) : key;
    
    if (!isOptional) {
      required.push(cleanKey);
    }
    
    properties[cleanKey] = parsePicoField(value);
  }
  
  return {
    type: 'OBJECT',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function parsePicoField(value) {
  if (typeof value === 'object' && value !== null) {
    if (value.type && typeof value.type === 'string') {
      // Already semi-structured
      const res = { type: mapPicoType(value.type) };
      if (value.description) res.description = value.description;
      if (value.items) res.items = parsePicoField(value.items);
      return res;
    }
    return convertPicoschema(value);
  }
  
  if (typeof value !== 'string') {
    return { type: 'STRING' };
  }
  
  const commaIdx = value.indexOf(',');
  const typePart = commaIdx === -1 ? value.trim() : value.slice(0, commaIdx).trim();
  const descPart = commaIdx === -1 ? undefined : value.slice(commaIdx + 1).trim();
  
  let type = 'STRING';
  let items = undefined;
  
  if (typePart.startsWith('array:')) {
    type = 'ARRAY';
    const itemType = typePart.slice(6).trim();
    items = { type: mapPicoType(itemType) };
  } else if (typePart.includes('(array)')) {
    type = 'ARRAY';
    const itemType = typePart.replace('(array)', '').trim();
    items = { type: mapPicoType(itemType) };
  } else {
    type = mapPicoType(typePart);
  }
  
  const res = { type };
  if (items) res.items = items;
  if (descPart) res.description = descPart;
  return res;
}

export class DotPrompt {
  constructor(filePath) {
    this.filePath = filePath;
    const content = readFileSync(filePath, 'utf8');
    const parsed = matter(content);
    
    this.frontmatter = parsed.data || {};
    this.templateSource = parsed.content || '';
    this.template = Handlebars.compile(this.templateSource);
  }

  render(input = {}) {
    return this.template(input);
  }

  async generate(input = {}) {
    const renderedContent = this.render(input);
    const model = this.frontmatter.model?.replace('googleai/', '') || 'gemini-2.5-flash';
    const temperature = this.frontmatter.config?.temperature;
    
    const config = {};
    if (temperature !== undefined) config.temperature = temperature;

    if (this.frontmatter.output) {
      if (this.frontmatter.output.format === 'json') {
        config.responseMimeType = 'application/json';
      }
      if (this.frontmatter.output.schema) {
        config.responseSchema = convertPicoschema(this.frontmatter.output.schema);
      }
    }

    const response = await ai.models.generateContent({
      model,
      contents: renderedContent,
      config,
    });

    const text = response.text;
    if (config.responseMimeType === 'application/json') {
      try {
        return JSON.parse(text);
      } catch (err) {
        throw new Error(`Failed to parse response JSON: ${text}. Error: ${err.message}`);
      }
    }
    return text;
  }
}

export function loadPrompt(promptName, promptsDir = './prompts') {
  const filePaths = [
    resolve(promptsDir, `${promptName}.prompt`),
    resolve(promptsDir, `${promptName}.prompt.md`),
  ];
  for (const fp of filePaths) {
    if (existsSync(fp)) {
      return new DotPrompt(fp);
    }
  }
  throw new Error(`Prompt file not found for name: ${promptName} in ${promptsDir}`);
}
