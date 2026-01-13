"use strict";
// ABOUTME: Journal search functionality with vector similarity and text matching
// ABOUTME: Provides unified search across project and user journal entries
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
exports.SearchService = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const embeddings_1 = require("./embeddings");
const paths_1 = require("./paths");
class SearchService {
    constructor(projectPath, userPath) {
        this.embeddingService = embeddings_1.EmbeddingService.getInstance();
        this.projectPath = projectPath || (0, paths_1.resolveProjectJournalPath)();
        this.userPath = userPath || (0, paths_1.resolveUserJournalPath)();
    }
    async search(query, options = {}) {
        const { limit = 10, minScore = 0.1, sections, dateRange, type = 'both' } = options;
        // Generate query embedding
        const queryEmbedding = await this.embeddingService.generateEmbedding(query);
        // Collect all embeddings
        const allEmbeddings = [];
        if (type === 'both' || type === 'project') {
            const projectEmbeddings = await this.loadEmbeddingsFromPath(this.projectPath, 'project');
            allEmbeddings.push(...projectEmbeddings);
        }
        if (type === 'both' || type === 'user') {
            const userEmbeddings = await this.loadEmbeddingsFromPath(this.userPath, 'user');
            allEmbeddings.push(...userEmbeddings);
        }
        // Filter by criteria
        const filtered = allEmbeddings.filter(embedding => {
            // Filter by sections if specified
            if (sections && sections.length > 0) {
                const hasMatchingSection = sections.some(section => embedding.sections.some(embeddingSection => embeddingSection.toLowerCase().includes(section.toLowerCase())));
                if (!hasMatchingSection)
                    return false;
            }
            // Filter by date range
            if (dateRange) {
                const entryDate = new Date(embedding.timestamp);
                if (dateRange.start && entryDate < dateRange.start)
                    return false;
                if (dateRange.end && entryDate > dateRange.end)
                    return false;
            }
            return true;
        });
        // Calculate similarities and sort
        const results = filtered
            .map(embedding => {
            const score = this.embeddingService.cosineSimilarity(queryEmbedding, embedding.embedding);
            const excerpt = this.generateExcerpt(embedding.text, query);
            return {
                path: embedding.path,
                score,
                text: embedding.text,
                sections: embedding.sections,
                timestamp: embedding.timestamp,
                excerpt,
                type: embedding.type
            };
        })
            .filter(result => result.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        return results;
    }
    async listRecent(options = {}) {
        const { limit = 10, type = 'both', dateRange } = options;
        const allEmbeddings = [];
        if (type === 'both' || type === 'project') {
            const projectEmbeddings = await this.loadEmbeddingsFromPath(this.projectPath, 'project');
            allEmbeddings.push(...projectEmbeddings);
        }
        if (type === 'both' || type === 'user') {
            const userEmbeddings = await this.loadEmbeddingsFromPath(this.userPath, 'user');
            allEmbeddings.push(...userEmbeddings);
        }
        // Filter by date range
        const filtered = dateRange ? allEmbeddings.filter(embedding => {
            const entryDate = new Date(embedding.timestamp);
            if (dateRange.start && entryDate < dateRange.start)
                return false;
            if (dateRange.end && entryDate > dateRange.end)
                return false;
            return true;
        }) : allEmbeddings;
        // Sort by timestamp (most recent first) and limit
        const results = filtered
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit)
            .map(embedding => ({
            path: embedding.path,
            score: 1, // No similarity score for recent entries
            text: embedding.text,
            sections: embedding.sections,
            timestamp: embedding.timestamp,
            excerpt: this.generateExcerpt(embedding.text, '', 150),
            type: embedding.type
        }));
        return results;
    }
    async readEntry(filePath) {
        try {
            return await fs.readFile(filePath, 'utf8');
        }
        catch (error) {
            if (error?.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
    async loadEmbeddingsFromPath(basePath, type) {
        const embeddings = [];
        try {
            const dayDirs = await fs.readdir(basePath);
            for (const dayDir of dayDirs) {
                const dayPath = path.join(basePath, dayDir);
                const stat = await fs.stat(dayPath);
                if (!stat.isDirectory() || !dayDir.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    continue;
                }
                const files = await fs.readdir(dayPath);
                const embeddingFiles = files.filter(file => file.endsWith('.embedding'));
                for (const embeddingFile of embeddingFiles) {
                    try {
                        const embeddingPath = path.join(dayPath, embeddingFile);
                        const content = await fs.readFile(embeddingPath, 'utf8');
                        const embeddingData = JSON.parse(content);
                        embeddings.push({ ...embeddingData, type });
                    }
                    catch (error) {
                        console.error(`Failed to load embedding ${embeddingFile}:`, error);
                        // Continue with other files
                    }
                }
            }
        }
        catch (error) {
            if (error?.code !== 'ENOENT') {
                console.error(`Failed to read embeddings from ${basePath}:`, error);
            }
            // Return empty array if directory doesn't exist
        }
        return embeddings;
    }
    generateExcerpt(text, query, maxLength = 200) {
        if (!query || query.trim() === '') {
            return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
        }
        const queryWords = query.toLowerCase().split(/\s+/);
        const textLower = text.toLowerCase();
        // Find the best position to start the excerpt
        let bestPosition = 0;
        let bestScore = 0;
        for (let i = 0; i <= text.length - maxLength; i += 20) {
            const window = textLower.slice(i, i + maxLength);
            const score = queryWords.reduce((sum, word) => {
                return sum + (window.includes(word) ? 1 : 0);
            }, 0);
            if (score > bestScore) {
                bestScore = score;
                bestPosition = i;
            }
        }
        let excerpt = text.slice(bestPosition, bestPosition + maxLength);
        if (bestPosition > 0)
            excerpt = '...' + excerpt;
        if (bestPosition + maxLength < text.length)
            excerpt += '...';
        return excerpt;
    }
}
exports.SearchService = SearchService;
//# sourceMappingURL=search.js.map