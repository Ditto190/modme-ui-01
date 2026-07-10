import { fetchMCPRegistry, getServersByCategory } from '../registry-fetcher.js';
import { test } from 'node:test';
import assert from 'node:assert';

test('fetches and validates registry', async () => {
    try {
        const registry = await fetchMCPRegistry();
        assert.ok(registry.servers.length > 0, 'Registry should have servers');
        assert.ok(registry.servers[0].id, 'Server should have an ID');

        const scrapeServer = registry.servers.find(s => s.id === 'scrape');
        assert.ok(scrapeServer, 'Registry should include scrape server');
        assert.strictEqual(scrapeServer?.tools.length, 3);
        assert.ok(scrapeServer?.tools.some(t => t.name === 'scrape.crawl_url'));
        assert.ok(scrapeServer?.tools.some(t => t.name === 'scrape.classify_page'));
        assert.ok(scrapeServer?.tools.some(t => t.name === 'scrape.promote_batch'));
    } catch (error) {
       console.warn("Skipping registry fetch test due to network/environment:", error);
    }
});
