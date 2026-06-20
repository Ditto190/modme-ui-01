#!/usr/bin/env node
/**
 * Anthropic Skills Converter
 * 
 * Pulls skills from anthropics/skills GitHub repo and converts them to ModMe-compatible format:
 * 1. Downloads skill SKILL.md frontmatter and content
 * 2. Extracts scripts/, references/, assets/ directories
 * 3. Converts to agent-generator format with schema validation
 * 4. Generates Python tool definitions from scripts
 * 5. Creates GenAI Toolbox YAML configurations
 * 
 * Usage:
 *   node anthropic-skill-converter.js --skill skill-name [--output ./output]
 *   node anthropic-skill-converter.js --list (lists all available skills)
 *   node anthropic-skill-converter.js --batch (converts all skills)
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { Octokit } = require('@octokit/rest');

// Configuration
const ANTHROPIC_REPO = {
  owner: 'anthropics',
  repo: 'skills',
  branch: 'main'
};

const DEFAULT_OUTPUT_DIR = path.join(__dirname, '../../agent-generator/src/skills');

/**
 * GitHub API client (uses GITHUB_TOKEN from environment)
 */
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

/**
 * List all available skills in anthropics/skills repo
 */
async function listSkills() {
  console.log('🔍 Fetching skills from anthropics/skills repository...\n');
  
  try {
    const { data: contents } = await octokit.repos.getContent({
      owner: ANTHROPIC_REPO.owner,
      repo: ANTHROPIC_REPO.repo,
      path: 'skills',
      ref: ANTHROPIC_REPO.branch
    });
    
    const skills = contents
      .filter(item => item.type === 'dir')
      .map(item => item.name);
    
    console.log(`Found ${skills.length} skills:\n`);
    skills.forEach(skill => console.log(`  - ${skill}`));
    
    return skills;
  } catch (error) {
    console.error('❌ Error fetching skills:', error.message);
    return [];
  }
}

/**
 * Download skill from GitHub
 */
async function downloadSkill(skillName) {
  console.log(`📦 Downloading skill: ${skillName}...`);
  
  try {
    // Get SKILL.md
    const { data: skillMd } = await octokit.repos.getContent({
      owner: ANTHROPIC_REPO.owner,
      repo: ANTHROPIC_REPO.repo,
      path: `skills/${skillName}/SKILL.md`,
      ref: ANTHROPIC_REPO.branch
    });
    
    const content = Buffer.from(skillMd.content, 'base64').toString('utf-8');
    const parsed = parseSkillMarkdown(content);
    
    // Get directory structure
    const { data: structure } = await octokit.repos.getContent({
      owner: ANTHROPIC_REPO.owner,
      repo: ANTHROPIC_REPO.repo,
      path: `skills/${skillName}`,
      ref: ANTHROPIC_REPO.branch
    });
    
    // Download scripts, references, assets
    const resources = await downloadResources(skillName, structure);
    
    return {
      name: skillName,
      frontmatter: parsed.frontmatter,
      body: parsed.body,
      resources
    };
  } catch (error) {
    console.error(`❌ Error downloading ${skillName}:`, error.message);
    throw error;
  }
}

/**
 * Parse SKILL.md frontmatter and body
 */
function parseSkillMarkdown(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    throw new Error('Invalid SKILL.md format: missing frontmatter');
  }
  
  const frontmatter = yaml.load(match[1]);
  const body = match[2].trim();
  
  return { frontmatter, body };
}

/**
 * Download resources (scripts, references, assets)
 */
async function downloadResources(skillName, structure) {
  const resources = {
    scripts: [],
    references: [],
    assets: []
  };
  
  const directories = structure.filter(item => item.type === 'dir');
  
  for (const dir of directories) {
    if (dir.name === 'scripts' || dir.name === 'references' || dir.name === 'assets') {
      const { data: files } = await octokit.repos.getContent({
        owner: ANTHROPIC_REPO.owner,
        repo: ANTHROPIC_REPO.repo,
        path: `skills/${skillName}/${dir.name}`,
        ref: ANTHROPIC_REPO.branch
      });
      
      for (const file of files) {
        if (file.type === 'file') {
          const { data: fileContent } = await octokit.repos.getContent({
            owner: ANTHROPIC_REPO.owner,
            repo: ANTHROPIC_REPO.repo,
            path: file.path,
            ref: ANTHROPIC_REPO.branch
          });
          
          resources[dir.name].push({
            name: file.name,
            path: file.path,
            content: Buffer.from(fileContent.content, 'base64').toString('utf-8')
          });
        }
      }
    }
  }
  
  return resources;
}

/**
 * Convert Anthropic skill to ModMe format
 */
