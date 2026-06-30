import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RequestHumanInput, RequestHumanOutput } from '@/mcp/schemas';
import { logEvent, type CompanyProfile } from '@/integrations/crm';
import { assertPublic } from '@/classifier/public-only';

/**
 * Hand off to a human on the Eveoy team. High-intent: logs human_requested (→ Zoho
 * Activity + Lead when a profile was captured + a Cliq ping) so the team is notified.
 */
export interface RequestHumanAgent {
  getSessionId(): string;
  state?: { profile?: CompanyProfile };
}

const DESCRIPTION = `Hand off to a human on the Eveoy team and flag the conversation for follow-up.

Use this when the user wants to:
- Talk to a person or a sales rep (not just book a demo slot)
- Get help the other tools cannot give
- Escalate a question or ask for a callback

Trigger phrases: "talk to a human", "connect me with someone", "I need a person", "have someone call me", "escalate this".

Returns: { ok, note } — confirmation the Eveoy team was notified.

Do NOT use this for: booking a demo slot (use book_demo), pricing (use get_pricing), or general questions (use ask_eveoy).

Cost: free. Latency: under 1s. Notifies the Eveoy team (high-intent).`;

export function registerRequestHuman(server: McpServer, agent: RequestHumanAgent) {
  server.registerTool(
    'request_human',
    {
      title: 'Talk to a human',
      description: DESCRIPTION,
      inputSchema: RequestHumanInput.shape,
      outputSchema: RequestHumanOutput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async (input) => {
      const session = agent.getSessionId();
      const profile = agent.state?.profile;

      const metadata: Record<string, string> = {};
      if (input.reason) metadata.reason = input.reason.slice(0, 500);
      if (input.work_email) metadata.work_email = input.work_email;
      if (input.contact_name) metadata.contact_name = input.contact_name;

      await logEvent({
        event_type: 'human_requested',
        session_id: session,
        tool: 'request_human',
        summary: `Human handoff requested${profile?.company_name ? ` — ${profile.company_name}` : ''}${input.reason ? `: ${input.reason.slice(0, 160)}` : ''}`,
        profile,
        metadata: Object.keys(metadata).length ? metadata : undefined,
        event_id: `${session}:human`,
      });

      const text = assertPublic(
        "Got it — I've notified the Eveoy team and someone will reach out. Anything else I can help with in the meantime?",
        { tool: 'request_human' },
      );
      return {
        content: [{ type: 'text', text }],
        structuredContent: { ok: true, note: 'The Eveoy team has been notified.' },
      };
    },
  );
}
