export declare class JournalManager {
    private projectJournalPath;
    private userJournalPath;
    private embeddingService;
    constructor(projectJournalPath: string, userJournalPath?: string);
    writeEntry(content: string): Promise<void>;
    writeThoughts(thoughts: {
        feelings?: string;
        project_notes?: string;
        user_context?: string;
        technical_insights?: string;
        world_knowledge?: string;
    }): Promise<void>;
    private formatDate;
    private formatTimestamp;
    private formatEntry;
    private writeThoughtsToLocation;
    private formatThoughts;
    private generateEmbeddingForEntry;
    generateMissingEmbeddings(): Promise<number>;
    private extractTimestampFromPath;
    private ensureDirectoryExists;
}
//# sourceMappingURL=journal.d.ts.map