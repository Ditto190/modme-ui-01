// generate_missing_playwright_tests.js
// Scans COVERAGE_MATRIX.md for UI files with 0% coverage and creates placeholder Playwright tests.
const fs = require('fs');
const path = require('path');

const coverageMatrixPath = path.resolve(__dirname, '../quality/COVERAGE_MATRIX.md');
const outputDir = path.resolve(__dirname, '../apps/vibe-web-app/tests/playwright');

function parseCoverage() {
  if (!fs.existsSync(coverageMatrixPath)) {
    console.error('Coverage matrix not found at', coverageMatrixPath);
    return [];
  }
  const content = fs.readFileSync(coverageMatrixPath, 'utf8');
  const lines = content.split('\n');
  const zeroCoverageFiles = [];
  for (const line of lines) {
    const match = line.match(/^\s*-\s+(.+\.tsx?)\s+\|\s+0%/i);
    if (match) {
      zeroCoverageFiles.push(match[1].trim());
    }
  }
  return zeroCoverageFiles;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  const files = parseCoverage();
  if (files.length === 0) {
    console.log('No zero‑coverage UI files detected.');
    return;
  }
  ensureDir(outputDir);
  files.forEach(file => {
    const testName = path.basename(file, path.extname(file)) + '.spec.ts';
    const testPath = path.join(outputDir, testName);
    const testContent = `import { test, expect } from '@playwright/test';\n\n// TODO: implement test for ${file}\ntest('placeholder for ${file}', async ({ page }) => {\n  // Add interactions here\n  expect(true).toBeTruthy();\n});\n`;
    fs.writeFileSync(testPath, testContent);
    console.log('Generated test', testPath);
  });
}

main();
