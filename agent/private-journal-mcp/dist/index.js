#!/usr/bin/env node
"use strict";
// ABOUTME: Main entry point for the private journal MCP server
// ABOUTME: Handles command line arguments and starts the server
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const server_1 = require("./server");
const paths_1 = require("./paths");
function parseArguments() {
    const args = process.argv.slice(2);
    // Check for explicit journal path argument first
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--journal-path' && i + 1 < args.length) {
            return path.resolve(args[i + 1]);
        }
    }
    // Use shared path resolution logic
    return (0, paths_1.resolveProjectJournalPath)();
}
async function main() {
    try {
        // Log environment info for debugging
        console.error('=== Private Journal MCP Server Debug Info ===');
        console.error(`Node.js version: ${process.version}`);
        console.error(`Platform: ${process.platform}`);
        console.error(`Architecture: ${process.arch}`);
        try {
            console.error(`Current working directory: ${process.cwd()}`);
        }
        catch (error) {
            console.error(`Failed to get current working directory: ${error}`);
        }
        console.error(`Environment variables:`);
        console.error(`  HOME: ${process.env.HOME || 'undefined'}`);
        console.error(`  USERPROFILE: ${process.env.USERPROFILE || 'undefined'}`);
        console.error(`  TEMP: ${process.env.TEMP || 'undefined'}`);
        console.error(`  TMP: ${process.env.TMP || 'undefined'}`);
        console.error(`  USER: ${process.env.USER || 'undefined'}`);
        console.error(`  USERNAME: ${process.env.USERNAME || 'undefined'}`);
        const journalPath = parseArguments();
        console.error(`Selected journal path: ${journalPath}`);
        console.error('===============================================');
        const server = new server_1.PrivateJournalServer(journalPath);
        await server.run();
    }
    catch (error) {
        console.error('Failed to start private journal MCP server:', error);
        process.exit(1);
    }
}
main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map