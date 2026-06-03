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
  matches_marketing_pilot: boolean;
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
    matches_marketing_pilot: customers === DEFAULT_CUSTOMERS_PER_LOCATION && locations === DEFAULT_LOCATIONS,
  };
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

/**
 * Reference configurations, mirroring eveoy.com/order's default and a few
 * common scale-ups. NOT a tier-based pricing model — pricing is always
 * customers × locations × $24.99.
 */
export function pricingExamples() {
  return [
    { label: 'Smallest possible',    customers_per_location: 20,   locations: 1,  total_usd: '$499.80',     note: 'Floor: 20 customers/location' },
    { label: 'Marketing default',    customers_per_location: 40,   locations: 1,  total_usd: '$999.60',     note: 'The "$999 pilot" anchor' },
    { label: 'Single-store, larger', customers_per_location: 100,  locations: 1,  total_usd: '$2,499.00',   note: '~2-week proof window' },
    { label: 'Multi-store pilot',    customers_per_location: 100,  locations: 4,  total_usd: '$9,996.00',   note: '400 customers across 4 stores' },
    { label: 'Regional rollout',     customers_per_location: 100,  locations: 10, total_usd: '$24,990.00',  note: '1,000 customers, 10 stores' },
    { label: 'Largest possible',     customers_per_location: 1000, locations: 50, total_usd: '$1,249,500',  note: 'Ceiling: 50,000 customers' },
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
