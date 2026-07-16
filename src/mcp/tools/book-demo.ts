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

Pass contact_name, work_email, and company_name when you know them (or call capture_profile first) — they prefill the booking page and let the Eveoy team know who is coming; without them the request arrives anonymous.

Returns: { url } — the Eveoy demo-booking page, prefilled when contact details were provided.

Do NOT use this for: pricing (use get_pricing), buying (use start_checkout), or questions (use ask_eveoy).

Cost: free. Latency: under 1s. Notifies the Eveoy team that a demo was requested.`;

/**
 * Resolve who is asking: explicit tool inputs win, then the session profile
 * saved by capture_profile. With only an email, the domain stands in for the
 * company so the Zoho Lead is still identifiable. Returns undefined when we
 * know nothing (the event is then logged without a profile, as before).
 */
function resolveIdentity(
  input: { contact_name?: string; work_email?: string; company_name?: string },
  session: CompanyProfile | undefined,
): CompanyProfile | undefined {
  const contact_name = input.contact_name ?? session?.contact_name;
  const work_email = input.work_email ?? session?.work_email;
  const company_name =
    input.company_name ?? session?.company_name ?? (work_email ? work_email.split('@')[1] : undefined);
  if (!company_name && !work_email) return undefined;
  return {
    ...(session ?? {}),
    company_name: company_name ?? 'Unknown (MCP demo request)',
    ...(contact_name ? { contact_name } : {}),
    ...(work_email ? { work_email } : {}),
  };
}

export function registerBookDemo(server: McpServer, agent: DemoAgent) {
  server.registerTool(
    'book_demo',
    {
      title: 'Book an Eveoy demo',
      description: DESCRIPTION,
      inputSchema: BookDemoInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async (input) => {
      const session = agent.getSessionId();
      const who = resolveIdentity(input ?? {}, agent.state?.profile);

      const params = new URLSearchParams({ topic: 'mcp', utm_source: 'mcp.eveoy.com', utm_medium: 'mcp' });
      if (who?.company_name) params.set('utm_campaign', who.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      if (who?.contact_name) params.set('name', who.contact_name);
      if (who?.work_email) params.set('email', who.work_email);
      const url = `${config().siteUrl}/book-demo?${params.toString()}`;

      // High-intent: fire-and-forget-safe logEvent (never throws) → Zoho Lead + Cliq.
      await logEvent({
        event_type: 'demo_booked',
        session_id: session,
        tool: 'book_demo',
        summary: `Demo requested via MCP${who ? ` — ${who.company_name}${who.work_email ? ` (${who.work_email})` : ''}` : ''}`,
        profile: who,
        event_id: `${session}:demo`,
      });
      return {
        content: [{ type: 'text', text: `Book a live Eveoy demo: ${url}` }],
        structuredContent: { url },
      };
    },
  );
}
