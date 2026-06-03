import { describe, it, expect } from 'vitest';
import {
  priceFor,
  pricingExamples,
  formatUsd,
  UNIT_PRICE_CENTS,
  MIN_SHOPPERS_PER_LOCATION,
  MAX_SHOPPERS_PER_LOCATION,
  MIN_LOCATIONS,
  MAX_LOCATIONS,
  DEFAULT_SHOPPERS_PER_LOCATION,
  DEFAULT_LOCATIONS,
} from './pricing';

describe('priceFor — mirrors eveoy.com/order', () => {
  it('default (no args) matches the marketing $999 pilot exactly', () => {
    const p = priceFor();
    expect(p.shoppers_per_location).toBe(DEFAULT_SHOPPERS_PER_LOCATION);
    expect(p.locations).toBe(DEFAULT_LOCATIONS);
    expect(p.total_customers).toBe(40);
    expect(p.total_cents).toBe(99960);
    expect(p.total_usd).toBe('$999.60');
    expect(p.matches_marketing_pilot).toBe(true);
  });

  it('honors the per-location floor of 20 (smallest valid order = $499.80)', () => {
    const p = priceFor({ shoppersPerLocation: 20, locations: 1 });
    expect(p.total_customers).toBe(20);
    expect(p.total_usd).toBe('$499.80');
    expect(p.matches_marketing_pilot).toBe(false);
  });

  it('multiplies across locations correctly', () => {
    expect(priceFor({ shoppersPerLocation: 100, locations: 4  }).total_cents).toBe(100 * 4  * UNIT_PRICE_CENTS);
    expect(priceFor({ shoppersPerLocation: 100, locations: 10 }).total_cents).toBe(100 * 10 * UNIT_PRICE_CENTS);
  });

  it('hits the published example tiers exactly', () => {
    expect(priceFor({ shoppersPerLocation: 40,   locations: 1  }).total_usd).toBe('$999.60');
    expect(priceFor({ shoppersPerLocation: 100,  locations: 1  }).total_usd).toBe('$2,499.00');
    expect(priceFor({ shoppersPerLocation: 100,  locations: 4  }).total_usd).toBe('$9,996.00');
    expect(priceFor({ shoppersPerLocation: 100,  locations: 10 }).total_usd).toBe('$24,990.00');
    expect(priceFor({ shoppersPerLocation: 1000, locations: 50 }).total_cents).toBe(1000 * 50 * UNIT_PRICE_CENTS);
  });

  it('rejects shoppers_per_location below the per-location floor', () => {
    expect(() => priceFor({ shoppersPerLocation: 19 })).toThrow(/shoppers_per_location/);
    expect(() => priceFor({ shoppersPerLocation: 0  })).toThrow(/shoppers_per_location/);
    expect(() => priceFor({ shoppersPerLocation: -5 })).toThrow(/shoppers_per_location/);
  });

  it('rejects shoppers_per_location above 1,000 (per-location ceiling)', () => {
    expect(() => priceFor({ shoppersPerLocation: 1001 })).toThrow(/shoppers_per_location/);
    expect(() => priceFor({ shoppersPerLocation: 9999 })).toThrow(/shoppers_per_location/);
  });

  it('rejects locations outside [1, 50]', () => {
    expect(() => priceFor({ locations: 0   })).toThrow(/locations/);
    expect(() => priceFor({ locations: -1  })).toThrow(/locations/);
    expect(() => priceFor({ locations: 51  })).toThrow(/locations/);
    expect(() => priceFor({ locations: 100 })).toThrow(/locations/);
  });

  it('rejects non-integers on either field', () => {
    expect(() => priceFor({ shoppersPerLocation: 40.5 })).toThrow();
    expect(() => priceFor({ locations: 1.5         })).toThrow();
  });

  it('accepts the exact constraint boundaries', () => {
    expect(priceFor({ shoppersPerLocation: MIN_SHOPPERS_PER_LOCATION, locations: MIN_LOCATIONS }).total_cents).toBe(MIN_SHOPPERS_PER_LOCATION * MIN_LOCATIONS * UNIT_PRICE_CENTS);
    expect(priceFor({ shoppersPerLocation: MAX_SHOPPERS_PER_LOCATION, locations: MAX_LOCATIONS }).total_cents).toBe(MAX_SHOPPERS_PER_LOCATION * MAX_LOCATIONS * UNIT_PRICE_CENTS);
  });
});

describe('formatUsd', () => {
  it('formats cents to USD strings', () => {
    expect(formatUsd(49980)).toBe('$499.80');
    expect(formatUsd(99960)).toBe('$999.60');
    expect(formatUsd(249900)).toBe('$2,499.00');
    expect(formatUsd(124950000)).toBe('$1,249,500.00');
  });
});

describe('pricingExamples', () => {
  it('lists the marketing-default as the second example (after the smallest possible)', () => {
    const ex = pricingExamples();
    expect(ex[1]).toMatchObject({ shoppers_per_location: 40, locations: 1, total_usd: '$999.60' });
  });
  it('every example is internally consistent with priceFor()', () => {
    for (const e of pricingExamples()) {
      const computed = priceFor({ shoppersPerLocation: e.shoppers_per_location, locations: e.locations });
      // Allow slight format differences on the largest entry (commas + cents)
      expect(computed.shoppers_per_location).toBe(e.shoppers_per_location);
      expect(computed.locations).toBe(e.locations);
    }
  });
});
