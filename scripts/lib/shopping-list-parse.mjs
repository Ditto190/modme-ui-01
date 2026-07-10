/**
 * Parse shopping-list.md URL section (lines 286–368) into deduped seeds + annotations.
 * Architecture: ADR-0009 funnel handoff via scrape-job YAML + annotations sidecar
 * (dual-store diagram in docs/inbox-pipeline/README.md — Firecrawl replaces Scrapy at extract only).
 */

const URL_IN_LINE = /https?:\/\/[^\s>]+(?:#[^\s>]*)?/gi;
const GITHUB_BLOB =
  /^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)$/;

/** GitHub blob/ → raw.githubusercontent.com */
export function githubBlobToRaw(url) {
  const match = url.match(GITHUB_BLOB);
  if (!match) return url;
  const [, repo, ref, path] = match;
  return `https://raw.githubusercontent.com/${repo}/${ref}/${path}`;
}

/** Dedupe key: origin without fragment */
export function urlWithoutFragment(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href.replace(/\/$/, '') || u.href;
  } catch {
    return url.split('#')[0];
  }
}

function extractFragment(url) {
  try {
    const hash = new URL(url).hash;
    return hash ? hash.slice(1) : null;
  } catch {
    const idx = url.indexOf('#');
    return idx >= 0 ? url.slice(idx + 1) : null;
  }
}

function parseAnnotationSuffix(line, urlEndIndex) {
  const rest = line.slice(urlEndIndex).trim();
  const match = rest.match(/^(>{1,3})\s*(.+)$/);
  if (!match) return { annotations: [], priority: 'normal' };
  const text = match[2].trim();
  const priority = /USE THIS|IMPORTANT/i.test(text) ? 'high' : 'normal';
  return { annotations: [text], priority };
}

function tagForUrl(url) {
  if (/github\.com\/gastownhall\/gascity/i.test(url) || /raw\.githubusercontent\.com\/gastownhall\/gascity/i.test(url)) {
    return ['gascity-fleet'];
  }
  if (/leanctx\.com/i.test(url)) {
    return ['lean-ctx', 'shopping-list'];
  }
  return ['shopping-list'];
}

/**
 * @param {string[]} lines — slice from shopping-list (section body)
 * @returns {{ entries: Map<string, object> }}
 */
export function parseShoppingListLines(lines) {
  /** @type {Map<string, { url: string, fragments: string[], annotations: string[], tags: string[], priority: string }>} */
  const entries = new Map();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === '---') continue;
    if (line.startsWith('[date]')) continue;
    if (/^##\s+/i.test(line)) continue;
    if (line.startsWith('- ') || line.startsWith('ctx_')) continue;

    let urls = [];
    let extraAnnotations = [];

    const importantMatch = line.match(/^IMPORTANT\s*>\s*(https?:\/\/\S+)/i);
    if (importantMatch) {
      urls.push(importantMatch[1]);
      extraAnnotations.push('IMPORTANT');
    } else {
      urls = line.match(URL_IN_LINE) || [];
    }

    for (const rawUrl of urls) {
      const cleaned = rawUrl.replace(/[.,;]+$/, '');
      const normalized = githubBlobToRaw(cleaned);
      const key = urlWithoutFragment(normalized);
      const fragment = extractFragment(cleaned);
      const urlStart = line.indexOf(rawUrl);
      const suffix = parseAnnotationSuffix(line, urlStart >= 0 ? urlStart + rawUrl.length : line.length);

      const allAnnotations = [...extraAnnotations, ...suffix.annotations];
      const priority =
        extraAnnotations.length || suffix.priority === 'high' ? 'high' : suffix.priority;
      const tags = tagForUrl(normalized);

      const existing = entries.get(key);
      if (existing) {
        if (fragment && !existing.fragments.includes(fragment)) {
          existing.fragments.push(fragment);
        }
        for (const a of allAnnotations) {
          if (a && !existing.annotations.includes(a)) existing.annotations.push(a);
        }
        if (priority === 'high') existing.priority = 'high';
      } else {
        entries.set(key, {
          url: key,
          fragments: fragment ? [fragment] : [],
          annotations: allAnnotations.filter(Boolean),
          tags,
          priority,
        });
      }
    }
  }

  return { entries };
}

/** Filter entries by --section flag */
export function filterBySection(entries, sectionFilter) {
  const all = [...entries.values()];
  if (sectionFilter === 'all') return all;
  if (sectionFilter === 'gascity') return all.filter((e) => e.tags.includes('gascity-fleet'));
  return all.filter((e) => !e.tags.includes('gascity-fleet'));
}

export function buildCollectionYaml(slug, name, seeds) {
  return {
    slug,
    name,
    description: `Shopping-list harvest (${slug}) - ADR-0009 extract stage; annotations in sidecar`,
    seeds,
    depth: 0,
    allowlist: [],
    rate_limit_seconds: 1.5,
    use_playwright: false,
    obey_robots: true,
  };
}

export function buildAnnotationsSidecar(entries) {
  return Object.fromEntries(entries.map((e) => [e.url, e]));
}
