import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SubscribeNewsletterInput } from '@/mcp/schemas';
import { callEdge, edgeErrorMessage } from '@/integrations/edge';
import { logEvent } from '@/integrations/crm';
import type { ToolAgent } from '@/mcp/tool-agent';

const DESCRIPTION = `Subscribe an email address to the Eveoy newsletter (case studies + lookbooks).

Use this when the user EXPLICITLY asks to subscribe or sign up for updates.

Trigger phrases include: "subscribe me", "sign me up for the newsletter", "add my email to updates", "join the Eveoy list".

Returns: { ok: true }.

Do NOT use this for: anything other than an explicit newsletter opt-in. Always confirm the email with the user before calling — this writes data.

Cost: free. Latency: fast. Writes data (creates a subscription). Confirm first.`;

export function registerSubscribeNewsletter(server: McpServer, agent: ToolAgent) {
  server.registerTool(
    'subscribe_newsletter',
    {
      title: 'Subscribe to the Eveoy newsletter',
      description: DESCRIPTION,
      inputSchema: SubscribeNewsletterInput.shape,
      annotations: { readOnlyHint: false, openWorldHint: true, idempotentHint: true },
    },
    async ({ email }) => {
      void logEvent({
        event_type: 'newsletter',
        session_id: agent.getSessionId(),
        tool: 'subscribe_newsletter',
        summary: 'Newsletter subscription via MCP',
      });
      try {
        await callEdge('/subscribe-beehiiv', {
          email,
          source: 'mcp',
          utm_source: 'mcp.eveoy.com',
          utm_medium: 'mcp',
          utm_campaign: 'eveoy-mcp',
        });
        return { content: [{ type: 'text', text: `Subscribed ${email} to the Eveoy newsletter.` }] };
      } catch (err) {
        return { content: [{ type: 'text', text: edgeErrorMessage(err) }], isError: true };
      }
    },
  );
}
