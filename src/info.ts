import { PROMPTS, enabledCapabilities } from '@/mcp/capabilities';
import { pricingExamples, UNIT_PRICE_CENTS } from '@/lib/pricing';
import { INDUSTRIES_PUBLIC } from '@/industries';

export const MCP_VERSION = '1.2.1';

/**
 * Public, dependency-free snapshot of the MCP surface, for the Lovable landing
 * (and any client) to render tool/pricing data without doing the MCP handshake.
 * Tool/prompt lists derive from the canonical manifest in src/mcp/capabilities.ts.
 */
export function buildInfo() {
  return {
    name: 'eveoy-mcp',
    version: MCP_VERSION,
    endpoint: 'https://mcp.eveoy.com/mcp',
    transports: ['streamable-http', 'sse'],
    tools: enabledCapabilities().map((c) => ({ name: c.name, title: c.title, summary: c.summary, auth: c.auth })),
    prompts: PROMPTS.map((p) => p.name),
    pricing: {
      unit_usd: UNIT_PRICE_CENTS / 100,
      tiers: pricingExamples(),
    },
    industries: INDUSTRIES_PUBLIC,
  };
}
