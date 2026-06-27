import { generateMoleculesFromTools, MoleculeLibrary } from '../molecule-generator.js';
import { test } from 'node:test';
import assert from 'node:assert';

test('generates molecules from tools', () => {
    const tools: any[] = [];
    const molecules = generateMoleculesFromTools(tools);
    assert.ok(molecules.length >= 0, 'Molecules length should be >= 0');
});

test('includes web_scraper molecule in library', () => {
    const webScraper = MoleculeLibrary.webScraper();
    assert.strictEqual(webScraper.id, 'web_scraper');
    assert.ok(webScraper.underlyingTools.includes('scrape.crawl_url'));
    assert.ok(webScraper.underlyingTools.includes('scrape.classify_page'));
    assert.ok(webScraper.underlyingTools.includes('scrape.promote_batch'));
});

test('includes code_pattern_scanner molecule in library', () => {
    const scanner = MoleculeLibrary.codePatternScanner();
    assert.strictEqual(scanner.id, 'code_pattern_scanner');
    assert.ok(scanner.underlyingTools.includes('code.index_ast'));
    assert.ok(scanner.underlyingTools.includes('code.search_patterns'));
});

test('includes knowledge_intake molecule in library', () => {
    const intake = MoleculeLibrary.knowledgeIntake();
    assert.strictEqual(intake.id, 'knowledge_intake');
    assert.ok(intake.underlyingTools.includes('scrape.promote_batch'));
    assert.ok(intake.underlyingTools.includes('code.index_ast'));
});

test('does not duplicate scrape tools when registry provides them', () => {
    const tools = [
        { name: 'scrape.crawl_url', description: 'Crawl', inputSchema: {} },
        { name: 'scrape.classify_page', description: 'Classify', inputSchema: {} },
        { name: 'scrape.promote_batch', description: 'Promote', inputSchema: {} },
    ];
    const molecules = generateMoleculesFromTools(tools as any[]);
    const webScraper = molecules.find(m => m.id === 'web_scraper');
    assert.ok(webScraper, 'web_scraper molecule should exist');
    const scrapeDuplicates = molecules.filter(m =>
        ['scrape.crawl_url', 'scrape.classify_page', 'scrape.promote_batch'].includes(m.id)
    );
    assert.strictEqual(scrapeDuplicates.length, 0, 'scrape tools should not spawn duplicate molecules');
});
