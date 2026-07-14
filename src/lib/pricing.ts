/**
 * Public pricing math — single source of truth, mirrors eveoy.com/order.
 *
 * Verified from eveoy.com/order + Lovable integration spec (2026-06-02):
 *   - $24.99 per verified customer (UI label "Shoppers per location"; DB +
 *     wire format use customers_per_location — we use the wire name)
 *   - Total = customers_per_location × locations × $24.99
 *   - customers_per_location:  min 20  · max 1,000
 *   - locations:               min 1   · max 50
 *   - Start date floor:        today + 14 days (campaign lead time)
 *   - Marketing-default pilot configuration: 40 × 1 location = $999.60
 *     (i.e. "$999 pilot for 40+ customers" — a default, NOT a hard floor)
 *
 * Smallest possible order: 20 × 1 × $24.99 =      $499.80
 * Largest possible order:  1,000 × 50 × $24.99 = $1,249,500.00
 *
 * The full integration contract (Supabase edge fn body shape, Stripe
 * webhook behavior, advanced_targeting JSONB shape) is in
 * docs/ORDER_FLOW_SPEC.md — read that before wiring Phase 2.
 */

export const UNIT_PRICE_CENTS = 2499;
export const MIN_CUSTOMERS_PER_LOCATION = 20;
export const MAX_CUSTOMERS_PER_LOCATION = 1000;
export const MIN_LOCATIONS = 1;
export const MAX_LOCATIONS = 50;
export const DEFAULT_CUSTOMERS_PER_LOCATION = 40;
export const DEFAULT_LOCATIONS = 1;
export const CAMPAIGN_START_LEAD_DAYS = 14;
export const UGC_PHOTOS_PER_CUSTOMER = 2;

// ─── v8 guarantee + fee terms (create-checkout-session) ──
// The edge fn recomputes the total server-side with this exact math; the
// Worker mirrors it so quotes always equal what Stripe charges.
// The item fee is WAIVED (2026-07-14): the SKU is a pure pass-through at
// cost. The 33% bonus fee is the ONLY platform fee.
export const BONUS_FEE_RATE = 0.33; // platform fee on the shopper bonus only
export const MIN_SKU_PRICE_CENTS = 500;
export const MAX_SKU_PRICE_CENTS = 10000;
export const MIN_BONUS_CENTS = 2000;
export const MAX_BONUS_CENTS = 20000;
export const BONUS_TIER_CENTS = 2000; // every $20 of bonus = +1 photo AND +1 social set per shopper
export const MAX_BONUS_TIERS = 3; // both rewards cap at +3 ($60 maxes them; paying more buys no extra units)

export type GuaranteeType = 'visit_purchase' | 'visit';

export interface PricingInput {
  customersPerLocation?: number;
  locations?: number;
}

export interface PricingResult {
  customers_per_location: number;
  locations: number;
  total_customers: number;
  unit_price_usd: number;
  total_cents: number;
  total_usd: string;
  ugc_photos: number;
  is_starter_tier: boolean;
}