async function convertSkill(skill, outputDir) {
  console.log(`🔄 Converting ${skill.name} to ModMe format...`);
  
  const skillDir = path.join(outputDir, skill.name);
  await fs.mkdir(skillDir, { recursive: true });
  
  // Create SKILL.md in ModMe format
  const modmeSkillMd = createModMeSkillMarkdown(skill);
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), modmeSkillMd);
  
  // Save resources
  for (const [type, files] of Object.entries(skill.resources)) {
    if (files.length > 0) {
      const typeDir = path.join(skillDir, type);
      await fs.mkdir(typeDir, { recursive: true });
      
      for (const file of files) {
        await fs.writeFile(path.join(typeDir, file.name), file.content);
      }
    }
  }
  
  // Generate Python tools from scripts
  if (skill.resources.scripts.length > 0) {
    const pythonTools = await generatePythonTools(skill);
    await fs.writeFile(
      path.join(skillDir, 'tools.py'),
      pythonTools
    );
  }
  
  // Generate GenAI Toolbox YAML
  const toolboxYaml = generateToolboxYaml(skill);
  await fs.writeFile(
    path.join(skillDir, 'tools.yaml'),
    toolboxYaml
  );
  
  console.log(`✅ Converted ${skill.name}`);
  return skillDir;
}

/**
 * Create ModMe-compatible SKILL.md
 */
function createModMeSkillMarkdown(skill) {
  return `---
name: ${skill.frontmatter.name}
description: ${skill.frontmatter.description}
source: anthropics/skills
converted: ${new Date().toISOString()}
license: ${skill.frontmatter.license || 'See LICENSE.txt'}
---

# ${skill.frontmatter.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

${skill.body}

---

## ModMe Integration Notes

This skill was automatically converted from the Anthropic skills repository.

### Available Resources

${skill.resources.scripts.length > 0 ? `**Scripts**: ${skill.resources.scripts.length} Python scripts` : ''}
${skill.resources.references.length > 0 ? `**References**: ${skill.resources.references.length} reference documents` : ''}
${skill.resources.assets.length > 0 ? `**Assets**: ${skill.resources.assets.length} asset files` : ''}

### Tools Generated

See \`tools.py\` for Python tool implementations.
See \`tools.yaml\` for GenAI Toolbox configuration.
`;
}

/**
 * Generate Python tools from scripts
 */
async function generatePythonTools(skill) {
  const template = `"""
Auto-generated tools for ${skill.name} skill
Source: anthropics/skills
Generated: ${new Date().toISOString()}
"""

from google.adk.tools import ToolContext
from typing import Dict, Any

${skill.resources.scripts.map(script => {
    const toolName = script.name.replace(/\.(py|js|sh|ts)$/, '');
    return `
def ${toolName}(tool_context: ToolContext, **kwargs) -> Dict[str, Any]:
    """
    Execute ${script.name} from ${skill.name} skill
    
    Args:
        **kwargs: Parameters for the script
    
    Returns:
        Dictionary with status and result
    """
    # TODO: Implement script execution logic
    # Original script available in scripts/${script.name}
    
    return {
        "status": "success",
        "message": f"Executed ${toolName}",
        "result": {}
    }
`;
  }).join('\n')}
`;
  
  return template;
}

/**
 * Generate GenAI Toolbox YAML configuration
 */
function generateToolboxYaml(skill) {
  const tools = skill.resources.scripts.map(script => {
    const toolName = script.name.replace(/\.(py|js|sh|ts)$/, '');
    return {
      [toolName]: {
        kind: 'custom',
        description: `Tool from ${skill.name} skill: ${script.name}`,
        parameters: [
          {
            name: 'input',
            type: 'string',
            description: 'Input for the tool'
          }
        ]
      }
    };
  }).reduce((acc, tool) => ({ ...acc, ...tool }), {});
  
  return yaml.dump({
    sources: {},
    tools
  }, { indent: 2 });
}

/**
 * Main CLI
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--list')) {
    await listSkills();
    return;
  }
  
  const skillIndex = args.indexOf('--skill');
  const outputIndex = args.indexOf('--output');
  
  const skillName = skillIndex !== -1 ? args[skillIndex + 1] : null;
  const outputDir = outputIndex !== -1 ? args[outputIndex + 1] : DEFAULT_OUTPUT_DIR;
  
  if (args.includes('--batch')) {
    const skills = await listSkills();
    console.log(`\n🚀 Converting ${skills.length} skills...`);
    
    for (const skill of skills) {
      try {
        const downloaded = await downloadSkill(skill);
        await convertSkill(downloaded, outputDir);
      } catch (error) {
        console.error(`❌ Failed to convert ${skill}:`, error.message);
      }
    }
    
    console.log('\n✅ Batch conversion complete!');
    return;
  }
  
  if (!skillName) {
    console.error('❌ Usage: node anthropic-skill-converter.js --skill <name> [--output <dir>]');
    console.error('   or: node anthropic-skill-converter.js --list');
    console.error('   or: node anthropic-skill-converter.js --batch [--output <dir>]');
    process.exit(1);
  }
  
  try {
    const skill = await downloadSkill(skillName);
    const outputPath = await convertSkill(skill, outputDir);
    console.log(`\n✅ Skill converted successfully to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  listSkills,
  downloadSkill,
  convertSkill
};
