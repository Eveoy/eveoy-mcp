import { describe, it, expect } from 'vitest';
import { priceFor, pilotTierTable, formatUsd, UNIT_PRICE_CENTS, PILOT_FLOOR_CENTS } from './pricing';

describe('pricing', () => {
  it('returns the pilot floor for exactly 40 customers', () => {
    const p = priceFor(40);
    expect(p.cents).toBe(PILOT_FLOOR_CENTS);
    expect(p.usd).toBe('$999.00');
  });

  it('snaps sub-pilot orders up to the pilot floor', () => {
    const p = priceFor(10);
    expect(p.customers).toBe(40);
    expect(p.cents).toBe(PILOT_FLOOR_CENTS);
  });

  it('scales linearly above the pilot floor', () => {
    expect(priceFor(100).cents).toBe(100 * UNIT_PRICE_CENTS);
    expect(priceFor(400).cents).toBe(400 * UNIT_PRICE_CENTS);
    expect(priceFor(1000).cents).toBe(1000 * UNIT_PRICE_CENTS);
  });

  it('formats USD correctly', () => {
    expect(formatUsd(99900)).toBe('$999.00');
    expect(formatUsd(2499000)).toBe('$24,990.00');
  });

  it('rejects non-positive customer counts', () => {
    expect(() => priceFor(0)).toThrow();
    expect(() => priceFor(-1)).toThrow();
    expect(() => priceFor(1.5)).toThrow();
  });

  it('publishes a tier table with the public floor + scaling tiers', () => {
    const tiers = pilotTierTable();
    expect(tiers[0]).toMatchObject({ tier: 'pilot_999', customers: 40, usd: '$999' });
    expect(tiers.at(-1)?.tier).toBe('custom_quote');
  });
});
