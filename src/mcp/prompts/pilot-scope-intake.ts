import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPilotScopeIntakePrompt(server: McpServer) {
  server.registerPrompt(
    'pilot_scope_intake',
    {
      title: 'Guided pilot scoping',
      description:
        'Walks a prospect through the same inputs eveoy.com/order asks for, then prices the pilot and ' +
        'hands the buyer off to eveoy.com/order to complete payment.',
    },
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'You are helping me scope an Eveoy pilot. Ask me, one question at a time, the same things',
              'the eveoy.com/order form asks for — in this order:',
              '',
              '  1. Your name',
              '  2. Your work email',
              '  3. Your brand website',
              '  4. Your phone',
              '  5. Shoppers per location  (20–1,000 · default 40 = the "$999 pilot")',
              '  6. Number of locations  (1–50 · default 1)',
              '  7. Campaign experience start date  (any date ≥ 14 days from today)',
              '  8. (optional) Advanced targeting:',
              '     • age buckets — any of: 13-17, 18-24, 25-34, 35-44, 45-54, 55+',
              '     • location type — Country | Region/State | DMA (US) | City | ZIP',
              '     • location values — list of strings matching the selected type',
              '     • gender — Men, Women, or skip for All',
              '     • household income — any of: Top 5%, Top 10%, Top 10-25%, Top 25-50%',
              '',
              'When you have shoppers_per_location and locations, call the get_pricing tool to compute',
              'the exact total. Confirm the price with me. Then summarize all collected fields and send',
              'me to https://www.eveoy.com/order to complete payment.',
              '',
              'Do not invent constraints — quote the validation directly from the get_pricing tool',
              'error if I pick something out of range.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
