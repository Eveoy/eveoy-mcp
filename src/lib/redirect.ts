/**
 * Human-friendly redirect. A person who types mcp.eveoy.com into a browser (or
 * clicks through to /mcp) should land on the canonical marketing page rather
 * than a proxied duplicate or a raw JSON-RPC error. Agents send Accept: * / *,
 * application/json, or text/event-stream, so they never match and the MCP
 * protocol, SSE stream, and POST /mcp are untouched. Only the exact human entry
 * paths redirect — static files (/llms.txt, /robots.txt, /sitemap.xml),
 * discovery (/.well-known/*, /info.json), /sse, and /health are left alone.
 */
const CANONICAL_HUMAN_PAGE = 'https://www.eveoy.com/mcp';
const HUMAN_ENTRY_PATHS = new Set(['/', '/index.html', '/mcp']);

export function humanRedirect(request: Request): Response | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const accept = request.headers.get('accept') ?? '';
  if (!accept.includes('text/html')) return null;
  const { pathname } = new URL(request.url);
  if (!HUMAN_ENTRY_PATHS.has(pathname)) return null;
  return Response.redirect(CANONICAL_HUMAN_PAGE, 302);
}
