import { describe, it, expect } from 'vitest';
import { caseStudiesFromSitemap } from './get-case-studies';

const SITE = 'https://eveoy.com';

// Mirrors the real eveoy.com/sitemap-pages.xml shape: archive root, the lookbook
// under /lookbook/, case studies under /newsletter/, plus unrelated pages and a
// foreign-host URL that must be ignored.
const PAGE_XML = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://eveoy.com/</loc></url>
  <url><loc>https://eveoy.com/pricing</loc></url>
  <url><loc>https://eveoy.com/newsletter</loc></url>
  <url><loc>https://eveoy.com/lookbook/issue-01-real-people</loc></url>
  <url><loc>https://eveoy.com/newsletter/case-study-01-bakery</loc></url>
  <url><loc>https://eveoy.com/newsletter/case-study-27-marketing-agency</loc></url>
  <url><loc>https://other.example.com/newsletter/case-study-99-fake</loc></url>
</urlset>`;

describe('caseStudiesFromSitemap — newsletter/lookbook parsing', () => {
  const items = caseStudiesFromSitemap(PAGE_XML, SITE);

  it('keeps only same-host /newsletter and /lookbook items, excluding the archive root', () => {
    const slugs = items.map((i) => i.slug).sort();
    expect(slugs).toEqual(['case-study-01-bakery', 'case-study-27-marketing-agency', 'issue-01-real-people']);
  });

  it('excludes the bare /newsletter archive and foreign hosts', () => {
    expect(items.some((i) => i.slug === '' || i.url.includes('other.example.com'))).toBe(false);
  });

  it('derives kind from slug prefix and /lookbook path', () => {
    const bySlug = Object.fromEntries(items.map((i) => [i.slug, i.kind]));
    expect(bySlug['case-study-01-bakery']).toBe('case_study');
    expect(bySlug['case-study-27-marketing-agency']).toBe('case_study');
    expect(bySlug['issue-01-real-people']).toBe('lookbook');
  });

  it('builds clean titles and eveoy.com urls', () => {
    const bakery = items.find((i) => i.slug === 'case-study-01-bakery')!;
    expect(bakery.title).toBe('Case Study 1 — Bakery');
    expect(bakery.url).toBe('https://eveoy.com/newsletter/case-study-01-bakery');
    const agency = items.find((i) => i.slug === 'case-study-27-marketing-agency')!;
    expect(agency.title).toBe('Case Study 27 — Marketing Agency');
    const lookbook = items.find((i) => i.kind === 'lookbook')!;
    expect(lookbook.url).toBe('https://eveoy.com/lookbook/issue-01-real-people');
  });

  it('returns nothing for an empty or unrelated sitemap', () => {
    expect(caseStudiesFromSitemap('<urlset></urlset>', SITE)).toEqual([]);
  });
});
