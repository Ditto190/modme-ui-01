#!/usr/bin/env node
/**
 * Fetch and convert skills from anthropics/skills repository
 * 
 * This script directly downloads skills from the specified branches
 * and converts them to the local agent-generator format.
 * 
 * Usage:
 *   node fetch-anthropic-skills.js [branch]
 * 
 * Branches:
 *   - klazuka/expor (default)
 *   - ba8e7042a9d6b788772cf409c0f421ca81244072
 *   - main
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const REPO_OWNER = 'anthropics';
const REPO_NAME = 'skills';
const DEFAULT_BRANCH = 'main';
const OUTPUT_DIR = path.join(__dirname, '../../agent-generator/src/skills');

// List of skills to download
const SKILLS_TO_FETCH = [
  'skill-creator',
  'pdf',
  'docx',
  'pptx',
  'xlsx',
  'mcp-builder',
  'theme-factory',
  'web-artifacts-builder',
  'algorithmic-art',
  'brand-guidelines',
  'internal-comms'
];

/**
 * Fetch content from GitHub raw URL
 */
async function fetchGitHubContent(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'ModMe-Skills-Fetcher',
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`
        })
      }
    }, (res) => {
      let data = '';
      
      if (res.statusCode === 404) {
        reject(new Error(`Not found: ${url}`));
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * List directory contents from GitHub API
 */
async function listGitHubDirectory(owner, repo, path, branch) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    
    https.get(apiUrl, {
      headers: {
        'User-Agent': 'ModMe-Skills-Fetcher',
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`
        })
      }
    }, (res) => {
      let data = '';
      
      if (res.statusCode === 404) {
        resolve([]); // Directory doesn't exist
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${apiUrl}`));
        return;
      }
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Convert Anthropic skill format to local format
 */
function convertSkillContent(skillMdContent, skillName) {
  // Extract frontmatter
  const frontmatterMatch = skillMdContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!frontmatterMatch) {
    console.warn(`⚠️  No frontmatter found in ${skillName}, using raw content`);
    return skillMdContent;
  }
  
  const [, frontmatter, body] = frontmatterMatch;
  
  // Parse frontmatter to extract description
  const descriptionMatch = frontmatter.match(/description:\s*["']?(.*?)["']?\n/s);
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';
  
  // Create title from skill name
  const titleWords = skillName.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  );
  const title = titleWords.join(' ');
  
  // Build converted content
  let converted = `# ${title} Skill\n\n`;
  
  // Add capabilities from description
  converted += `## Capabilities\n\n`;
  if (description) {
    // Split description into sentences for capabilities
    const sentences = description.split(/\.\s+/).filter(s => s.trim());
    sentences.slice(0, 3).forEach(sentence => {
      converted += `- ${sentence.trim()}${sentence.endsWith('.') ? '' : '.'}\n`;
    });
  } else {
    converted += `- Specialized functionality for ${skillName}\n`;
  }
  
  converted += `\n## Usage Instructions\n\n`;
  converted += body.trim();
  
  converted += `\n\n---\n\n## Source\n\n`;
  converted += `This skill was converted from the [Anthropic skills repository](https://github.com/${REPO_OWNER}/${REPO_NAME}).\n\n`;
  converted += `**Original description**: ${description || 'N/A'}\n`;
  
  return converted;
}

/**
 * Fetch a single skill from GitHub
 */
async function fetchSkill(skillName, branch) {
  console.log(`\n📥 Fetching ${skillName} from ${branch}...`);
  
  const skillPath = `skills/${skillName}`;
  const rawBaseUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${branch}`;
  
  try {
    // Fetch SKILL.md
    const skillMdUrl = `${rawBaseUrl}/${skillPath}/SKILL.md`;
    console.log(`   Downloading SKILL.md...`);
    const skillMdContent = await fetchGitHubContent(skillMdUrl);
    
    // Convert to local format
    const convertedContent = convertSkillContent(skillMdContent, skillName);
    
    // Create output directory
    const outputSkillDir = path.join(OUTPUT_DIR, skillName);
    await fs.mkdir(outputSkillDir, { recursive: true });
    
    // Write SKILL.md
    const outputSkillMd = path.join(outputSkillDir, 'SKILL.md');
    await fs.writeFile(outputSkillMd, convertedContent, 'utf8');
    console.log(`   ✅ Saved SKILL.md`);
    
    // Try to fetch bundled resources
    const resources = ['scripts', 'references', 'assets'];
    
    for (const resourceType of resources) {
      try {
        const dirContents = await listGitHubDirectory(
          REPO_OWNER,
          REPO_NAME,
          `${skillPath}/${resourceType}`,
          branch
        );
        
        if (dirContents.length > 0) {
          console.log(`   📁 Found ${resourceType}/ (${dirContents.length} files)`);
          
          const resourceDir = path.join(outputSkillDir, resourceType);
          await fs.mkdir(resourceDir, { recursive: true });
          
          // Fetch up to 5 files from each resource type (for speed)
          const filesToFetch = dirContents.filter(f => f.type === 'file').slice(0, 5);
          
          for (const file of filesToFetch) {
            try {
              const content = await fetchGitHubContent(file.download_url);
              const outputFile = path.join(resourceDir, file.name);
              await fs.writeFile(outputFile, content, 'utf8');
              console.log(`      ✅ ${file.name}`);
            } catch (err) {
              console.log(`      ⚠️  Failed to fetch ${file.name}: ${err.message}`);
            }
          }
          
          if (dirContents.length > 5) {
            console.log(`      ℹ️  (${dirContents.length - 5} more files not fetched for speed)`);
          }
        }
      } catch (err) {
        // Resource directory doesn't exist or is empty
      }
    }
    
    console.log(`   ✅ Skill ${skillName} fetched successfully`);
    return { skill: skillName, status: 'success' };
    
  } catch (err) {
    console.error(`   ❌ Failed to fetch ${skillName}: ${err.message}`);
    return { skill: skillName, status: 'failed', error: err.message };
  }
}

/**
 * Main execution
 */
async function main() {
  const branch = process.argv[2] || DEFAULT_BRANCH;
  
  console.log(`🚀 Fetching Anthropic skills from ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`   Branch: ${branch}`);
  console.log(`   Output: ${OUTPUT_DIR}`);
  console.log(`   Skills: ${SKILLS_TO_FETCH.length} total`);
  
  if (process.env.GITHUB_TOKEN) {
    console.log(`   🔑 Using GitHub token (authenticated)`);
  } else {
    console.log(`   ⚠️  No GITHUB_TOKEN set (rate limits may apply)`);
  }
  
  // Create output directory
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  
  // Fetch all skills
  const results = [];
  for (const skillName of SKILLS_TO_FETCH) {
    const result = await fetchSkill(skillName, branch);
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${results.filter(r => r.status === 'success').length}`);
  console.log(`   ❌ Failed: ${results.filter(r => r.status === 'failed').length}`);
  
  if (results.some(r => r.status === 'failed')) {
    console.log(`\n❌ Failed skills:`);
    results.filter(r => r.status === 'failed').forEach(r => {
      console.log(`   - ${r.skill}: ${r.error}`);
    });
  }
  
  console.log(`\n✨ Done! Skills saved to: ${OUTPUT_DIR}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Validate skills: npm run skills:validate`);
  console.log(`   2. Review converted SKILL.md files`);
  console.log(`   3. Test skills with your agent`);
}

// Run
main().catch(err => {
  console.error(`\n💥 Fatal error: ${err.message}`);
  process.exit(1);
});
