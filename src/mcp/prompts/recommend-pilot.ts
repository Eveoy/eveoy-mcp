import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerRecommendPilotPrompt(server: McpServer) {
  server.registerPrompt(
    'recommend_pilot',
    {
      title: 'Eveoy: recommend a pilot',
      description:
        'Guided flow to recommend an Eveoy pilot: qualify the brand (sector, number of stores, goal), ' +
        'price it with get_pricing, explain what each $24.99 verified visit includes, and offer to save ' +
        'the profile (capture_profile) and start checkout (start_checkout).',
      argsSchema: {
        sector: z.string().optional().describe("The brand's industry sector, if known."),
        locations: z.string().optional().describe('Number of physical store locations, if known.'),
        goal: z.string().optional().describe('Primary goal: foot traffic, in-store UGC, a launch, etc.'),
      },
    },
    ({ sector, locations, goal }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Help me scope and recommend an Eveoy pilot. Work through this, asking only for what I have not given:',
              '',
              `  • Sector: ${sector ?? '(ask me)'}`,
              `  • Store locations: ${locations ?? '(ask me — default 1)'}`,
              `  • Primary goal: ${goal ?? '(ask me — e.g. foot traffic, in-store UGC, a launch)'}`,
              '  • Shoppers per location (20–1,000 · default 40 = the published "$999 Starter pilot")',
              '',
              'Then:',
              '  1. Call get_pricing with shoppers-per-location and locations for the exact total.',
              '  2. Explain the model plainly: Eveoy is pay-per-visit at $24.99 per verified in-store',
              '     customer. Each visit = a real shopper who came in, spent 10+ minutes, made a purchase,',
              '     and brought back ~2 on-brand in-store UGC photos (the customer with your products).',
              '     Not clicks, not impressions, not a contract — you pay per real visit, and no-shows',
              '     are 100% refunded.',
              '  3. Tie it to my goal (foot traffic → more visits; UGC → the photos compound; a launch →',
              '     concentrate visits around the date).',
              '  4. Offer next steps: capture_profile to save my company so the team can tailor and follow',
              '     up, and start_checkout to buy when I am ready.',
              '',
              'Quote get_pricing\'s deterministic numbers exactly. Do not invent pricing or constraints.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
