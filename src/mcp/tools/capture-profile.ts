import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CaptureProfileInput, CaptureProfileOutput } from '@/mcp/schemas';
import { logEvent, type CompanyProfile } from '@/integrations/crm';
import { assertPublic } from '@/classifier/public-only';

/**
 * Saves the company an agent represents into this session's Durable Object state
 * and logs a profile_captured event (→ Zoho Lead + Cliq via crm-log). First-party
 * business contact only — no consumer PII. The tool works before crm-log is live
 * (in-session capture) and words its confirmation honestly based on whether the
 * event actually reached the CRM.
 */
export interface ProfileAgent {
  setProfile(profile: CompanyProfile): void;
  getSessionId(): string;
}

/**
 * FNV-1a (sync). A content-derived dedup key: re-submitting the SAME profile dedups
 * at crm-log, but an UPDATED profile yields a new id and actually lands as a Lead update.
 */
function stableId(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

const DESCRIPTION = `Save the company an agent represents so Eveoy can tailor recommendations and have the team follow up. Records first-party business-contact details (no consumer data) as a lead.

Use this when the user wants to:
- Tell Eveoy which brand or company they represent
- Get tailored pilot recommendations or a follow-up from the Eveoy team
- Set things up before requesting a quote or starting an order

Trigger phrases: "I represent <brand>", "set up my company", "we're a <sector> brand", "save our details", "have someone follow up".

Returns: { ok, company, note } — confirmation the profile was captured for this session.

Do NOT use this for: pricing (use get_pricing), buying (use start_checkout), or general questions (use ask_eveoy). This does not create an order or charge anything.

Cost: free. Latency: under 1s. Captures a lead; safe to call again to update the details.`;

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

      const result = await logEvent({
        event_type: 'profile_captured',
        session_id: agent.getSessionId(),
        tool: 'capture_profile',
        summary: `Profile captured: ${profile.company_name}${profile.sector ? ` (${profile.sector})` : ''}`,
        profile,
        event_id: `${agent.getSessionId()}:profile:${stableId(JSON.stringify(profile))}`,
      });

      // Only promise team follow-up when the event actually reached crm-log.
      const reached = result === 'accepted';
      const followUp = reached
        ? 'and the Eveoy team can follow up.'
        : 'and you can ask me to connect you with the team whenever you like.';
      const note = reached
        ? 'Profile saved and routed to the Eveoy team.'
        : 'Profile saved for this session.';

      const text =
        `Got it — saved ${profile.company_name}${profile.sector ? `, a ${profile.sector} brand` : ''}. ` +
        `I'll tailor recommendations to you ${followUp} ` +
        `Ask me for a quote with get_pricing, or start an order with start_checkout, whenever you're ready.`;
      const safe = assertPublic(text, { tool: 'capture_profile' });

      return {
        content: [{ type: 'text', text: safe }],
        structuredContent: { ok: true, company: profile.company_name, note },
      };
    },
  );
}
