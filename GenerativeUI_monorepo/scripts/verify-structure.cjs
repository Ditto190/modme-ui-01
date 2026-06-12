#!/usr/bin/env node

/**
 * Verification script to check that the monorepo structure is set up correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Turborepo Monorepo Structure...\n');

let hasErrors = false;

// Check files and directories
const checks = [
  { path: 'turbo.json', type: 'file', description: 'Turborepo config' },
  { path: 'apps', type: 'dir', description: 'Apps directory' },
  { path: 'apps/web-dashboard', type: 'dir', description: 'Web dashboard app' },
  { path: 'apps/web-dashboard/package.json', type: 'file', description: 'Web dashboard package.json' },
  { path: 'apps/web-dashboard/src/components/GenerativeCanvas.tsx', type: 'file', description: 'GenerativeCanvas component' },
  { path: 'apps/web-dashboard/src/hooks/useAgentState.ts', type: 'file', description: 'useAgentState hook' },
  { path: 'apps/agent-server', type: 'dir', description: 'Agent server app' },
  { path: 'apps/agent-server/pyproject.toml', type: 'file', description: 'Agent server pyproject.toml' },
  { path: 'apps/agent-server/requirements.txt', type: 'file', description: 'Agent server requirements.txt' },
  { path: 'apps/agent-server/src/main.py', type: 'file', description: 'Agent server main.py' },
  { path: 'apps/agent-server/src/agents/groupchat.py', type: 'file', description: 'GroupChat implementation' },
  { path: 'apps/agent-server/src/routes/websocket.py', type: 'file', description: 'WebSocket route' },
  { path: 'packages/shared-schemas', type: 'dir', description: 'Shared schemas package' },
  { path: 'packages/shared-schemas/package.json', type: 'file', description: 'Shared schemas package.json' },
  { path: 'packages/shared-schemas/src/index.ts', type: 'file', description: 'Shared schemas source' },
  { path: 'packages/shared-schemas/dist/index.js', type: 'file', description: 'Shared schemas build output' },
  { path: 'README_GENERATIVE_UI.md', type: 'file', description: 'Main documentation' },
];

checks.forEach(({ path: checkPath, type, description }) => {
  const fullPath = path.join(__dirname, '..', checkPath);
  let exists = false;
  
  try {
    const stats = fs.statSync(fullPath);
    if (type === 'file') {
      exists = stats.isFile();
    } else if (type === 'dir') {
      exists = stats.isDirectory();
    }
  } catch (err) {
    exists = false;
  }
  
  if (exists) {
    console.log(`✅ ${description}: ${checkPath}`);
  } else {
    console.log(`❌ ${description}: ${checkPath} NOT FOUND`);
    hasErrors = true;
  }
});

// Check package.json has correct workspaces
console.log('\n📦 Checking package.json workspaces...');
const rootPkgPath = path.join(__dirname, '..', 'package.json');
try {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
  
  if (rootPkg.workspaces && Array.isArray(rootPkg.workspaces)) {
    const hasApps = rootPkg.workspaces.includes('apps/*');
    const hasPackages = rootPkg.workspaces.includes('packages/*');
    
    if (hasApps) {
      console.log('✅ Workspaces includes apps/*');
    } else {
      console.log('❌ Workspaces missing apps/*');
      hasErrors = true;
    }
    
    if (hasPackages) {
      console.log('✅ Workspaces includes packages/*');
    } else {
      console.log('❌ Workspaces missing packages/*');
      hasErrors = true;
    }
  } else {
    console.log('❌ Workspaces not configured correctly');
    hasErrors = true;
  }
  
  // Check for turbo scripts
  if (rootPkg.scripts) {
    const hasBuild = 'build' in rootPkg.scripts;
    const hasDev = 'dev' in rootPkg.scripts;
    
    if (hasBuild) {
      console.log('✅ Build script configured');
    } else {
      console.log('❌ Build script missing');
      hasErrors = true;
    }
    
    if (hasDev) {
      console.log('✅ Dev script configured');
    } else {
      console.log('❌ Dev script missing');
      hasErrors = true;
    }
  }
} catch (err) {
  console.log('❌ Error reading package.json:', err.message);
  hasErrors = true;
}

// Final result
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ Verification FAILED - Some checks did not pass');
  process.exit(1);
} else {
  console.log('✅ Verification PASSED - Monorepo structure is correct!');
  console.log('\nNext steps:');
  console.log('1. Install dependencies: yarn install');
  console.log('2. Build packages: yarn build');
  console.log('3. Start development: yarn dev');
  console.log('\nSee README_GENERATIVE_UI.md for more details.');
  process.exit(0);
}
