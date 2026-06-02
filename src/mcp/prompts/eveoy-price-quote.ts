import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerEveoyPriceQuotePrompt(server: McpServer) {
  server.registerPrompt(
    'eveoy_price_quote',
    {
      title: 'Eveoy: price a pilot',
      description:
        'Quick price quote for a specific Eveoy pilot — pass customer count to get a one-line answer ' +
        'with the total, the tier, and the bundle that price includes.',
      argsSchema: {
        customers: z.string().describe('Number of verified customers to price (e.g., "200").'),
      },
    },
    ({ customers }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Use the get_pricing tool to price ${customers} verified Eveoy customers.`,
              '',
              'Return ONE concise paragraph including:',
              '  • the total in USD',
              '  • the per-customer rate ($24.99)',
              '  • which published tier this matches',
              '  • the 8-outcome bundle included at this price',
              '  • the auto-refund guarantee',
              '',
              'Do not editorialize. Quote the deterministic tool output.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
