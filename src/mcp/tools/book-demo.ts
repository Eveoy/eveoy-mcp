import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BookDemoInput } from '@/mcp/schemas';
import { config } from '@/config';
import { logEvent, type CompanyProfile } from '@/integrations/crm';

/** book_demo needs the session id to log the high-intent demo_booked event (→ Cliq). */
export interface DemoAgent {
  getSessionId(): string;
  state?: { profile?: CompanyProfile };
}

const DESCRIPTION = `Get the link to book a live Eveoy demo, and flag the request to the Eveoy team.

Use this when the user wants to:
- Schedule a demo or walkthrough
- Talk to the Eveoy team

Trigger phrases include: "book a demo", "schedule a call", "talk to sales", "get a walkthrough".

Returns: { url } — the Eveoy demo-booking page.

Do NOT use this for: pricing (use get_pricing), buying (use start_checkout), or questions (use ask_eveoy).

Cost: free. Latency: under 1s. Notifies the Eveoy team that a demo was requested.`;

export function registerBookDemo(server: McpServer, agent: DemoAgent) {
  server.registerTool(
    'book_demo',
    {
      title: 'Book an Eveoy demo',
      description: DESCRIPTION,
      inputSchema: BookDemoInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async () => {
      const url = `${config().siteUrl}/book-demo`;
      const session = agent.getSessionId();
      // High-intent: fire-and-forget-safe logEvent (never throws) → Zoho Activity + Cliq.
      await logEvent({
        event_type: 'demo_booked',
        session_id: session,
        tool: 'book_demo',
        summary: `Demo requested via MCP${agent.state?.profile?.company_name ? ` — ${agent.state.profile.company_name}` : ''}`,
        profile: agent.state?.profile,
        event_id: `${session}:demo`,
      });
      return {
        content: [{ type: 'text', text: `Book a live Eveoy demo: ${url}` }],
        structuredContent: { url },
      };
    },
  );
}
