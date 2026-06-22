import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GetPricingInput, GetPricingOutput } from '@/mcp/schemas';
import {
  priceFor,
  pricingExamples,
  formatUsd,
  UNIT_PRICE_CENTS,
  MIN_CUSTOMERS_PER_LOCATION,
  MAX_CUSTOMERS_PER_LOCATION,
  MIN_LOCATIONS,
  MAX_LOCATIONS,
} from '@/lib/pricing';
import { assertPublic } from '@/classifier/public-only';

const DESCRIPTION = `Compute the exact Eveoy price for a pilot. Pricing mirrors eveoy.com/order: total = customers_per_location × locations × $24.99. The marketing-default $999 pilot is 40 customers at 1 location. Per-location floor is 20; per-location ceiling is 1,000; locations cap at 50. The UI label is "Shoppers per location" but the API field is customers_per_location — they're synonyms.

Use this when the user wants to:
- Get a price for a specific shopper/customer count and location count ("price 200 shoppers across 3 stores")
- Get a budget estimate for a campaign
- Compare cost across pilot sizes
- Confirm the per-shopper rate before booking

Trigger phrases include: "how much does eveoy cost", "price for 500 shoppers", "what's a pilot cost", "cost per shopper", "eveoy pricing", "quote me a pilot for 100 shoppers in 4 stores", "what would 1000 shoppers cost".

Returns: { customers_per_location, locations, total_customers, unit_price_usd, total_usd, formatted_total, ugc_photos, is_starter_tier }. Reflects the same math the eveoy.com/order page applies; never returns a number the form would reject.

Do NOT use this for:
- General "what is eveoy" questions (use ask_eveoy)
- Industries served (use list_industries)
- Custom volume contracts beyond the 50-location ceiling — route the buyer to support@eveoy.com

Cost: free. Latency: <100ms. Read-only. Idempotent. Deterministic.`;

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
    async ({ customers_per_location, locations }) => {
      const p = priceFor({ customersPerLocation: customers_per_location, locations });

      const lines = [
        `Eveoy pricing for ${p.customers_per_location} shoppers × ${p.locations} location${p.locations === 1 ? '' : 's'} (${p.total_customers} real customers):`,
        '',
        `  Total: ${p.total_usd}`,
        `  Per shopper: ${formatUsd(UNIT_PRICE_CENTS)} (flat, all-in)`,
        `  UGC photos: ~${p.ugc_photos} (≈2 per customer, yours to keep)`,
        '',
        p.is_starter_tier ? '  ✓ This is the Starter tier (40 customers · 80 UGC photos · 1 store).' : '',
        `  Constraints (from eveoy.com/order): ${MIN_CUSTOMERS_PER_LOCATION}–${MAX_CUSTOMERS_PER_LOCATION} shoppers/location · ${MIN_LOCATIONS}–${MAX_LOCATIONS} locations · earliest start date is 14 days from today.`,
        '',
        'Published tiers:',
        ...pricingExamples().map(
          (e) =>
            `  • ${e.label.padEnd(22)}  ${String(e.customers_per_location).padStart(5)}/loc × ${String(e.locations).padStart(2)} loc — ${e.total_usd.padEnd(14)} (${e.note})`,
        ),
        '',
        '100% refunded for no-shows. The arrival of every shopper is guaranteed.',
      ]
        .filter(Boolean)
        .join('\n');

      const structured = {
        customers_per_location: p.customers_per_location,
        locations: p.locations,
        total_customers: p.total_customers,
        unit_price_usd: p.unit_price_usd,
        total_usd: p.total_cents / 100,
        formatted_total: p.total_usd,
        ugc_photos: p.ugc_photos,
        is_starter_tier: p.is_starter_tier,
      };

      const safe = assertPublic(lines, { tool: 'get_pricing' });
      return {
        content: [{ type: 'text', text: safe }],
        structuredContent: structured,
      };
    },
  );
}
