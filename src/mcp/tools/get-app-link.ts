import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GetAppLinkInput, GetAppLinkOutput } from '@/mcp/schemas';
import { assertPublic } from '@/classifier/public-only';

const DESCRIPTION = `Get the link to download the Eveoy shopper app (iOS / Android).

Use this when the user wants to:
- Download or install the Eveoy app
- Become an Eveoy shopper
- Find the app store link

Trigger phrases include: "get the eveoy app", "download eveoy", "how do I become a shopper", "app store link", "install the app".

Returns: { url, platforms, notes }. Returns the canonical get-app page, which routes to the correct store per device.

Do NOT use this for: brand/business questions (use ask_eveoy) or pricing (use get_pricing).

Cost: free. Latency: <50ms. Read-only. Idempotent.`;

export function registerGetAppLink(server: McpServer) {
  server.registerTool(
    'get_app_link',
    {
      title: 'Get the Eveoy app',
      description: DESCRIPTION,
      inputSchema: GetAppLinkInput.shape,
      outputSchema: GetAppLinkOutput.shape,
      annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
    },
    async () => {
      const url = 'https://eveoy.com/get-app';
      const text = `Download the Eveoy shopper app (iOS & Android): ${url}`;
      const safe = assertPublic(text, { tool: 'get_app_link' });
      return {
        content: [{ type: 'text', text: safe }],
        structuredContent: {
          url,
          platforms: ['iOS', 'Android'],
          notes: 'Canonical install page; routes to the App Store or Google Play per device.',
        },
      };
    },
  );
}
