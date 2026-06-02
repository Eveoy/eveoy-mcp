import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPilotScopeIntakePrompt(server: McpServer) {
  server.registerPrompt(
    'pilot_scope_intake',
    {
      title: 'Guided pilot scoping',
      description: 'Walks a prospect through choosing the right Eveoy pilot size and target market.',
    },
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'You are helping me design an Eveoy pilot. Ask me, one question at a time:',
              '  1. What brand is this for?',
              '  2. What city or metro should the pilot run in?',
              '  3. What industry / store category?',
              '  4. What outcome am I trying to prove? (foot traffic, content for paid social, sales lift, CRM acquisition)',
              '  5. What budget tier fits — $999 (40 customers), $2,499 (100), $9,996 (400), $24,990 (1,000), or larger?',
              '',
              'Once you have all five, summarize the proposed pilot and call the create_pilot_order tool with the values.',
              'Confirm the exact total before creating the order. Use the public Eveoy pricing only.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
