#!/usr/bin/env node
/**
 * Update Knowledge Library Script
 *
 * Automatically detects archived documentation and updates knowledge-library.json
 * with proper metadata, categories, and indexing.
 *
 * Usage:
 *   node scripts/knowledge-management/update-knowledge-library.mjs
 *
 * Environment:
 *   ARCHIVED_FILES - Path to file containing list of archived files (optional)
 */

import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

const KNOWLEDGE_LIBRARY_PATH = "docs/knowledge-library.json";
const ARCHIVE_BASE = "docs/archive";

// Category mappings for different archive subdirectories
const CATEGORY_MAP = {
  observability: "observability",
  "build-tools": "build-tools",
  infrastructure: "infrastructure",
  integrations: "integrations",
  architecture: "architecture",
  sessions: "archive",
  temp: "archive",
};

/**
 * Parse an archived markdown file to extract metadata
 */
async function parseArchiveFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const lines = content.split("\n");

    // Extract title (first H1)
    let title = path.basename(filePath, ".md");
    for (const line of lines) {
      if (line.startsWith("# ")) {
        title = line.replace(/^#\s+/, "").trim();
        break;
      }
    }

    // Extract summary (first paragraph after title or first 200 chars)
    let summary = "";
    let inContent = false;
    for (const line of lines) {
      if (line.startsWith("# ")) {
        inContent = true;
        continue;
      }
      if (inContent && line.trim() && !line.startsWith("#")) {
        summary = line.trim();
        break;
      }
    }
    if (!summary) {
      summary = content.substring(0, 200).replace(/\n/g, " ").trim() + "...";
    }

    // Extract keywords from content (simple word frequency)
    const words = content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const wordFreq = {};
    words.forEach((w) => (wordFreq[w] = (wordFreq[w] || 0) + 1));
    const keywords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return { title, summary, keywords };
  } catch (error) {
    console.warn(`Warning: Could not parse ${filePath}:`, error.message);
    return {
      title: path.basename(filePath, ".md"),
      summary: "Archived documentation",
      keywords: [],
    };
  }
}

/**
 * Determine category from file path
 */
function getCategoryFromPath(filePath) {
  const relativePath = path.relative(ARCHIVE_BASE, filePath);
  const parts = relativePath.split(path.sep);

  if (parts.length >= 2) {
    const category = CATEGORY_MAP[parts[0]] || "archive";
    return category;
  }

  return "archive";
}

/**
 * Generate a unique ID from file path
 */
function generateTopicId(filePath) {
  const relativePath = path.relative(ARCHIVE_BASE, filePath);
  const withoutExt = relativePath.replace(/\.md$/, "");
  return withoutExt
    .toLowerCase()
    .replace(/[\/\\]/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Main update logic
 */
async function updateKnowledgeLibrary() {
  console.log("🔍 Scanning for archived documentation...\n");

  // Load existing knowledge library
  let library;
  try {
    const content = await fs.readFile(KNOWLEDGE_LIBRARY_PATH, "utf8");
    library = JSON.parse(content);
  } catch (error) {
    console.error("❌ Failed to load knowledge-library.json:", error.message);
    process.exit(1);
  }

  // Get list of archived files
  let archivedFiles = [];
  const archivedFilesPath = process.env.ARCHIVED_FILES || "/tmp/archived_files.txt";

  if (existsSync(archivedFilesPath)) {
    const fileList = await fs.readFile(archivedFilesPath, "utf8");
    archivedFiles = fileList.split("\n").filter((f) => f.trim() && f.endsWith(".md"));
  } else {
    // Scan entire archive directory
    async function* walk(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          yield* walk(fullPath);
        } else if (entry.name.endsWith(".md") && entry.name !== "README.md") {
          yield fullPath;
        }
      }
    }

    if (existsSync(ARCHIVE_BASE)) {
      for await (const file of walk(ARCHIVE_BASE)) {
        archivedFiles.push(file);
      }
    }
  }

  if (archivedFiles.length === 0) {
    console.log("ℹ️  No archived files found to process");
    return;
  }

  console.log(`Found ${archivedFiles.length} archived file(s):\n`);

  // Track existing topic IDs
  const existingIds = new Set(library.topics.map((t) => t.id));
  let addedCount = 0;
  let skippedCount = 0;

  // Process each archived file
  for (const filePath of archivedFiles) {
    const topicId = generateTopicId(filePath);

    if (existingIds.has(topicId)) {
      console.log(`  ⏭️  Skip (exists): ${filePath}`);
      skippedCount++;
      continue;
    }

    console.log(`  ➕ Adding: ${filePath}`);

    const { title, summary, keywords } = await parseArchiveFile(filePath);
    const category = getCategoryFromPath(filePath);
    const relativePath = path.relative("docs", filePath).replace(/\\/g, "/");

    const newTopic = {
      id: topicId,
      name: title,
      category: category,
      status: "archived",
      summary: summary,
      keywords: keywords.slice(0, 5),
      source_files: [relativePath],
      consolidated_path: relativePath,
      key_concepts: {},
      commands: {},
      related_topics: [],
      metadata: {
        archived_date: new Date().toISOString().split("T")[0],
        original_path: relativePath,
        archive_reason: "Temporal/implementation documentation superseded by consolidated guides",
      },
    };

    library.topics.push(newTopic);
    existingIds.add(topicId);
    addedCount++;
  }

  // Update metadata
  library.last_updated = new Date().toISOString();
  library.version = library.version || "1.0.0";

  // Rebuild index
  library.index = library.index || { by_category: {}, by_keyword: {} };
  library.index.by_category = {};
  library.index.by_keyword = {};

  for (const topic of library.topics) {
    // Index by category
    if (!library.index.by_category[topic.category]) {
      library.index.by_category[topic.category] = [];
    }
    library.index.by_category[topic.category].push(topic.id);

    // Index by keywords
    for (const keyword of topic.keywords || []) {
      if (!library.index.by_keyword[keyword]) {
        library.index.by_keyword[keyword] = [];
      }
      if (!library.index.by_keyword[keyword].includes(topic.id)) {
        library.index.by_keyword[keyword].push(topic.id);
      }
    }
  }

  // Write updated library
  await fs.writeFile(KNOWLEDGE_LIBRARY_PATH, JSON.stringify(library, null, 2) + "\n", "utf8");

  console.log("\n✅ Knowledge library updated successfully!");
  console.log(`   Added: ${addedCount} topics`);
  console.log(`   Skipped: ${skippedCount} (already exists)`);
  console.log(`   Total topics: ${library.topics.length}`);
  console.log(
    `   Archived topics: ${library.topics.filter((t) => t.status === "archived").length}`
  );
}

// Run
updateKnowledgeLibrary().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
