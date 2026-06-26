/**
 * Lightweight category inference for skill manifests.
 */
export const CATEGORY_KEYWORDS = {
  documentation: ['documentation', 'docs', 'readme', 'tutorial', 'guide', 'diataxis', 'writer'],
  frontend: ['react', 'nextjs', 'frontend', 'ui', 'component', 'tailwind'],
  backend: ['api', 'fastapi', 'backend', 'server', 'database', 'postgres', 'supabase'],
  devops: ['ci', 'cd', 'devops', 'workflow', 'deploy', 'github actions'],
  testing: ['test', 'vitest', 'playwright', 'jest'],
  security: ['security', 'auth', 'rls', 'owasp'],
  ai_tooling: ['agent', 'llm', 'copilot', 'cursor', 'mcp', 'skill'],
};

export function inferCategorySlug(text) {
  const lower = text.toLowerCase();
  let best = { slug: 'uncategorized', score: 0 };
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += kw.includes(' ') ? 2 : 1;
    }
    if (score > best.score) best = { slug, score };
  }
  return best.slug;
}
