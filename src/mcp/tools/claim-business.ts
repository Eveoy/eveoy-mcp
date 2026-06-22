import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ClaimBusinessInput } from '@/mcp/schemas';
import { config } from '@/config';
import { callEdge, edgeErrorMessage } from '@/integrations/edge';
import { assertNoSecrets } from '@/classifier/public-only';

const DESCRIPTION = `Claim / look up an Eveoy directory listing — captures the claimant's email and returns the business's best-known contact details.

Use this when the user wants to:
- Claim a business listing they own
- Get verified contact details for a directory business

Trigger phrases include: "claim this business", "I own this store", "reveal the contact info for", "claim my listing".

Returns: { store_location_id, contacts: { phone, email, website, hours }, enriched_at }.

Do NOT use this for: browsing (use search_directory) or fetching public details only (use get_business). Requires the claimant's email + the listing full_slug. Confirm the email with the user before calling — this captures a lead.

Cost: free. Latency: medium (may do a just-in-time lookup). Writes data (lead capture). Confirm first.`;

export function registerClaimBusiness(server: McpServer) {
  server.registerTool(
    'claim_business',
    {
      title: 'Claim an Eveoy directory listing',
      description: DESCRIPTION,
      inputSchema: ClaimBusinessInput.shape,
      annotations: { readOnlyHint: false, openWorldHint: true, idempotentHint: false },
    },
    async ({ email, full_slug }) => {
      try {
        const data = await callEdge('/unlock-business', {
          email,
          full_slug,
          source_url: `${config().siteUrl}/directory`,
        });
        const safe = assertNoSecrets(data, { tool: 'claim_business' });
        return {
          content: [{ type: 'text', text: 'Listing matched — contact details returned.' }],
          structuredContent: safe as Record<string, unknown>,
        };
      } catch (err) {
        return { content: [{ type: 'text', text: edgeErrorMessage(err) }], isError: true };
      }
    },
  );
}
