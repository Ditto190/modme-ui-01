import { glob } from 'glob';
import * as TJS from 'typescript-json-schema';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../');
const TOOLS_DIR = path.join(ROOT_DIR, 'src/tools');
const SKILLS_DIR = path.join(ROOT_DIR, 'src/skills');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

async function generateToolSchemas() {
  console.log('Generating Tool Schemas...');
  
  const toolFiles = await glob(`${TOOLS_DIR}/**/*.ts`);
  console.log(`Found tool files: ${toolFiles.join(', ')}`);

  const settings: TJS.PartialArgs = {
    required: true,
    ref: false,
  };

  const compilerOptions: TJS.CompilerOptions = {
    strictNullChecks: true,
    skipLibCheck: true,
  };

  // specific extraction of exported interfaces
  const targetSymbols: string[] = [];
  for(const file of toolFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.matchAll(/export interface (\w+)/g);
      for (const match of matches) {
          targetSymbols.push(match[1]);
      }
  }
  console.log(`Target symbols: ${targetSymbols.join(', ')}`);

  const program = TJS.getProgramFromFiles(toolFiles, compilerOptions);
  const generator = TJS.buildGenerator(program, settings);
  
  if (!generator) {
    console.error('Failed to create schema generator');
    return;
  }

  const schemas: Record<string, any> = {};

  for (const symbol of targetSymbols) {
      try {
          const schema = generator.getSchemaForSymbol(symbol);
          if (schema) {
            schemas[symbol] = schema;
            console.log(`  Processed tool: ${symbol}`);
          }
      } catch (e) {
          console.warn(`  Error generating schema for: ${symbol}`, e);
      }
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'tools_schema.json'),
    JSON.stringify(schemas, null, 2)
  );
  console.log(`Saved schemas to ${path.join(OUTPUT_DIR, 'tools_schema.json')}`);
}

async function generateAgentPrompt() {
  console.log('\nGenerating Agent Prompt...');
  
  const skillFiles = await glob(`${SKILLS_DIR}/**/SKILL.md`);
  let skillsXml = '<available_skills>\n';
  
  for (const skillFile of skillFiles) {
    const content = fs.readFileSync(skillFile, 'utf-8');
    const skillName = path.basename(path.dirname(skillFile));
    
    skillsXml += `  <skill>\n`;
    skillsXml += `    <name>${skillName}</name>\n`;
    skillsXml += `    <description>\n${indent(getSkillDescription(content), 6)}\n    </description>\n`;
    skillsXml += `    <instructions>\n${indent(content, 6)}\n    </instructions>\n`;
    skillsXml += `  </skill>\n`;
    console.log(`  Processed skill: ${skillName}`);
  }
  
  skillsXml += '</available_skills>';

  const basePrompt = `# AI Agent System Prompt

You are a helpful AI assistant equipped with specific skills and tools.

${skillsXml}

## Instructions
1. Review the <available_skills> to understand what you can do.
2. If a user request matches a skill's capabilities, follow the instructions in that skill.
3. Use the provided tools when necessary to fulfill requests.
`;

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'agent_prompt.md'),
    basePrompt
  );
  console.log(`Saved prompt to ${path.join(OUTPUT_DIR, 'agent_prompt.md')}`);
}

function getSkillDescription(content: string): string {
    const lines = content.split('\n');
    let description = '';
    for (const line of lines) {
        if (line.trim().length > 0 && !line.startsWith('#')) {
            description = line.trim();
            break;
        }
    }
    return description || 'No description provided.';
}

function indent(text: string, spaces: number): string {
    return text.split('\n').map(line => ' '.repeat(spaces) + line).join('\n');
}

async function main() {
  await generateToolSchemas();
  await generateAgentPrompt();
}

main().catch(console.error);
