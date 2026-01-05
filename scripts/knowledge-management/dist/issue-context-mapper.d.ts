/**
 * Issue Context Mapper - Knowledge Base Integration
 *
 * Maps issue content to relevant files, documentation, and related concepts
 * for intelligent auto-tagging and context enrichment.
 *
 * Usage: Called from issue-labeler.yml workflow to add contextual information
 */
interface FileMapping {
    path: string;
    description: string;
    relatedPaths?: string[];
    docs?: string[];
}
interface IssueContext {
    detectedConcepts: string[];
    relevantFiles: FileMapping[];
    documentationLinks: string[];
    suggestedLabels: string[];
    relatedIssues?: number[];
}
/**
 * Analyzes issue content and returns relevant context
 */
export declare function analyzeIssueContent(issueBody: string, issueTitle: string): IssueContext;
/**
 * Generates a formatted context comment for the issue
 */
export declare function generateContextComment(context: IssueContext): string;
/**
 * File path resolver for GitHub links
 */
export declare function resolveGitHubPath(filePath: string, repo: string, branch: string): string;
/**
 * Main entry point for CLI usage
 */
export declare function main(): void;
export {};
