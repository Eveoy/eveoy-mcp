export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  const urls = [
    'https://mcp.eveoy.com/',
    'https://mcp.eveoy.com/.well-known/mcp/server-card.json',
  ];
  const today = '2026-06-02';
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url><loc>${u}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`,
    ),
    '</urlset>',
  ].join('\n');
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
