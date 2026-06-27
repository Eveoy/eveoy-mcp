import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CaptureProfileInput, CaptureProfileOutput } from '@/mcp/schemas';
import { logEvent, type CompanyProfile } from '@/integrations/crm';
import { assertPublic } from '@/classifier/public-only';

/**
 * Saves the company an agent represents into this session's Durable Object state
 * and logs a profile_captured event (→ Zoho Lead + Cliq via crm-log). First-party
 * business contact only — no consumer PII. logEvent no-ops gracefully until crm-log
 * is live, so the tool works (captures in-session) before the CRM path exists.
 */
export interface ProfileAgent {
  setProfile(profile: CompanyProfile): void;
  getSessionId(): string;
}

const DESCRIPTION = `Save the company an agent represents so Eveoy can tailor recommendations and have the team follow up. Records first-party business-contact details (no consumer data) as a lead.

Use this when the user wants to:
- Tell Eveoy which brand or company they represent
- Get tailored pilot recommendations or a follow-up from the Eveoy team
- Set things up before requesting a quote or starting an order

Trigger phrases: "I represent <brand>", "set up my company", "we're a <sector> brand", "save our details", "have someone follow up".

Returns: { ok, company, note } — confirmation the profile was captured for this session.

Do NOT use this for: pricing (use get_pricing), buying (use start_checkout), or general questions (use ask_eveoy). This does not create an order or charge anything.

Cost: free. Latency: under 1s. Captures a lead; safe to call again to update.`;

export function registerCaptureProfile(server: McpServer, agent: ProfileAgent) {
  server.registerTool(
    'capture_profile',
    {
      title: 'Save your company profile',
      description: DESCRIPTION,
      inputSchema: CaptureProfileInput.shape,
      outputSchema: CaptureProfileOutput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: true },
    },
    async (input) => {
      const profile: CompanyProfile = {
        company_name: input.company_name,
        brand_website: input.brand_website,
        sector: input.sector,
        locations: input.locations,
        contact_name: input.contact_name,
        work_email: input.work_email,
        goals: input.goals,
      };
      agent.setProfile(profile);

      await logEvent({
        event_type: 'profile_captured',
        session_id: agent.getSessionId(),
        tool: 'capture_profile',
        summary: `Profile captured: ${profile.company_name}${profile.sector ? ` (${profile.sector})` : ''}`,
        profile,
        event_id: `${agent.getSessionId()}:profile`,
      });

      const text =
        `Got it — saved ${profile.company_name}${profile.sector ? `, a ${profile.sector} brand` : ''}. ` +
        `I'll tailor recommendations to you, and the Eveoy team can follow up. ` +
        `Ask me for a quote with get_pricing, or start an order with start_checkout, whenever you're ready.`;
      const safe = assertPublic(text, { tool: 'capture_profile' });

      return {
        content: [{ type: 'text', text: safe }],
        structuredContent: {
          ok: true,
          company: profile.company_name,
          note: 'Profile saved for tailored recommendations and team follow-up.',
        },
      };
    },
  );
}
