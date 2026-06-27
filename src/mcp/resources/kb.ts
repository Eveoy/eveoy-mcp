import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { KB_KEYS, loadKb, type KbKey } from '@/knowledge/kb-loader';
import { assertPublic } from '@/classifier/public-only';

const TITLES: Record<KbKey, string> = {
  overview:   'Eveoy — Overview',
  product:    'Eveoy — How it works',
  pricing:    'Eveoy — Pricing',
  comparison: 'Eveoy — Head-to-head comparison',
  'why-now':  'Eveoy — Why now',
  'ugc-ripple':'Eveoy — UGC ripple effect',
  sectors:    'Eveoy — Industries served',
  directory:  'Eveoy — Business directory',
  validation: 'Eveoy — Proof, validation, and fit',
  'for-agents':'Eveoy — How to use this server (agent guide)',
};

export function registerKbResources(server: McpServer) {
  for (const key of KB_KEYS) {
    server.registerResource(
      `kb-${key}`,
      `eveoy://kb/${key}`,
      {
        title: TITLES[key],
        description: `Curated public Eveoy knowledge — ${key}. Safe for any external context.`,
        mimeType: 'text/markdown',
      },
      async (uri) => {
        const content = loadKb(key);
        const safe = assertPublic(content, { resource: `kb/${key}` });
        return {
          contents: [{ uri: uri.href, mimeType: 'text/markdown', text: safe }],
        };
      },
    );
  }
}
