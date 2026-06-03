/**
 * Public pricing math — single source of truth, mirrors eveoy.com/order.
 *
 * Verified from eveoy.com/order (2026-06-02):
 *   - $24.99 per verified shopper (universal unit price)
 *   - Total = shoppers_per_location × locations × $24.99
 *   - Shoppers per location:  min 20  · max 1,000
 *   - Locations:              min 1   · max 50
 *   - Marketing-default pilot configuration: 40 × 1 location = $999.60
 *     (i.e. "$999 pilot for 40+ customers" — a default, NOT a hard floor)
 *
 * Smallest possible order: 20 × 1 × $24.99 =      $499.80
 * Largest possible order:  1,000 × 50 × $24.99 = $1,249,500.00
 */

export const UNIT_PRICE_CENTS = 2499;
export const MIN_SHOPPERS_PER_LOCATION = 20;
export const MAX_SHOPPERS_PER_LOCATION = 1000;
export const MIN_LOCATIONS = 1;
export const MAX_LOCATIONS = 50;
export const DEFAULT_SHOPPERS_PER_LOCATION = 40;
export const DEFAULT_LOCATIONS = 1;

export interface PricingInput {
  shoppersPerLocation?: number;
  locations?: number;
}

export interface PricingResult {
  shoppers_per_location: number;
  locations: number;
  total_customers: number;
  unit_price_usd: number;
  total_cents: number;
  total_usd: string;
  matches_marketing_pilot: boolean;
}

export function priceFor(input: PricingInput = {}): PricingResult {
  const shoppers = input.shoppersPerLocation ?? DEFAULT_SHOPPERS_PER_LOCATION;
  const locations = input.locations ?? DEFAULT_LOCATIONS;

  if (!Number.isInteger(shoppers) || shoppers < MIN_SHOPPERS_PER_LOCATION || shoppers > MAX_SHOPPERS_PER_LOCATION) {
    throw new RangeError(
      `shoppers_per_location must be an integer in [${MIN_SHOPPERS_PER_LOCATION}, ${MAX_SHOPPERS_PER_LOCATION}], got ${shoppers}`,
    );
  }
  if (!Number.isInteger(locations) || locations < MIN_LOCATIONS || locations > MAX_LOCATIONS) {
    throw new RangeError(
      `locations must be an integer in [${MIN_LOCATIONS}, ${MAX_LOCATIONS}], got ${locations}`,
    );
  }

  const total_customers = shoppers * locations;
  const total_cents = total_customers * UNIT_PRICE_CENTS;

  return {
    shoppers_per_location: shoppers,
    locations,
    total_customers,
    unit_price_usd: UNIT_PRICE_CENTS / 100,
    total_cents,
    total_usd: formatUsd(total_cents),
    matches_marketing_pilot: shoppers === DEFAULT_SHOPPERS_PER_LOCATION && locations === DEFAULT_LOCATIONS,
  };
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

/**
 * Reference configurations, mirroring eveoy.com/order's default and a few
 * common scale-ups. NOT a tier-based pricing model — pricing is always
 * shoppers × locations × $24.99. These are orientation examples.
 */
export function pricingExamples() {
  return [
    { label: 'Smallest possible',     shoppers_per_location: 20,   locations: 1,  total_usd: '$499.80',     note: 'Floor: 20 shoppers/location' },
    { label: 'Marketing default',     shoppers_per_location: 40,   locations: 1,  total_usd: '$999.60',     note: 'The "$999 pilot" anchor' },
    { label: 'Single-store, larger',  shoppers_per_location: 100,  locations: 1,  total_usd: '$2,499.00',   note: '~2-week proof window' },
    { label: 'Multi-store pilot',     shoppers_per_location: 100,  locations: 4,  total_usd: '$9,996.00',   note: '400 customers across 4 stores' },
    { label: 'Regional rollout',      shoppers_per_location: 100,  locations: 10, total_usd: '$24,990.00',  note: '1,000 customers, 10 stores' },
    { label: 'Largest possible',      shoppers_per_location: 1000, locations: 50, total_usd: '$1,249,500',  note: 'Ceiling: 50,000 customers' },
  ];
}
