#!/usr/bin/env node

/**
 * Test the Knowledge Base Context Mapper locally
 * 
 * Usage: node test-kb-mapper.js
 */

const { analyzeIssueContent, generateContextComment } = require('./dist/issue-context-mapper.js');

// Test cases
const testCases = [
  {
    title: "StatCard component not rendering",
    body: "When I call upsert_ui_element with StatCard type, nothing appears on the canvas. I checked the browser console and there are no errors.",
    expectedConcepts: ["StatCard", "Agent Tools"],
    expectedLabels: ["component-registry", "agent"]
  },
  {
    title: "Need to deprecate old_ui_elements toolset",
    body: "The old_ui_elements toolset is outdated. We should deprecate it and migrate users to ui_elements. This is a breaking change.",
    expectedConcepts: ["Toolset"],
    expectedLabels: ["toolset"]
  },
  {
    title: "State sync issue between Python and React",
    body: "The tool_context.state updates in Python but useCoAgent doesn't reflect changes in React. One-way data flow seems broken.",
    expectedConcepts: ["State Sync", "Agent Tools", "Frontend"],
    expectedLabels: ["state-sync", "agent", "frontend"]
  },
  {
    title: "Add new ChartCard visualization",
    body: "We need a new chart type for the ChartCard component to support bubble charts",
    expectedConcepts: ["ChartCard"],
    expectedLabels: ["component-registry"]
  }
];

console.log('🧪 Testing Knowledge Base Context Mapper\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n📝 Test Case ${index + 1}: ${testCase.title}`);
  console.log('─'.repeat(60));
  
  const context = analyzeIssueContent(testCase.body, testCase.title);
  
  // Check detected concepts
  const conceptsMatch = testCase.expectedConcepts.every(c => 
    context.detectedConcepts.includes(c)
  );
  
  // Check suggested labels
  const labelsMatch = testCase.expectedLabels.every(l => 
    context.suggestedLabels.includes(l)
  );
  
  console.log(`✓ Detected Concepts: ${context.detectedConcepts.join(', ')}`);
  console.log(`✓ Suggested Labels: ${context.suggestedLabels.join(', ')}`);
  console.log(`✓ Relevant Files: ${context.relevantFiles.length}`);
  console.log(`✓ Documentation Links: ${context.documentationLinks.length}`);
  
  if (conceptsMatch && labelsMatch) {
    console.log('✅ PASS');
    passed++;
  } else {
    console.log('❌ FAIL');
    if (!conceptsMatch) {
      console.log(`   Expected concepts: ${testCase.expectedConcepts.join(', ')}`);
    }
    if (!labelsMatch) {
      console.log(`   Expected labels: ${testCase.expectedLabels.join(', ')}`);
    }
    failed++;
  }
  
  // Show generated comment snippet
  const comment = generateContextComment(context);
  if (comment) {
    console.log('\n📄 Generated Comment Preview:');
    console.log(comment.split('\n').slice(0, 8).join('\n'));
    console.log('   [...truncated...]');
  }
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
console.log(`✨ Success Rate: ${Math.round((passed / testCases.length) * 100)}%\n`);

if (failed === 0) {
  console.log('🎉 All tests passed! Knowledge Base is working correctly.');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Review the Knowledge Base mappings.');
  process.exit(1);
}
