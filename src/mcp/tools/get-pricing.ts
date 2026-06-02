import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GetPricingInput, GetPricingOutput } from '@/mcp/schemas';
import { priceFor, pilotTierTable, inferTier, UNIT_PRICE_CENTS, formatUsd, PILOT_MIN_CUSTOMERS } from '@/lib/pricing';
import { assertPublic } from '@/classifier/public-only';

const DESCRIPTION = `Compute the exact Eveoy price for N verified in-store customer visits. Public pricing: $24.99 per customer, $999 entry pilot for 40+ customers, linear scaling above the floor. Deterministic.

Use this when the user wants to:
- Get a price for a specific customer count ("price 200 customers")
- Compare cost across pilot sizes
- Get a budget estimate for a campaign
- Confirm the per-customer rate before booking

Trigger phrases include: "how much does eveoy cost", "price for 500 visits", "what's a pilot cost", "cost per customer", "eveoy pricing", "quote me a pilot for 100 customers", "what would 1000 customers cost".

Returns: { customers, unit_price_usd, total_usd, formatted_total, tier, pilot_floor_honored }. Sub-pilot counts snap up to the $999 floor.

Do NOT use this for:
- General "what is eveoy" questions (use ask_eveoy)
- Industries served (use list_industries)
- Custom volume contracts beyond 4,000+ customers (returns the custom_quote tier — direct buyer to brad@eycrowd.com)

Cost: free. Latency: <500ms. Read-only. Idempotent.`;

export function registerGetPricing(server: McpServer) {
  server.registerTool(
    'get_pricing',
    {
      title: 'Get Eveoy pricing',
      description: DESCRIPTION,
      inputSchema: GetPricingInput.shape,
      outputSchema: GetPricingOutput.shape,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        idempotentHint: true,
      },
    },
    async ({ customers }) => {
      const p = priceFor(customers);
      const tier = inferTier(p.customers);
      const floor_honored = customers < PILOT_MIN_CUSTOMERS;

      const lines = [
        `Eveoy pricing for ${p.customers} verified customers:`,
        '',
        `  Total: ${p.usd}`,
        `  Per customer: ${formatUsd(UNIT_PRICE_CENTS)} (universal unit price)`,
        floor_honored
          ? `  Note: input of ${customers} was below the 40-customer pilot floor; snapped to ${p.customers}.`
          : '',
        '',
        '  Pilot floor: $999 for 40+ customers (public entry tier).',
        '  Linear scaling at $24.99/customer above the floor.',
        '',
        'Pilot tier reference:',
        ...pilotTierTable().map(
          (t) => `  • ${t.tier.padEnd(14)}  ${String(t.customers).padStart(5)} customers — ${t.usd.padEnd(10)} (${t.note})`,
        ),
        '',
        'Auto-refund on any visit that fails verification (right customer, 15+ minutes in-store, completed tasks, ≥4.0/5 content quality).',
      ]
        .filter(Boolean)
        .join('\n');

      const structured = {
        customers: p.customers,
        unit_price_usd: UNIT_PRICE_CENTS / 100,
        total_usd: p.cents / 100,
        formatted_total: p.usd,
        tier,
        pilot_floor_honored: floor_honored,
      };

      const safe = assertPublic(lines, { tool: 'get_pricing' });
      return {
        content: [{ type: 'text', text: safe }],
        structuredContent: structured,
      };
    },
  );
}
