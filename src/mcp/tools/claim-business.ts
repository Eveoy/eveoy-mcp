import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ClaimBusinessInput } from '@/mcp/schemas';
import { config } from '@/config';
import { callEdge, edgeErrorMessage } from '@/integrations/edge';
import { logEvent } from '@/integrations/crm';
import type { ToolAgent } from '@/mcp/tool-agent';
import { assertNoSecrets } from '@/classifier/public-only';

// Parity rule (Lovable CLAUDE_CODE_INSTRUCTIONS §4.4): this tool MUST mirror the
// website's unlock flow EXACTLY — same endpoint, same payload, same response
// handling. Do NOT branch the logic, do NOT run our own AI lookup / freshness
// check / lead insert. /unlock-business IS the complete claim contract: it
// inserts the lead, returns city-record IDs, and reveals contacts (with JIT AI
// enrichment when stale). There is no separate ownership-writeback step — now or
// ever. "Claim ownership" === submit the email through /unlock-business.

const DESCRIPTION = `Claim an Eveoy directory listing — submits the claimant's email and returns the business's city record + best-known contact details (with just-in-time enrichment when stale).

Use this when the user wants to:
- Claim a business listing they own ("claim ownership" is this same flow)
- Get verified contact details for a directory business

Trigger phrases include: "claim this business", "claim ownership of my listing", "I own this store", "reveal the contact info for", "claim my listing".

Returns: { ok, cached, city_record { naics_code, council_district, account_number }, contacts { phone, email, website, hours, representative, representative_title, ...sources, enriched_at }, rating, rating_source }. cached=false means a fresh lookup just ran.

Do NOT use this for: browsing (use search_directory) or public details only (use get_business). Requires the claimant's email + the listing full_slug. Confirm the email with the user before calling — this captures a lead.

Cost: free. Latency: up to ~12s if a just-in-time lookup runs. Writes data (lead capture). Confirm first.`;

export function registerClaimBusiness(server: McpServer, agent: ToolAgent) {
  server.registerTool(
    'claim_business',
    {
      title: 'Claim an Eveoy directory listing',
      description: DESCRIPTION,
      inputSchema: ClaimBusinessInput.shape,
      annotations: { readOnlyHint: false, openWorldHint: true, idempotentHint: false },
    },
    async ({ email, full_slug }) => {
      void logEvent({ event_type: 'directory', session_id: agent.getSessionId(), tool: 'claim_business', summary: `Directory listing claimed: ${(full_slug ?? '').toString().slice(0, 80)}` });
      try {
        // Mirror the site's payload exactly. No extra logic — the edge fn owns everything.
        const data = await callEdge('/unlock-business', {
          email,
          full_slug,
          source_url: `${config().siteUrl}/directory/store/${full_slug}`,
        });
        // Surface the response verbatim (still guarded for secrets/internal data).
        const safe = assertNoSecrets(data, { tool: 'claim_business' });
        return {
          content: [{ type: 'text', text: 'Listing matched — city record + contacts returned.' }],
          structuredContent: safe as Record<string, unknown>,
        };
      } catch (err) {
        return { content: [{ type: 'text', text: edgeErrorMessage(err) }], isError: true };
      }
    },
  );
}
