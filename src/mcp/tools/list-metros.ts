import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListMetrosInput, ListMetrosOutput } from '@/mcp/schemas';
import { assertPublic } from '@/classifier/public-only';

// Eveoy Directory coverage, from eveoy.com/directory (verified 2026-06-22).
// Static today. Per Lovable: directory-sitemap is sitemap-only (no query API);
// a new `directory-query` edge fn is the Phase-2 dependency for live coverage +
// search_directory / get_business. See docs/QUESTIONS_FOR_LOVABLE.md.
const LIVE = [{ metro: 'Los Angeles', kind: 'registry', businesses: 629431 }];
const COMING = [
  { metro: 'New York', kind: 'registry' },
  { metro: 'Chicago', kind: 'registry' },
  { metro: 'San Francisco', kind: 'registry' },
  { metro: 'Houston', kind: 'registry' },
  { metro: 'California', kind: 'listings' },
  { metro: 'Texas', kind: 'listings' },
  { metro: 'Florida', kind: 'listings' },
  { metro: 'Colorado', kind: 'listings' },
];

const DESCRIPTION = `List the metros covered by the Eveoy business directory — a free, live list of active consumer brands, stores, and businesses sourced from government/city registries and storefront listings.

Use this when the user wants to:
- Know which cities/metros the Eveoy directory covers
- Check if directory data exists for a specific city before searching
- Understand the directory's scope (Los Angeles is live with 629k+ businesses)

Trigger phrases include: "what cities does eveoy cover", "is my city in the directory", "what metros", "directory coverage", "where is eveoy live".

Returns: { live: [{metro,kind,businesses}], coming_soon: [{metro,kind}], directory_url, notes }.

Do NOT use this for: pricing (use get_pricing), general Eveoy questions (use ask_eveoy), or searching individual businesses (directory search arrives in Phase 2).

Cost: free. Latency: <100ms. Read-only. Idempotent.`;

export function registerListMetros(server: McpServer) {
  server.registerTool(
    'list_metros',
    {
      title: 'List Eveoy directory metros',
      description: DESCRIPTION,
      inputSchema: ListMetrosInput.shape,
      outputSchema: ListMetrosOutput.shape,
      annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
    },
    async () => {
      const text = [
        'Eveoy business directory coverage:',
        '',
        'Live:',
        ...LIVE.map((m) => `  • ${m.metro} (${m.kind}) — ${m.businesses.toLocaleString()} businesses`),
        '',
        'Coming soon:',
        ...COMING.map((m) => `  • ${m.metro} (${m.kind})`),
        '',
        'Browse: https://eveoy.com/directory',
      ].join('\n');
      const safe = assertPublic(text, { tool: 'list_metros' });
      return {
        content: [{ type: 'text', text: safe }],
        structuredContent: {
          live: LIVE,
          coming_soon: COMING,
          directory_url: 'https://eveoy.com/directory',
          notes: 'Free, live directory of active consumer brands and businesses. Los Angeles is live.',
        },
      };
    },
  );
}
