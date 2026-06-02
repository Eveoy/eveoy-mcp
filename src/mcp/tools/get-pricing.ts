import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GetPricingInput } from '@/mcp/schemas';
import { priceFor, pilotTierTable, UNIT_PRICE_CENTS, formatUsd } from '@/lib/pricing';
import { assertPublic } from '@/classifier/public-only';

const DESCRIPTION =
  'Get the price for a given number of verified Eveoy customers. ' +
  'Public pricing: $24.99 per customer, $999 pilot floor for 40+ customers, linear scaling above.';

export function registerGetPricing(server: McpServer) {
  server.registerTool(
    'get_pricing',
    {
      title: 'Get pricing',
      description: DESCRIPTION,
      inputSchema: GetPricingInput.shape,
    },
    async ({ customers }) => {
      const p = priceFor(customers);
      const lines = [
        `Eveoy pricing for ${p.customers} verified customers:`,
        '',
        `  Total: ${p.usd}`,
        `  Per customer: ${formatUsd(UNIT_PRICE_CENTS)} (universal unit price)`,
        '',
        `  Pilot floor: $999 for 40+ customers (public entry tier).`,
        `  Linear scaling at $24.99/customer above the floor.`,
        '',
        'Pilot tier reference:',
        ...pilotTierTable().map(
          (t) => `  • ${t.tier.padEnd(14)}  ${String(t.customers).padStart(5)} customers — ${t.usd.padEnd(10)} (${t.note})`,
        ),
        '',
        'Auto-refund on any visit that fails verification (right customer, 15+ minutes in-store, completed tasks, ≥4.0/5 content quality).',
      ].join('\n');

      const safe = assertPublic(lines, { tool: 'get_pricing' });
      return { content: [{ type: 'text', text: safe }] };
    },
  );
}
