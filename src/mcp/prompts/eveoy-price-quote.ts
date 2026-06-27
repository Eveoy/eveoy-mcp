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
        customers_per_location: z
          .string()
          .describe('Verified shoppers per store (20–1,000). UI label is "Shoppers per location". Default 40.'),
        locations: z.string().optional().describe('Store locations (1–50). Default 1.'),
      },
    },
    ({ customers_per_location, locations }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Use the get_pricing tool with customers_per_location=${customers_per_location}${locations ? `, locations=${locations}` : ''}.`,
              '',
              'Return ONE concise paragraph including:',
              '  • the total in USD',
              '  • the per-shopper rate ($24.99)',
              '  • whether this matches the published "$999 pilot" default (40 × 1 location)',
              '  • the 8-outcome bundle included at this price',
              '  • the 100%-refunded-for-no-shows guarantee',
              '  • a reminder that the campaign start date must be ≥ 14 days from today',
              '  • the link to complete the order: https://www.eveoy.com/order',
              '',
              'Do not editorialize. Quote the deterministic tool output.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
