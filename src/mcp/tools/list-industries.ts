import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListIndustriesInput } from '@/mcp/schemas';
import { INDUSTRIES_PUBLIC } from '@/industries';
import { assertPublic } from '@/classifier/public-only';

const DESCRIPTION =
  'List the industries Eveoy serves — 23+ sectors across retail, food, beauty, hospitality, and more.';

export function registerListIndustries(server: McpServer) {
  server.registerTool(
    'list_industries',
    {
      title: 'List industries',
      description: DESCRIPTION,
      inputSchema: ListIndustriesInput.shape,
    },
    async () => {
      const text = [
        'Eveoy serves 23+ sectors. Public sector list:',
        '',
        ...INDUSTRIES_PUBLIC.map((s) => `  • ${s}`),
        '',
        'Built for every aisle, every shelf, every store.',
      ].join('\n');

      const safe = assertPublic(text, { tool: 'list_industries' });
      return { content: [{ type: 'text', text: safe }] };
    },
  );
}
