"use strict";
/**
 * Issue Context Mapper - Knowledge Base Integration
 *
 * Maps issue content to relevant files, documentation, and related concepts
 * for intelligent auto-tagging and context enrichment.
 *
 * Usage: Called from issue-labeler.yml workflow to add contextual information
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeIssueContent = analyzeIssueContent;
exports.generateContextComment = generateContextComment;
exports.resolveGitHubPath = resolveGitHubPath;
exports.main = main;
/**
 * Knowledge Base: Maps concepts to files and documentation
 */
const KNOWLEDGE_BASE = {
    // Component Registry Concepts
    "StatCard": {
        keywords: ["statcard", "stat card", "metric card", "kpi card"],
        files: [
            {
                path: "src/components/registry/StatCard.tsx",
                description: "StatCard component implementation",
                relatedPaths: [
                    "src/lib/types.ts",
                    "src/app/page.tsx",
                    "agent/main.py"
                ],
                docs: ["docs/REFACTORING_PATTERNS.md#component-registry-refactoring"]
            }
        ],
        documentation: [
            "src/components/registry/README.md",
            ".github/copilot-instructions.md#component-registry-conventions"
        ],
        relatedConcepts: ["DataTable", "ChartCard", "Component Registry"]
    },
    "DataTable": {
        keywords: ["datatable", "data table", "table", "grid"],
        files: [
            {
                path: "src/components/registry/DataTable.tsx",
                description: "DataTable component implementation",
                relatedPaths: [
                    "src/lib/types.ts",
                    "src/app/page.tsx"
                ]
            }
        ],
        documentation: [
            "src/components/registry/README.md"
        ],
        relatedConcepts: ["StatCard", "ChartCard"]
    },
    "ChartCard": {
        keywords: ["chartcard", "chart card", "chart", "visualization"],
        files: [
            {
                path: "src/components/registry/ChartCard.tsx",
                description: "ChartCard component implementation",
                relatedPaths: [
                    "src/lib/types.ts",
                    "src/app/page.tsx"
                ]
            }
        ],
        documentation: [
            "src/components/registry/README.md"
        ],
        relatedConcepts: ["StatCard", "DataTable"]
    },
    // Agent Concepts
    "Agent Tools": {
        keywords: [
            "upsert_ui_element",
            "remove_ui_element",
            "clear_canvas",
            "tool function",
            "tool_context",
            "agent tool",
            "python agent",
            "adk agent"
        ],
        files: [
            {
                path: "agent/main.py",
                description: "Agent tool definitions and lifecycle hooks",
                relatedPaths: [
                    "src/app/api/copilotkit/route.ts",
                    "src/lib/types.ts"
                ],
                docs: ["docs/REFACTORING_PATTERNS.md#python-backend-refactoring"]
            }
        ],
        documentation: [
            ".github/copilot-instructions.md#tool-schema",
            "docs/REFACTORING_PATTERNS.md"
        ],
        relatedConcepts: ["State Sync", "Tool Context", "ADK Agent"]
    },
    "State Sync": {
        keywords: ["state sync", "state synchronization", "tool_context.state", "useCoAgent"],
        files: [
            {
                path: "agent/main.py",
                description: "Python agent state management",
                relatedPaths: [
                    "src/app/page.tsx",
                    "src/lib/types.ts"
                ],
                docs: ["docs/REFACTORING_PATTERNS.md#state-contract-refactoring"]
            },
            {
                path: "src/lib/types.ts",
                description: "TypeScript state contract",
                relatedPaths: [
                    "agent/main.py"
                ]
            }
        ],
        documentation: [
            ".github/copilot-instructions.md#state-contract",
            "docs/REFACTORING_PATTERNS.md#pattern-4-usecoagent-hook-refactoring"
        ],
        relatedConcepts: ["Agent Tools", "Frontend"]
    },
    // Toolset Management
    "Toolset": {
        keywords: ["toolset", "toolsets.json", "toolset_aliases", "deprecation"],
        files: [
            {
                path: "agent/toolsets.json",
                description: "Toolset registry definitions",
                relatedPaths: [
                    "agent/toolset_aliases.json",
                    "agent/toolset_manager.py",
                    "scripts/toolset-management/validate-toolsets.js"
                ],
                docs: ["docs/TOOLSET_MANAGEMENT.md"]
            },
            {
                path: "agent/toolset_aliases.json",
                description: "Toolset deprecation aliases",
                docs: ["docs/TOOLSET_MANAGEMENT.md#deprecating-toolsets"]
            }
        ],
        documentation: [
            "docs/TOOLSET_MANAGEMENT.md",
            "docs/TOOLSET_QUICKSTART.md",
            "TOOLSET_README.md"
        ],
        relatedConcepts: ["Agent Tools", "CI/CD"]
    },
    // Frontend Concepts
    "Frontend": {
        keywords: ["react", "next.js", "copilotkit", "frontend", "ui"],
        files: [
            {
                path: "src/app/page.tsx",
                description: "Main React UI with GenerativeCanvas",
                relatedPaths: [
                    "src/components/registry/",
                    "src/lib/types.ts",
                    "src/app/api/copilotkit/route.ts"
                ]
            },
            {
                path: "src/app/api/copilotkit/route.ts",
                description: "CopilotKit API endpoint",
                relatedPaths: [
                    "agent/main.py"
                ]
            }
        ],
        documentation: [
            ".github/copilot-instructions.md#quick-reference",
            "docs/REFACTORING_PATTERNS.md#typescriptreact-frontend-refactoring"
        ],
        relatedConcepts: ["State Sync", "Component Registry", "Agent Tools"]
    },
    // CI/CD Concepts
    "CI/CD": {
        keywords: ["workflow", "github actions", "ci/cd", "automation"],
        files: [
            {
                path: ".github/workflows/",
                description: "GitHub Actions workflows directory",
                relatedPaths: [
                    ".github/workflows/issue-labeler.yml",
                    ".github/workflows/toolset-validate.yml"
                ]
            }
        ],
        documentation: [
            "docs/TOOLSET_MANAGEMENT.md#workflow-components",
            "CONTRIBUTING.md"
        ],
        relatedConcepts: ["Toolset", "Issue Templates"]
    },
    // Testing
    "Testing": {
        keywords: ["test", "pytest", "jest", "validation"],
        files: [
            {
                path: "tests/",
                description: "Test suite directory",
                relatedPaths: [
                    "agent/main.py",
                    "src/components/"
                ],
                docs: ["docs/REFACTORING_PATTERNS.md#testing-refactoring"]
            }
        ],
        documentation: [
            "docs/REFACTORING_PATTERNS.md#testing-refactoring",
            "CONTRIBUTING.md#testing"
        ],
        relatedConcepts: ["Agent Tools", "Component Registry"]
    }
};
/**
 * Analyzes issue content and returns relevant context
 */
