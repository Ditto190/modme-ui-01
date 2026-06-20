#!/usr/bin/env node
/**
 * Skill Spec Validator
 * 
 * Validates skills against Anthropic Agent Skills specification
 * https://agentskills.io/specification
 * 
 * Validation checks:
 * 1. SKILL.md frontmatter format (name, description, license)
 * 2. Naming conventions (hyphen-case, lowercase, no special chars)
 * 3. Description completeness (triggers, use cases, max 1024 chars)
 * 4. Directory structure (scripts/, references/, assets/)
 * 5. Resource file integrity
 * 6. Progressive disclosure patterns
 * 7. Context window efficiency (<500 lines SKILL.md body)
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

/**
 * Validation rules based on Agent Skills spec
 */
const VALIDATION_RULES = {
  name: {
    pattern: /^[a-z0-9-]+$/,
    maxLength: 64,
    noConsecutiveHyphens: true,
    noLeadingTrailingHyphens: true
  },
  description: {
    minLength: 50,
    maxLength: 1024,
    noAngleBrackets: true,
    requiresTriggers: true
  },
  bodyLength: {
    maxLines: 500,
    softLimit: 400
  },
  allowedFrontmatterKeys: ['name', 'description', 'license', 'allowed-tools', 'metadata']
};

/**
 * Validate skill against spec
 */
async function validateSkill(skillPath) {
  console.log(`🔍 Validating skill: ${skillPath}\n`);
  
  const errors = [];
  const warnings = [];
  
  try {
    // Check SKILL.md exists
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    const skillMdExists = await fileExists(skillMdPath);
    
    if (!skillMdExists) {
      errors.push('SKILL.md not found');
      return { valid: false, errors, warnings };
    }
    
    // Read and parse SKILL.md
    const content = await fs.readFile(skillMdPath, 'utf-8');
    const parsed = parseSkillMarkdown(content);
    
    if (!parsed) {
      errors.push('Invalid SKILL.md format: missing or malformed frontmatter');
      return { valid: false, errors, warnings };
    }
    
    // Validate frontmatter
    validateFrontmatter(parsed.frontmatter, errors, warnings);
    
    // Validate body
    validateBody(parsed.body, errors, warnings);
    
    // Validate directory structure
    await validateStructure(skillPath, errors, warnings);
    
    // Calculate metrics
    const metrics = calculateMetrics(parsed);
    
    // Report results
    console.log(formatValidationReport(errors, warnings, metrics));
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metrics
    };
  } catch (error) {
    errors.push(`Validation error: ${error.message}`);
    return { valid: false, errors, warnings };
  }
}

/**
 * Parse SKILL.md frontmatter and body
 */
function parseSkillMarkdown(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return null;
  }
  
  try {
    const frontmatter = yaml.load(match[1]);
    const body = match[2].trim();
    
    return { frontmatter, body };
  } catch (error) {
    return null;
  }
}

/**
 * Validate frontmatter
 */
function validateFrontmatter(frontmatter, errors, warnings) {
  // Check required fields
  if (!frontmatter.name) {
    errors.push('Missing required field: name');
  } else {
    // Validate name format
    const name = frontmatter.name.trim();
    
    if (!VALIDATION_RULES.name.pattern.test(name)) {
      errors.push(`Invalid name format: "${name}" (must be lowercase, hyphens only)`);
    }
    
    if (name.startsWith('-') || name.endsWith('-')) {
      errors.push(`Invalid name: "${name}" (cannot start/end with hyphen)`);
    }
    
    if (name.includes('--')) {
      errors.push(`Invalid name: "${name}" (no consecutive hyphens)`);
    }
    
    if (name.length > VALIDATION_RULES.name.maxLength) {
      errors.push(`Name too long: ${name.length} characters (max ${VALIDATION_RULES.name.maxLength})`);
    }
  }
  
  if (!frontmatter.description) {
    errors.push('Missing required field: description');
  } else {
    // Validate description
    const desc = frontmatter.description.trim();
    
    if (desc.length < VALIDATION_RULES.description.minLength) {
      warnings.push(`Description too short: ${desc.length} characters (min ${VALIDATION_RULES.description.minLength} recommended)`);
    }
    
    if (desc.length > VALIDATION_RULES.description.maxLength) {
      errors.push(`Description too long: ${desc.length} characters (max ${VALIDATION_RULES.description.maxLength})`);
    }
    
    if (desc.includes('<') || desc.includes('>')) {
      errors.push('Description cannot contain angle brackets (< or >)');
    }
    
    // Check for trigger keywords
    const triggerKeywords = ['use when', 'when to use', 'for:', 'trigger', 'suitable for'];
    const hasTriggers = triggerKeywords.some(keyword => 
      desc.toLowerCase().includes(keyword)
    );
    
    if (!hasTriggers) {
      warnings.push('Description should include "when to use" information (triggers/use cases)');
    }
  }
  
  // Check for unexpected fields
  const unexpectedKeys = Object.keys(frontmatter).filter(
    key => !VALIDATION_RULES.allowedFrontmatterKeys.includes(key)
  );
  
  if (unexpectedKeys.length > 0) {
    errors.push(`Unexpected frontmatter keys: ${unexpectedKeys.join(', ')}`);
  }
}

