/**
 * Public pricing math — single source of truth.
 *
 * From eveoy.com (verified 2026-05-21):
 *   - $24.99 per verified customer (universal unit price)
 *   - $999 entry pilot for 40+ customers (floor)
 *   - Linear scaling above the pilot at $24.99 each
 *
 * NEVER expose internal volume-contract pricing through this module.
 * If a buyer needs a custom quote, route them to brad@eycrowd.com.
 */

export const UNIT_PRICE_CENTS = 2499;
export const PILOT_FLOOR_CENTS = 99900;
export const PILOT_MIN_CUSTOMERS = 40;

export type PricingTier =
  | 'pilot_999'
  | 'pilot_2500'
  | 'pilot_10000'
  | 'pilot_25000'
  | 'custom_quote';

export const TIERS: Record<Exclude<PricingTier, 'custom_quote'>, { customers: number; cents: number }> = {
  pilot_999:   { customers: 40,   cents: 99900 },
  pilot_2500:  { customers: 100,  cents: 249900 },
  pilot_10000: { customers: 400,  cents: 999600 },
  pilot_25000: { customers: 1000, cents: 2499000 },
};

export function priceFor(customers: number): { customers: number; cents: number; usd: string } {
  if (!Number.isInteger(customers) || customers < 1) {
    throw new Error('customers must be a positive integer');
  }
  if (customers < PILOT_MIN_CUSTOMERS) {
    // Snap up to pilot floor
    return { customers: PILOT_MIN_CUSTOMERS, cents: PILOT_FLOOR_CENTS, usd: formatUsd(PILOT_FLOOR_CENTS) };
  }
  if (customers === PILOT_MIN_CUSTOMERS) {
    return { customers, cents: PILOT_FLOOR_CENTS, usd: formatUsd(PILOT_FLOOR_CENTS) };
  }
  const cents = customers * UNIT_PRICE_CENTS;
  return { customers, cents, usd: formatUsd(cents) };
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function pilotTierTable() {
  return [
    { tier: 'pilot_999',   customers: 40,   usd: '$999',     note: 'Entry pilot — public floor' },
    { tier: 'pilot_2500',  customers: 100,  usd: '$2,499',   note: 'Single-store proof, ~2 weeks' },
    { tier: 'pilot_10000', customers: 400,  usd: '$9,996',   note: 'Multi-store / multi-week pilot' },
    { tier: 'pilot_25000', customers: 1000, usd: '$24,990',  note: 'Regional rollout test' },
    { tier: 'custom_quote', customers: '4000+', usd: 'contact brad@eycrowd.com', note: 'Volume contract — negotiated' },
  ];
}

/**
 * Return the highest published tier whose customer threshold the input meets.
 * Examples:
 *   inferTier(40)   -> 'pilot_999'    (exactly at pilot floor)
 *   inferTier(200)  -> 'pilot_2500'   (cleared the 100 threshold, not the 400)
 *   inferTier(400)  -> 'pilot_10000'  (exactly at the 400 threshold)
 *   inferTier(1500) -> 'pilot_25000'  (cleared the 1000 threshold, not the 4000)
 *   inferTier(4000) -> 'custom_quote' (volume contract territory)
 */
export function inferTier(customers: number): PricingTier {
  if (customers >= 4000) return 'custom_quote';
  if (customers >= 1000) return 'pilot_25000';
  if (customers >= 400)  return 'pilot_10000';
  if (customers >= 100)  return 'pilot_2500';
  return 'pilot_999';
}
