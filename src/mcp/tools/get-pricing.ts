import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GetPricingInput, GetPricingOutput } from '@/mcp/schemas';
import { logEvent } from '@/integrations/crm';
import type { ToolAgent } from '@/mcp/tool-agent';
import {
  quoteFor,
  pricingExamples,
  formatUsd,
  UNIT_PRICE_CENTS,
  MIN_CUSTOMERS_PER_LOCATION,
  MAX_CUSTOMERS_PER_LOCATION,
  MIN_LOCATIONS,
  MAX_LOCATIONS,
} from '@/lib/pricing';
import { assertPublic } from '@/classifier/public-only';

const DESCRIPTION = `Compute the exact Eveoy price for a pilot. Pricing mirrors eveoy.com/order. Base: customers_per_location × locations × $24.99. Optional guaranteed purchase (guarantee_type "visit_purchase"): every shopper also buys your chosen SKU at your register — add the SKU price (in cents, tax included, $5–$100) at cost, no item fee; the item money rings back into your till. Optional shopper bonus ($20–$200 per shopper, 33% platform fee on the bonus only — the only platform fee): every $20 unlocks +1 photo and +1 follow/like/comment set per shopper, each capped at +3. Total = units×2499 + units×sku + round(units×bonus×1.33) cents — the same server-side math Stripe charges. The marketing-default $999 pilot is 40 customers at 1 location, visit-only. Floor 20/location, ceiling 1,000/location, locations cap 50.

Use this when the user wants to:
- Get a price for a specific shopper/customer count and location count ("price 200 shoppers across 3 stores")
- Quote a pilot with a guaranteed purchase and/or a shopper bonus, with the full fee breakdown
- Get a budget estimate or compare cost across pilot sizes
- Confirm the per-shopper rate before booking

Trigger phrases include: "how much does eveoy cost", "price for 500 shoppers", "what's a pilot cost with a guaranteed purchase", "what does the bonus cost", "eveoy pricing", "quote me a pilot for 100 shoppers in 4 stores".

Returns: { customers_per_location, locations, total_customers, unit_price_usd, total_usd, formatted_total, ugc_photos, is_starter_tier, guarantee_type, top_sku_price_cents, shopper_bonus_cents, fee_breakdown { base_cents, sku_cents, bonus_cents }, bonus_tiers }. Reflects the exact math the eveoy.com/order backend applies; never returns a number the form would reject.

Do NOT use this for:
- General "what is eveoy" questions (use ask_eveoy)
- Industries served (use list_industries)
- Custom volume contracts beyond the 50-location ceiling — route the buyer to support@eveoy.com

Cost: free. Latency: <100ms. Read-only. Idempotent. Deterministic.`;

export function registerGetPricing(server: McpServer, agent: ToolAgent) {
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
    async ({ customers_per_location, locations, guarantee_type, top_sku_price_cents, shopper_bonus_cents }) => {
      void logEvent({
        event_type: 'pricing',
        session_id: agent.getSessionId(),
        tool: 'get_pricing',
        summary: `Pricing: ${customers_per_location} customers x ${locations} locations` +
          (guarantee_type ? ` (${guarantee_type}${shopper_bonus_cents ? ' + bonus' : ''})` : ''),
      });
      let p;
      try {
        p = quoteFor({
          customersPerLocation: customers_per_location,
          locations,
          guaranteeType: guarantee_type,
          topSkuPriceCents: top_sku_price_cents,
          shopperBonusCents: shopper_bonus_cents,
        });
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: err instanceof Error ? err.message : 'Invalid pricing inputs.' }],
          isError: true,
        };
      }

      const withPurchase = p.guarantee_type === 'visit_purchase';
      const lines = [
        `Eveoy pricing for ${p.customers_per_location} shoppers × ${p.locations} location${p.locations === 1 ? '' : 's'} (${p.total_customers} real customers):`,
        '',
        `  Total: ${p.total_usd}`,
        `    Base visits: ${formatUsd(p.base_cents)} (${formatUsd(UNIT_PRICE_CENTS)} per shopper, flat)`,
        withPurchase
          ? `    Guaranteed purchase: ${formatUsd(p.sku_cents)} (SKU ${formatUsd(p.top_sku_price_cents ?? 0)} tax-incl. per shopper, at cost — no item fee; the item money rings back at your register)`
          : '    Guarantee: visit only (no purchase). Add guarantee_type "visit_purchase" + a SKU price to guarantee a purchase per shopper.',
        p.shopper_bonus_cents > 0
          ? `    Shopper bonus: ${formatUsd(p.bonus_cents)} (${formatUsd(p.shopper_bonus_cents)} per shopper + 33% platform fee) → +${p.bonus_extra_photos_per_shopper} photo${p.bonus_extra_photos_per_shopper === 1 ? '' : 's'} and +${p.bonus_social_sets_per_shopper} follow/like/comment set${p.bonus_social_sets_per_shopper === 1 ? '' : 's'} per shopper`
          : '    Shopper bonus: none. Optional $20–$200/shopper (+33% fee): every $20 = +1 photo and +1 social set per shopper, max +3 each.',
        `  UGC photos: ${p.ugc_photos} total (2 per shopper base${p.bonus_tiers ? ` + ${p.bonus_tiers} bonus` : ''}, yours to keep)`,
        '',
        p.is_starter_tier && !withPurchase && !p.shopper_bonus_cents
          ? '  ✓ This is the Starter tier (40 customers · 80 UGC photos · 1 store).'
          : '',
        `  Constraints (from eveoy.com/order): ${MIN_CUSTOMERS_PER_LOCATION}–${MAX_CUSTOMERS_PER_LOCATION} shoppers/location · ${MIN_LOCATIONS}–${MAX_LOCATIONS} locations · earliest start date is 14 days from today.`,
        '',
        'Published tiers (visit-only base):',
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
        guarantee_type: p.guarantee_type,
        top_sku_price_cents: p.top_sku_price_cents,
        shopper_bonus_cents: p.shopper_bonus_cents,
        fee_breakdown: {
          base_cents: p.base_cents,
          sku_cents: p.sku_cents,
          bonus_cents: p.bonus_cents,
        },
        bonus_tiers: p.bonus_tiers,
      };

      const safe = assertPublic(lines, { tool: 'get_pricing' });
      return {
        content: [{ type: 'text', text: safe }],
        structuredContent: structured,
      };
    },
  );
}
