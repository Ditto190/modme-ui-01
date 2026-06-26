/**
 * Weighted category scoring for inbox entries and skill manifests.
 * Pattern inspired by antigravity-awesome-skills auto_categorize_skills.py + generate_index.py.
 */

export const CATEGORY_KEYWORDS = {
  infrastructure: [
    'infrastructure',
    'cloud',
    'deployment',
    'networking',
    'serverless',
    'distributed',
    'cdn',
    'hosting',
  ],
  frontend: [
    'react',
    'vue',
    'angular',
    'svelte',
    'html',
    'css',
    'javascript',
    'typescript',
    'frontend',
    'web',
    'tailwind',
    'bootstrap',
    'sass',
    'less',
    'webpack',
    'vite',
    'dom',
    'jsx',
    'tsx',
    'component',
    'responsive',
    'seo',
    'accessibility',
    'a11y',
    'pwa',
  ],
  backend: [
    'nodejs',
    'node.js',
    'express',
    'fastapi',
    'django',
    'flask',
    'spring',
    'java',
    'python',
    'golang',
    'rust',
    'c#',
    'csharp',
    'dotnet',
    '.net',
    'laravel',
    'php',
    'ruby',
    'rails',
    'server',
    'backend',
    'api',
    'rest',
    'graphql',
    'middleware',
    'routing',
    'controller',
    'model',
  ],
  devops: [
    'devops',
    'docker',
    'kubernetes',
    'k8s',
    'ci/cd',
    'git',
    'github',
    'gitlab',
    'jenkins',
    'github actions',
    'terraform',
    'ansible',
    'deploy',
    'deployment',
    'container',
    'orchestration',
    'monitoring',
    'logging',
    'prometheus',
    'grafana',
  ],
  architecture: ['architecture', 'adr', 'decision', 'design', 'pattern', 'system design'],
  research: ['research', 'spike', 'investigation', 'paper', 'article', 'exploration'],
  components: ['storybook', 'stories', 'ui component', 'jsx component', 'tsx component'],
  documentation: ['markdown', 'documentation', 'docs', 'readme', 'wiki', 'guide'],
  security: [
    'security',
    'encryption',
    'cryptography',
    'ssl',
    'tls',
    'jwt',
    'oauth',
    'auth',
    'authentication',
    'authorization',
    'firewall',
    'penetration',
    'vulnerability',
    'privacy',
    'gdpr',
    'compliance',
    'rls',
  ],
  performance: [
    'performance',
    'optimization',
    'cache',
    'speed',
    'latency',
    'slow',
    'fast',
    'bundle size',
    'lighthouse',
  ],
  testing: [
    'test',
    'testing',
    'jest',
    'mocha',
    'jasmine',
    'pytest',
    'unittest',
    'cypress',
    'selenium',
    'puppeteer',
    'e2e',
    'unit test',
    'integration',
    'coverage',
    'mock',
  ],
  'frontend-react': ['react', 'hook', 'jsx', 'tsx', 'use-state', 'use-effect'],
  'frontend-nextjs': [
    'nextjs',
    'next.js',
    'app router',
    'server component',
    'routing',
    'getServerSideProps',
    'getStaticProps',
  ],
  'frontend-design-system': [
    'design system',
    'shadcn',
    'tailwind',
    'token',
    'color palette',
    'typography',
  ],
  'backend-api': ['api design', 'rest api', 'graphql api', 'route handler', 'contract', 'endpoint'],
  'backend-database': [
    'prisma',
    'supabase',
    'database',
    'db',
    'sql',
    'query',
    'migration',
    'schema',
    'postgres',
    'postgresql',
    'mysql',
    'mongodb',
  ],
  'backend-agents': [
    'ai agent',
    'fastapi agent',
    'ag2',
    'llm pipeline',
    'agentic',
    'langchain',
    'llama-index',
  ],
  'infra-supabase': [
    'supabase config',
    'supabase client',
    'rls',
    'supabase storage',
    'supabase function',
    'pgvector',
  ],
  'infra-mcp': ['mcp server', 'model context protocol', 'mcp tool', 'mcp client'],
};

export const DEFAULT_SCORE_OPTIONS = {
  minScore: 4,
  minMargin: 2,
};

function escapeRegex(keyword) {
  return keyword.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Score all category slugs against text. Returns Map<slug, score>.
 */
export function scoreCategories(text, categories, keywords = CATEGORY_KEYWORDS) {
  const lower = text.toLowerCase();
  const scores = new Map();

  for (const cat of categories) {
    const slug = typeof cat === 'string' ? cat : cat.slug;
    const name = typeof cat === 'string' ? cat.replace(/-/g, ' ') : cat.name;
    const slugKeywords = keywords[slug] || [];
    let score = 0;

    for (const keyword of slugKeywords) {
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
      if (regex.test(lower)) {
        score += 2;
      } else if (lower.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    const slugText = slug.replace(/-/g, ' ');
    if (lower.includes(slugText)) score += 2;
    if (name && lower.includes(name.toLowerCase())) score += 2;

    if (score > 0) {
      scores.set(slug, score);
    }
  }

  return scores;
}

/**
 * Pick best category id from scored categories with margin threshold.
 * @returns {{ categoryId: string|null, slug: string|null, score: number, runnerUpScore: number }}
 */
export function matchCategoryWithDetails(text, categories, options = {}) {
  const { minScore = DEFAULT_SCORE_OPTIONS.minScore, minMargin = DEFAULT_SCORE_OPTIONS.minMargin } =
    options;

  const scores = scoreCategories(text, categories);
  if (scores.size === 0) {
    return { categoryId: null, slug: null, score: 0, runnerUpScore: 0 };
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [bestSlug, bestScore] = ranked[0];
  const runnerUpScore = ranked.length > 1 ? ranked[1][1] : 0;

  if (bestScore < minScore || bestScore - runnerUpScore < minMargin) {
    return { categoryId: null, slug: bestSlug, score: bestScore, runnerUpScore };
  }

  const cat = categories.find((c) => c.slug === bestSlug);
  return {
    categoryId: cat?.id ?? null,
    slug: bestSlug,
    score: bestScore,
    runnerUpScore,
  };
}

/** Legacy helper — returns category id or null. */
export function matchCategory(text, categories, options = {}) {
  return matchCategoryWithDetails(text, categories, options).categoryId;
}

/** Infer skill/inbox category slug from free text (no DB categories required). */
export function inferCategorySlug(text, options = {}) {
  const slugs = Object.keys(CATEGORY_KEYWORDS).map((slug) => ({ slug, name: slug }));
  const result = matchCategoryWithDetails(text, slugs, {
    minScore: 2,
    minMargin: 1,
    ...options,
  });
  return result.slug ?? 'uncategorized';
}

/**
 * Print antigravity-style categorization report to console.
 */
export function printCategoryReport({ categorized, alreadyCategorized, failed, samples = [] }) {
  console.log('\n======================================================================');
  console.log('AUTO-CATEGORIZATION REPORT');
  console.log('======================================================================\n');
  console.log('Summary:');
  console.log(`   ✅ Categorized: ${categorized}`);
  console.log(`   ⏭️  Already categorized: ${alreadyCategorized}`);
  console.log(`   ❌ Failed to categorize: ${failed}`);
  console.log(`   📈 Total processed: ${categorized + alreadyCategorized + failed}`);

  if (samples.length > 0) {
    console.log('\nSample changes:');
    for (const sample of samples.slice(0, 10)) {
      console.log(`   • ${sample.id}`);
      console.log(`     ${sample.from} → ${sample.to} (score: ${sample.score})`);
    }
  }
}
