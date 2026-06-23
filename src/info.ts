import { pricingExamples, UNIT_PRICE_CENTS } from '@/lib/pricing';
import { INDUSTRIES_PUBLIC } from '@/industries';

export const MCP_VERSION = '1.0.1';

/**
 * Public, dependency-free snapshot of the MCP surface, for the Lovable landing
 * (and any client) to render tool/pricing data without doing the MCP handshake.
 * Tool list mirrors src/mcp/register.ts + start_checkout — keep in sync.
 */
const TOOLS = [
  { name: 'ask_eveoy', title: 'Ask about Eveoy', auth: 'none' },
  { name: 'get_pricing', title: 'Get Eveoy pricing', auth: 'none' },
  { name: 'list_industries', title: 'List Eveoy industries', auth: 'none' },
  { name: 'list_metros', title: 'List directory metros', auth: 'none' },
  { name: 'get_app_link', title: 'Get the Eveoy app', auth: 'none' },
  { name: 'book_demo', title: 'Book an Eveoy demo', auth: 'none' },
  { name: 'search_directory', title: 'Search the Eveoy directory', auth: 'none' },
  { name: 'get_business', title: 'Get a directory business', auth: 'none' },
  { name: 'check_order_status', title: 'Check Eveoy order status', auth: 'none' },
  { name: 'subscribe_newsletter', title: 'Subscribe to the newsletter', auth: 'none' },
  { name: 'claim_business', title: 'Claim a directory listing', auth: 'none' },
  { name: 'start_checkout', title: 'Start an Eveoy checkout', auth: 'oauth' },
] as const;

export function buildInfo() {
  return {
    name: 'eveoy-mcp',
    version: MCP_VERSION,
    endpoint: 'https://mcp.eveoy.com/mcp',
    transports: ['streamable-http', 'sse'],
    tools: TOOLS,
    prompts: ['eveoy_price_quote', 'eveoy_objection_handle', 'pitch_for_role', 'pilot_scope_intake'],
    pricing: {
      unit_usd: UNIT_PRICE_CENTS / 100,
      tiers: pricingExamples(),
    },
    industries: INDUSTRIES_PUBLIC,
  };
}