export function priceFor(input: PricingInput = {}): PricingResult {
  const customers = input.customersPerLocation ?? DEFAULT_CUSTOMERS_PER_LOCATION;
  const locations = input.locations ?? DEFAULT_LOCATIONS;

  if (!Number.isInteger(customers) || customers < MIN_CUSTOMERS_PER_LOCATION || customers > MAX_CUSTOMERS_PER_LOCATION) {
    throw new RangeError(
      `customers_per_location must be an integer in [${MIN_CUSTOMERS_PER_LOCATION}, ${MAX_CUSTOMERS_PER_LOCATION}], got ${customers}`,
    );
  }
  if (!Number.isInteger(locations) || locations < MIN_LOCATIONS || locations > MAX_LOCATIONS) {
    throw new RangeError(
      `locations must be an integer in [${MIN_LOCATIONS}, ${MAX_LOCATIONS}], got ${locations}`,
    );
  }

  const total_customers = customers * locations;
  const total_cents = total_customers * UNIT_PRICE_CENTS;

  return {
    customers_per_location: customers,
    locations,
    total_customers,
    unit_price_usd: UNIT_PRICE_CENTS / 100,
    total_cents,
    total_usd: formatUsd(total_cents),
    // ~2 quality-rated UGC photos per verified customer (Starter 40→80, Proof 100→200, Rollout 400→800)
    ugc_photos: total_customers * UGC_PHOTOS_PER_CUSTOMER,
    is_starter_tier: customers === DEFAULT_CUSTOMERS_PER_LOCATION && locations === DEFAULT_LOCATIONS,
  };
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

// ─── v8 quote: base + optional guaranteed purchase (SKU) + optional bonus ──

export interface QuoteInput extends PricingInput {
  /** Omitted = visit-only pricing (the legacy math). */
  guaranteeType?: GuaranteeType;
  /** Required when guaranteeType is 'visit_purchase'. Tax-inclusive, 500–10000. */
  topSkuPriceCents?: number;
  /** 0 or 2000–20000 (any integer — no $20-step requirement). */
  shopperBonusCents?: number;
}

export interface QuoteResult extends PricingResult {
  guarantee_type: GuaranteeType;
  top_sku_price_cents: number | null;
  shopper_bonus_cents: number;
  base_cents: number;
  sku_cents: number;
  bonus_cents: number;
  /** min(3, floor(bonus_usd / 20)) — each tier = +1 photo and +1 social set per shopper. */
  bonus_tiers: number;
  bonus_extra_photos_per_shopper: number;
  bonus_social_sets_per_shopper: number;
}

/**
 * Mirror of the edge fn's server-side recomputation:
 *   units       = customers_per_location × locations
 *   base_cents  = units × 2499
 *   sku_cents   = visit_purchase ? units × top_sku_price_cents : 0   (at cost — item fee waived)
 *   bonus_cents = bonus > 0      ? round(units × shopper_bonus_cents × 1.33) : 0
 * Pinned by tests/pricing-v8.test.ts to the contract's worked example (439,160¢).
 */
export function quoteFor(input: QuoteInput = {}): QuoteResult {
  const p = priceFor(input);
  const guarantee: GuaranteeType = input.guaranteeType ?? 'visit';

  let topSku: number | null = null;
  if (guarantee === 'visit_purchase') {
    const sku = input.topSkuPriceCents;
    if (sku === undefined || sku === null) {
      throw new RangeError(
        `top_sku_price_cents is required when guarantee_type is "visit_purchase" (integer ${MIN_SKU_PRICE_CENTS}–${MAX_SKU_PRICE_CENTS} cents, tax included)`,
      );
    }
    if (!Number.isInteger(sku) || sku < MIN_SKU_PRICE_CENTS || sku > MAX_SKU_PRICE_CENTS) {
      throw new RangeError(
        `top_sku_price_cents must be an integer in [${MIN_SKU_PRICE_CENTS}, ${MAX_SKU_PRICE_CENTS}], got ${sku}`,
      );
    }
    topSku = sku;
  }

  const bonus = input.shopperBonusCents ?? 0;
  if (!Number.isInteger(bonus) || (bonus !== 0 && (bonus < MIN_BONUS_CENTS || bonus > MAX_BONUS_CENTS))) {
    throw new RangeError(
      `shopper_bonus_cents must be 0 or an integer in [${MIN_BONUS_CENTS}, ${MAX_BONUS_CENTS}], got ${bonus}`,
    );
  }

  const units = p.total_customers;
  const base_cents = units * UNIT_PRICE_CENTS;
  const sku_cents = topSku !== null ? units * topSku : 0;
  const bonus_cents = bonus > 0 ? Math.round(units * bonus * (1 + BONUS_FEE_RATE)) : 0;
  const total_cents = base_cents + sku_cents + bonus_cents;

  const bonus_tiers = bonus > 0 ? Math.min(MAX_BONUS_TIERS, Math.floor(bonus / BONUS_TIER_CENTS)) : 0;

  return {
    ...p,
    total_cents,
    total_usd: formatUsd(total_cents),
    ugc_photos: units * (UGC_PHOTOS_PER_CUSTOMER + bonus_tiers),
    guarantee_type: guarantee,
    top_sku_price_cents: topSku,
    shopper_bonus_cents: bonus,
    base_cents,
    sku_cents,
    bonus_cents,
    bonus_tiers,
    bonus_extra_photos_per_shopper: bonus_tiers,
    bonus_social_sets_per_shopper: bonus_tiers,
  };
}

/**
 * Published tiers (eveoy.com/pricing) + the floor and ceiling. Pricing is
 * always customers × locations × $24.99; these are the named reference points.
 */
export function pricingExamples() {
  return [
    { label: 'Below Starter (floor)', customers_per_location: 20,   locations: 1,  total_usd: '$499.80',     note: '20-customer floor · 40 UGC photos' },
    { label: 'Starter',               customers_per_location: 40,   locations: 1,  total_usd: '$999.60',     note: '40 customers · 80 UGC photos · 1 store' },
    { label: 'Proof',                 customers_per_location: 100,  locations: 1,  total_usd: '$2,499.00',   note: '100 customers · 200 UGC photos · 90-day readout' },
    { label: 'Rollout',               customers_per_location: 100,  locations: 4,  total_usd: '$9,996.00',   note: '400 customers · 800 UGC photos · 3–4 stores' },
    { label: 'Beyond Rollout',        customers_per_location: 1000, locations: 50, total_usd: '$1,249,500',  note: 'Ceiling: 50,000 customers' },
  ];
}

/**
 * Earliest valid campaign start date — today + CAMPAIGN_START_LEAD_DAYS,
 * formatted as ISO date (YYYY-MM-DD). Used by the create_pilot_order
 * Zod refinement so the MCP never accepts a start date the eveoy.com/order
 * form would reject.
 */
export function earliestStartDate(now: Date = new Date()): string {
  const min = new Date(now);
  min.setUTCDate(min.getUTCDate() + CAMPAIGN_START_LEAD_DAYS);
  return min.toISOString().slice(0, 10);
}
