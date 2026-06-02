import { describe, it, expect } from 'vitest';
import { priceFor, pilotTierTable, formatUsd, inferTier, UNIT_PRICE_CENTS, PILOT_FLOOR_CENTS } from './pricing';

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

describe('inferTier — returns highest tier the input meets', () => {
  it('sub-pilot input snaps to pilot_999', () => {
    expect(inferTier(10)).toBe('pilot_999');
    expect(inferTier(39)).toBe('pilot_999');
  });
  it('at exactly each tier boundary', () => {
    expect(inferTier(40)).toBe('pilot_999');
    expect(inferTier(100)).toBe('pilot_2500');
    expect(inferTier(400)).toBe('pilot_10000');
    expect(inferTier(1000)).toBe('pilot_25000');
    expect(inferTier(4000)).toBe('custom_quote');
  });
  it('between tiers — returns the lower tier (regression: 200 must not return pilot_10000)', () => {
    expect(inferTier(50)).toBe('pilot_999');
    expect(inferTier(99)).toBe('pilot_999');
    expect(inferTier(101)).toBe('pilot_2500');
    expect(inferTier(200)).toBe('pilot_2500');
    expect(inferTier(399)).toBe('pilot_2500');
    expect(inferTier(401)).toBe('pilot_10000');
    expect(inferTier(999)).toBe('pilot_10000');
    expect(inferTier(1001)).toBe('pilot_25000');
    expect(inferTier(3999)).toBe('pilot_25000');
    expect(inferTier(10_000)).toBe('custom_quote');
  });
});
