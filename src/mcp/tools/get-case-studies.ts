import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GetCaseStudiesInput, GetCaseStudiesOutput } from '@/mcp/schemas';
import { config } from '@/config';
import { assertPublic } from '@/classifier/public-only';
import { log } from '@/lib/log';

export type CaseStudyKind = 'case_study' | 'lookbook' | 'playbook';
export interface CaseStudyItem {
  kind: CaseStudyKind;
  slug: string;
  title: string;
  url: string;
}

const KIND_ORDER: Record<CaseStudyKind, number> = { lookbook: 0, case_study: 1, playbook: 2 };

/** Extract every <loc>…</loc> URL from a sitemap (index or urlset). */
function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].trim());
}

function titleCase(s: string): string {
  return s
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function kindFor(path: string, slug: string): CaseStudyKind | null {
  if (slug.startsWith('case-study-')) return 'case_study';
  if (path.startsWith('/lookbook') || slug.startsWith('lookbook-')) return 'lookbook';
  if (slug.startsWith('playbook-')) return 'playbook';
  return null;
}

function titleFor(kind: CaseStudyKind, slug: string): string {
  if (kind === 'case_study') {
    const m = slug.match(/^case-study-0*(\d+)-(.+)$/);
    if (m) return `Case Study ${m[1]} — ${titleCase(m[2])}`;
    return `Case Study — ${titleCase(slug.replace(/^case-study-/, ''))}`;
  }
  if (kind === 'lookbook') {
    return `Lookbook — ${titleCase(slug.replace(/^lookbook-/, ''))}`;
  }
  return `Playbook — ${titleCase(slug.replace(/^playbook-/, ''))}`;
}

/**
 * Pure parser: turn a page-sitemap's XML into newsletter/lookbook items.
 * Only same-host URLs under /newsletter or /lookbook are kept; the bare
 * /newsletter archive root is excluded (it's the archive_url, not an item).
 */
export function caseStudiesFromSitemap(pageXml: string, siteUrl: string): CaseStudyItem[] {
  const host = new URL(siteUrl).host;
  const seen = new Set<string>();
  const items: CaseStudyItem[] = [];
  for (const loc of extractLocs(pageXml)) {
    let u: URL;
    try {
      u = new URL(loc);
    } catch {
      continue;
    }
    if (u.host !== host) continue;
    const path = u.pathname.replace(/\/+$/, '');
    if (path !== '/newsletter' && !path.startsWith('/newsletter/') && !path.startsWith('/lookbook/')) continue;
    if (path === '/newsletter') continue; // archive root, not an item
    const slug = path.split('/').filter(Boolean).pop() ?? '';
    const kind = kindFor(path, slug);
    if (!kind || seen.has(slug)) continue;
    seen.add(slug);
    items.push({ kind, slug, title: titleFor(kind, slug), url: `${siteUrl}${path}` });
  }
  return items;
}

function sortItems(items: CaseStudyItem[]): CaseStudyItem[] {
  return [...items].sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.slug.localeCompare(b.slug),
  );
}

async function fetchSitemap(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { Accept: 'application/xml, text/xml' },
    cf: { cacheTtl: 600, cacheEverything: true }, // 10-min edge cache
  });
  if (!r.ok) throw new Error(`sitemap ${url} → ${r.status}`);
  return r.text();
}

/** Resolve the index → same-host child sitemaps → collect newsletter items. */
async function loadCaseStudies(siteUrl: string): Promise<CaseStudyItem[]> {
  const host = new URL(siteUrl).host;
  const indexXml = await fetchSitemap(`${siteUrl}/sitemap.xml`);
  // Child sitemaps on our own host only (skip the 629k-URL directory sitemap on Supabase).
  const children = extractLocs(indexXml).filter((l) => {
    try {
      return new URL(l).host === host;
    } catch {
      return false;
    }
  });
  // If the index isn't a sitemapindex (or lists no same-host children), the
  // index itself may already be the urlset; fall back to the known pages sitemap.
  const targets = children.length ? children : [`${siteUrl}/sitemap-pages.xml`];
  const pages = await Promise.all(targets.map((t) => fetchSitemap(t).catch(() => '')));
  const all = pages.flatMap((xml) => caseStudiesFromSitemap(xml, siteUrl));
  // Dedupe across child sitemaps by slug.
  const seen = new Set<string>();
  return all.filter((i) => (seen.has(i.slug) ? false : (seen.add(i.slug), true)));
}

const DESCRIPTION = `List Eveoy case studies and lookbooks — links to the full write-ups on eveoy.com's newsletter archive. Returns pointers, not article text: open a url to get the full experience (images, related links, and in-page options to book a demo or check out).

Use this when the user wants to:
- See proof, results, or success stories from real Eveoy campaigns
- Browse case studies by industry, or the latest lookbook
- Get a link to read a specific case study or the archive

Trigger phrases include: "case studies", "success stories", "show me results", "do you have proof", "lookbook", "examples of campaigns".

Returns: { archive_url, items: [{ kind, slug, title, url }], note }. Every url points back to eveoy.com. kind is one of case_study | lookbook | playbook.

Do NOT use this for: pricing (use get_pricing), general questions (use ask_eveoy), or the live business directory (use search_directory).

Cost: free. Latency: 1–2s (sitemap, cached 10 min). Read-only. Idempotent.`;

export function registerGetCaseStudies(server: McpServer) {
  server.registerTool(
    'get_case_studies',
    {
      title: 'List Eveoy case studies & lookbooks',
      description: DESCRIPTION,
      inputSchema: GetCaseStudiesInput.shape,
      outputSchema: GetCaseStudiesOutput.shape,
      annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
    },
    async ({ kind, limit }) => {
      const siteUrl = config().siteUrl;
      const archive_url = `${siteUrl}/newsletter`;

      let items: CaseStudyItem[] = [];
      try {
        items = await loadCaseStudies(siteUrl);
      } catch (err) {
        log.warn('tool.get_case_studies.fetch_failed', { error: String(err) });
      }

      if (kind) items = items.filter((i) => i.kind === kind);
      items = sortItems(items);
      if (limit) items = items.slice(0, limit);

      const note = items.length
        ? `Open any url on eveoy.com to read the full piece — images, related links, and in-page options to book a demo (book_demo) or start a checkout (start_checkout).`
        : `No published ${kind ?? 'items'} yet — browse the archive at ${archive_url}.`;

      const out = { archive_url, items, note };

      const text = [
        `Eveoy case studies & lookbooks — browse all at ${archive_url}:`,
        '',
        ...items.map((i) => `  • [${i.kind}] ${i.title} — ${i.url}`),
        '',
        note,
      ].join('\n');
      const safe = assertPublic(text, { tool: 'get_case_studies' });

      return { content: [{ type: 'text', text: safe }], structuredContent: out };
    },
  );
}
