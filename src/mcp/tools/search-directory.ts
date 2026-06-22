import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SearchDirectoryInput } from '@/mcp/schemas';
import { callEdge, edgeErrorMessage } from '@/integrations/edge';
import { assertNoSecrets } from '@/classifier/public-only';

const DESCRIPTION = `Search the Eveoy business directory — real consumer brands, stores, and businesses by city, name, or NAICS code. Currently Los Angeles is live.

Use this when the user wants to:
- Find businesses in a city/metro ("coffee shops in LA")
- Look up a business by name
- Filter by NAICS industry code
- Page through directory results

Trigger phrases include: "search the directory", "find businesses in", "coffee shops in LA", "look up stores", "what businesses are in", "directory search".

Returns: { items: [{ id, full_slug, store_name, msa, naics_code, naics_description, short_description, rating, review_count, logo_url }], nextCursor }. Paginate by passing nextCursor as the next request's "after".

Do NOT use this for: a single known business (use get_business), pricing (use get_pricing), or general Eveoy questions (use ask_eveoy).

Cost: free. Latency: fast. Read-only. Idempotent.`;

export function registerSearchDirectory(server: McpServer) {
  server.registerTool(
    'search_directory',
    {
      title: 'Search the Eveoy directory',
      description: DESCRIPTION,
      inputSchema: SearchDirectoryInput.shape,
      annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
    },
    async ({ q, metro, naics, limit, after }) => {
      try {
        const data = await callEdge<{ items: unknown[]; nextCursor: string | null }>(
          '/directory-query',
          { q, metro, naics, limit, after },
        );
        const safe = assertNoSecrets(data, { tool: 'search_directory' });
        const items = (safe as { items?: unknown[] }).items ?? [];
        return {
          content: [{ type: 'text', text: `Found ${items.length} result(s).` }],
          structuredContent: safe as Record<string, unknown>,
        };
      } catch (err) {
        return { content: [{ type: 'text', text: edgeErrorMessage(err) }], isError: true };
      }
    },
  );
}
