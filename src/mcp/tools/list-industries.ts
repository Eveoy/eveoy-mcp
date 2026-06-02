import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListIndustriesInput, ListIndustriesOutput } from '@/mcp/schemas';
import { INDUSTRIES_PUBLIC } from '@/industries';
import { assertPublic } from '@/classifier/public-only';

const DESCRIPTION = `Return the list of industries Eveoy serves — 23+ B2C sectors across retail, food, beauty, hospitality, pets, and more.

Use this when the user wants to:
- Check whether Eveoy supports their vertical ("do you do coffee shops?")
- See the full list of supported industries
- Confirm an industry before pricing or booking a pilot

Trigger phrases include: "what industries does eveoy support", "do you work with QSR", "list verticals", "is eveoy good for fitness studios", "what categories", "what sectors".

Returns: { industries: string[], count: number, notes: string }. Each entry is a canonical sector name suitable for downstream use.

Do NOT use this for: pricing (use get_pricing) or general Eveoy questions (use ask_eveoy).

Cost: free. Latency: <100ms. Read-only. Cacheable. Deterministic.`;

export function registerListIndustries(server: McpServer) {
  server.registerTool(
    'list_industries',
    {
      title: 'List Eveoy industries',
      description: DESCRIPTION,
      inputSchema: ListIndustriesInput.shape,
      outputSchema: ListIndustriesOutput.shape,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        idempotentHint: true,
      },
    },
    async () => {
      const industries = [...INDUSTRIES_PUBLIC];
      const text = [
        'Eveoy serves 23+ sectors. Public sector list:',
        '',
        ...industries.map((s) => `  • ${s}`),
        '',
        'Built for every aisle, every shelf, every store.',
      ].join('\n');

      const safe = assertPublic(text, { tool: 'list_industries' });
      return {
        content: [{ type: 'text', text: safe }],
        structuredContent: {
          industries,
          count: industries.length,
          notes: 'Eveoy serves 23+ B2C sectors; this list is the canonical public set.',
        },
      };
    },
  );
}