function analyzeIssueContent(issueBody, issueTitle) {
    const combinedText = `${issueTitle.toLowerCase()} ${issueBody.toLowerCase()}`;
    const detectedConcepts = [];
    const relevantFiles = [];
    const documentationLinks = [];
    const suggestedLabels = [];
    // Detect concepts from knowledge base
    for (const [concept, mapping] of Object.entries(KNOWLEDGE_BASE)) {
        const isMatch = mapping.keywords.some(keyword => combinedText.includes(keyword.toLowerCase()));
        if (isMatch) {
            detectedConcepts.push(concept);
            relevantFiles.push(...mapping.files);
            documentationLinks.push(...mapping.documentation);
            // Suggest labels based on concept
            if (concept.toLowerCase().includes("toolset")) {
                suggestedLabels.push("toolset");
            }
            else if (["StatCard", "DataTable", "ChartCard"].includes(concept)) {
                suggestedLabels.push("component-registry");
            }
            else if (concept === "Agent Tools") {
                suggestedLabels.push("agent");
            }
            else if (concept === "Frontend") {
                suggestedLabels.push("frontend");
            }
            else if (concept === "State Sync") {
                suggestedLabels.push("state-sync");
            }
            else if (concept === "CI/CD") {
                suggestedLabels.push("ci-cd");
            }
            else if (concept === "Testing") {
                suggestedLabels.push("testing");
            }
        }
    }
    // Deduplicate
    const uniqueFiles = Array.from(new Map(relevantFiles.map(f => [f.path, f])).values());
    const uniqueDocs = Array.from(new Set(documentationLinks));
    const uniqueLabels = Array.from(new Set(suggestedLabels));
    return {
        detectedConcepts,
        relevantFiles: uniqueFiles,
        documentationLinks: uniqueDocs,
        suggestedLabels: uniqueLabels
    };
}
/**
 * Generates a formatted context comment for the issue
 */
function generateContextComment(context) {
    if (context.detectedConcepts.length === 0) {
        return "";
    }
    let comment = "## 🔍 Detected Context\n\n";
    comment += "This issue appears to be related to:\n";
    comment += context.detectedConcepts.map(c => `- **${c}**`).join("\n");
    comment += "\n\n";
    if (context.relevantFiles.length > 0) {
        comment += "### 📁 Relevant Files\n\n";
        for (const file of context.relevantFiles) {
            comment += `- [\`${file.path}\`](${file.path})`;
            if (file.description) {
                comment += ` - ${file.description}`;
            }
            comment += "\n";
            if (file.relatedPaths && file.relatedPaths.length > 0) {
                comment += "  - Related: " + file.relatedPaths.map(p => `\`${p}\``).join(", ") + "\n";
            }
        }
        comment += "\n";
    }
    if (context.documentationLinks.length > 0) {
        comment += "### 📚 Documentation\n\n";
        for (const doc of context.documentationLinks) {
            comment += `- [${doc}](${doc})\n`;
        }
        comment += "\n";
    }
    comment += "---\n";
    comment += "*This context was automatically generated by the Knowledge Base Context Mapper.*\n";
    return comment;
}
/**
 * File path resolver for GitHub links
 */
function resolveGitHubPath(filePath, repo, branch) {
    return `https://github.com/${repo}/blob/${branch}/${filePath}`;
}
/**
 * Main entry point for CLI usage
 */
function main() {
    // Read from stdin or command line args
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error("Usage: node issue-context-mapper.js <title> <body>");
        process.exit(1);
    }
    const title = args[0];
    const body = args.slice(1).join(" ");
    const context = analyzeIssueContent(body, title);
    const comment = generateContextComment(context);
    // Output as JSON for GitHub Actions
    console.log(JSON.stringify({
        detectedConcepts: context.detectedConcepts,
        relevantFiles: context.relevantFiles.map(f => f.path),
        documentationLinks: context.documentationLinks,
        suggestedLabels: context.suggestedLabels,
        comment: comment
    }, null, 2));
}
// CommonJS exports for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeIssueContent,
        generateContextComment,
        resolveGitHubPath,
        main
    };
}
// Run if called directly
if (require.main === module) {
    main();
}
