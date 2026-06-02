export const runtime = 'nodejs';
export const dynamic = 'force-static';

export async function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: https://mcp.eveoy.com/sitemap.xml',
    '',
    '# MCP discovery hint',
    '# mcp-endpoint: https://mcp.eveoy.com/api/mcp',
    '# mcp-server-card: https://mcp.eveoy.com/.well-known/mcp/server-card.json',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
