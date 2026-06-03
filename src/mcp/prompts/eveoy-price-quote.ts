import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerEveoyPriceQuotePrompt(server: McpServer) {
  server.registerPrompt(
    'eveoy_price_quote',
    {
      title: 'Eveoy: price a pilot',
      description:
        'Quick price quote for an Eveoy pilot — pass shoppers per location and number of locations ' +
        'to get a one-line answer with the total, the per-shopper rate, and the next step.',
      argsSchema: {
        shoppers_per_location: z.string().describe('Verified shoppers per store (20–1,000). Default 40.'),
        locations: z.string().optional().describe('Store locations (1–50). Default 1.'),
      },
    },
    ({ shoppers_per_location, locations }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Use the get_pricing tool with shoppers_per_location=${shoppers_per_location}${locations ? `, locations=${locations}` : ''}.`,
              '',
              'Return ONE concise paragraph including:',
              '  • the total in USD',
              '  • the per-shopper rate ($24.99)',
              '  • whether this matches the published "$999 pilot" default (40 × 1 location)',
              '  • the 8-outcome bundle included at this price',
              '  • the 100%-refunded-for-no-shows guarantee',
              '  • the link to complete the order: https://eveoy.com/order',
              '',
              'Do not editorialize. Quote the deterministic tool output.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