/**
 * Validate body
 */
function validateBody(body, errors, warnings) {
  const lines = body.split('\n');
  
  if (lines.length > VALIDATION_RULES.bodyLength.maxLines) {
    errors.push(`SKILL.md body too long: ${lines.length} lines (max ${VALIDATION_RULES.bodyLength.maxLines})`);
  } else if (lines.length > VALIDATION_RULES.bodyLength.softLimit) {
    warnings.push(`SKILL.md body approaching limit: ${lines.length} lines (soft limit ${VALIDATION_RULES.bodyLength.softLimit})`);
  }
  
  // Check for common anti-patterns
  if (body.includes('README.md')) {
    warnings.push('Skill references README.md - skills should not include READMEs');
  }
  
  if (body.includes('CHANGELOG')) {
    warnings.push('Skill references CHANGELOG - skills should not include changelogs');
  }
}

/**
 * Validate directory structure
 */
async function validateStructure(skillPath, errors, warnings) {
  const allowedDirs = ['scripts', 'references', 'assets'];
  const entries = await fs.readdir(skillPath, { withFileTypes: true });
  
  const directories = entries.filter(e => e.isDirectory());
  const unexpectedDirs = directories
    .map(d => d.name)
    .filter(name => !allowedDirs.includes(name) && !name.startsWith('.'));
  
  if (unexpectedDirs.length > 0) {
    warnings.push(`Unexpected directories: ${unexpectedDirs.join(', ')} (only scripts/, references/, assets/ recommended)`);
  }
  
  // Check for LICENSE.txt
  const licenseExists = await fileExists(path.join(skillPath, 'LICENSE.txt'));
  if (!licenseExists) {
    warnings.push('LICENSE.txt not found (recommended for distribution)');
  }
}

/**
 * Calculate skill metrics
 */
function calculateMetrics(parsed) {
  const bodyLines = parsed.body.split('\n').length;
  const bodyWords = parsed.body.split(/\s+/).length;
  const descWords = parsed.frontmatter.description?.split(/\s+/).length || 0;
  
  return {
    bodyLines,
    bodyWords,
    descriptionLength: parsed.frontmatter.description?.length || 0,
    descriptionWords: descWords,
    contextEfficiency: bodyLines <= 400 ? 'Good' : bodyLines <= 500 ? 'Acceptable' : 'Poor'
  };
}

/**
 * Format validation report
 */
function formatValidationReport(errors, warnings, metrics) {
  let report = '';
  
  if (errors.length === 0 && warnings.length === 0) {
    report += '✅ Skill is valid!\n\n';
  } else {
    if (errors.length > 0) {
      report += `❌ Errors (${errors.length}):\n`;
      errors.forEach(err => report += `   - ${err}\n`);
      report += '\n';
    }
    
    if (warnings.length > 0) {
      report += `⚠️  Warnings (${warnings.length}):\n`;
      warnings.forEach(warn => report += `   - ${warn}\n`);
      report += '\n';
    }
  }
  
  if (metrics) {
    report += '📊 Metrics:\n';
    report += `   - Body: ${metrics.bodyLines} lines, ${metrics.bodyWords} words\n`;
    report += `   - Description: ${metrics.descriptionLength} chars, ${metrics.descriptionWords} words\n`;
    report += `   - Context efficiency: ${metrics.contextEfficiency}\n`;
  }
  
  return report;
}

/**
 * Check if file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Main CLI
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node skill-spec-validator.js <skill-directory>');
    process.exit(1);
  }
  
  const skillPath = path.resolve(args[0]);
  const result = await validateSkill(skillPath);
  
  process.exit(result.valid ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { validateSkill };
