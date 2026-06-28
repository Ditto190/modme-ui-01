export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  backend: [
    "nodejs",
    "node.js",
    "express",
    "fastapi",
    "django",
    "flask",
    "spring",
    "java",
    "python",
    "golang",
    "rust",
    "server",
    "api",
    "rest",
    "graphql",
    "database",
    "sql",
    "mongodb",
  ],
  "web-development": [
    "react",
    "vue",
    "angular",
    "html",
    "css",
    "javascript",
    "typescript",
    "frontend",
    "tailwind",
    "bootstrap",
    "webpack",
    "vite",
    "pwa",
    "responsive",
    "seo",
  ],
  database: [
    "database",
    "sql",
    "postgres",
    "mysql",
    "mongodb",
    "firestore",
    "redis",
    "orm",
    "schema",
  ],
  "ai-ml": [
    "ai",
    "machine learning",
    "ml",
    "tensorflow",
    "pytorch",
    "nlp",
    "llm",
    "gpt",
    "transformer",
    "embedding",
    "training",
  ],
  devops: [
    "docker",
    "kubernetes",
    "ci/cd",
    "git",
    "jenkins",
    "terraform",
    "ansible",
    "deploy",
    "container",
    "monitoring",
  ],
  cloud: ["aws", "azure", "gcp", "serverless", "lambda", "storage", "cdn"],
  security: [
    "encryption",
    "cryptography",
    "jwt",
    "oauth",
    "authentication",
    "authorization",
    "vulnerability",
  ],
  testing: [
    "test",
    "jest",
    "mocha",
    "pytest",
    "cypress",
    "selenium",
    "unit test",
    "e2e",
  ],
  mobile: [
    "mobile",
    "react native",
    "flutter",
    "ios",
    "android",
    "swift",
    "kotlin",
  ],
  automation: [
    "automation",
    "workflow",
    "scripting",
    "robot",
    "trigger",
    "integration",
  ],
  "game-development": [
    "game",
    "unity",
    "unreal",
    "godot",
    "threejs",
    "2d",
    "3d",
    "physics",
  ],
  "data-science": [
    "data",
    "analytics",
    "pandas",
    "numpy",
    "statistics",
    "visualization",
  ],
};

const ERROR_REGEX = /(error|fail|exception)/i;
const WARN_REGEX = /warn/i;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Intentional categorization logic
export function categorizeLog(
  message: string,
  context?: unknown
): { category: string; severity: string } {
  // Determine severity
  let severity = "info";
  if (context && typeof context === "object") {
    const ctx = context as Record<string, unknown>;
    if (ctx.level || ctx.severity) {
      severity = String(ctx.level || ctx.severity).toLowerCase();
    } else {
      const messageLower = message.toLowerCase();
      if (ERROR_REGEX.test(messageLower)) {
        severity = "error";
      } else if (WARN_REGEX.test(messageLower)) {
        severity = "warn";
      }
    }
  } else {
    const messageLower = message.toLowerCase();
    if (ERROR_REGEX.test(messageLower)) {
      severity = "error";
    } else if (WARN_REGEX.test(messageLower)) {
      severity = "warn";
    }
  }

  // Safely stringify context
  let contextStr = "";
  if (context) {
    try {
      contextStr =
        typeof context === "string" ? context : JSON.stringify(context);
    } catch (_e) {
      // Ignore circular reference errors
      contextStr = "";
    }
  }

  const combinedText = `${message} ${contextStr}`.toLowerCase();

  let maxScore = 0;
  let bestCategory = "uncategorized";

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      // Escape keyword for regex, but mostly they are simple alphanumerics
      // Using \b to match whole words/phrases
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, "g");

      const matches = combinedText.match(regex);
      if (matches) {
        // Score 2 points for multi-word phrases (has space), 1 point for single words
        const points = keyword.includes(" ") ? 2 : 1;
        score += matches.length * points;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return {
    category: bestCategory,
    severity,
  };
}
