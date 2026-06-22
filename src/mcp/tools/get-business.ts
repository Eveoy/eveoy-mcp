import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GetBusinessInput } from '@/mcp/schemas';
import { callEdge, edgeErrorMessage } from '@/integrations/edge';
import { assertNoSecrets } from '@/classifier/public-only';

const DESCRIPTION = `Fetch a single business from the Eveoy directory by slug or id.

Use this when the user wants to:
- Get full details for one specific business
- Follow up on a search_directory result (use its full_slug)
- See a business's hours, categories, brands sold, rating

Trigger phrases include: "details for this business", "tell me about <store>", "open this listing", "get the business at <slug>".

Returns: { business: { id, full_slug, store_name, msa, naics_code, naics_description, description, hours, rating, review_count, brands_sold, categories, url } }.

Do NOT use this for: searching/browsing (use search_directory) or general Eveoy questions (use ask_eveoy). Requires either slug or id.

Cost: free. Latency: fast. Read-only. Idempotent.`;

export function registerGetBusiness(server: McpServer) {
  server.registerTool(
    'get_business',
    {
      title: 'Get a directory business',
      description: DESCRIPTION,
      inputSchema: GetBusinessInput.shape,
      annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
    },
    async ({ slug, id }) => {
      if (!slug && !id) {
        return { content: [{ type: 'text', text: 'Provide a business slug or id.' }], isError: true };
      }
      try {
        const data = await callEdge<{ business: unknown }>('/directory-business', slug ? { slug } : { id });
        const safe = assertNoSecrets(data, { tool: 'get_business' });
        return {
          content: [{ type: 'text', text: 'Business found.' }],
          structuredContent: safe as Record<string, unknown>,
        };
      } catch (err) {
        return { content: [{ type: 'text', text: edgeErrorMessage(err) }], isError: true };
      }
    },
  );
}
