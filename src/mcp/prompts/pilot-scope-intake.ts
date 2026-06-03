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
              'the eveoy.com/order form asks for:',
              '',
              '  1. Your name',
              '  2. Your work email',
              '  3. Your brand website',
              '  4. Your phone',
              '  5. Shoppers per location (between 20 and 1,000 — the "$999 pilot" default is 40)',
              '  6. Number of locations (between 1 and 50; default 1)',
              '  7. Campaign experience start date (any date from ~2 weeks out)',
              '',
              'When you have shoppers_per_location and locations, call the get_pricing tool to compute',
              'the exact total. Confirm the price with me, then summarize all collected fields and',
              'send me to https://eveoy.com/order to complete payment with the values pre-set.',
              '',
              'Do not invent constraints — quote the validation directly from the get_pricing tool error if I pick something out of range.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
