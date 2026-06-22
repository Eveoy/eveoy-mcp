import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BookDemoInput } from '@/mcp/schemas';
import { config } from '@/config';

const DESCRIPTION = `Get the link to book a live Eveoy demo.

Use this when the user wants to:
- Schedule a demo or walkthrough
- Talk to the Eveoy team

Trigger phrases include: "book a demo", "schedule a call", "talk to sales", "get a walkthrough".

Returns: { url } — the Eveoy demo-booking page.

Do NOT use this for: pricing (use get_pricing), buying (use start_checkout), or questions (use ask_eveoy).

Cost: free. Latency: instant. Read-only.`;

export function registerBookDemo(server: McpServer) {
  server.registerTool(
    'book_demo',
    {
      title: 'Book an Eveoy demo',
      description: DESCRIPTION,
      inputSchema: BookDemoInput.shape,
      annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
    },
    async () => {
      const url = `${config().siteUrl}/book-demo`;
      return {
        content: [{ type: 'text', text: `Book a live Eveoy demo: ${url}` }],
        structuredContent: { url },
      };
    },
  );
}
