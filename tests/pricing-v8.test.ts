import { describe, it, expect } from 'vitest';
import { quoteFor, SKU_FEE_RATE, BONUS_FEE_RATE } from '../src/lib/pricing';
import { resolveAgentCheckout } from '../src/mcp/tools/checkout-plan';
import { StartCheckoutInput, GetPricingInput } from '../src/mcp/schemas';

/**
 * v8 order contract — mirrors supabase/functions/create-checkout-session
 * (eveoy.com commit 6fba648). The worked example is pinned to the value the
 * edge fn actually computes: 40×1, visit_purchase, sku 500¢, bonus 6000¢
 * → 99,960 + round(40×500×1.075)=21,500 + round(40×6000×1.33)=319,200
 * → total_cents 440,660.
 */
describe('quoteFor — v8 fee math (contract-pinned)', () => {
  it('matches the edge fn worked example exactly', () => {
    const q = quoteFor({
      customersPerLocation: 40,
      locations: 1,
      guaranteeType: 'visit_purchase',
      topSkuPriceCents: 500,
      shopperBonusCents: 6000,
    });
    expect(q.base_cents).toBe(99_960);
    expect(q.sku_cents).toBe(21_500);
    expect(q.bonus_cents).toBe(319_200);
    expect(q.total_cents).toBe(440_660);
    expect(q.guarantee_type).toBe('visit_purchase');
  });

  it('visit-only (or omitted guarantee) is base-only math — the legacy total', () => {
    const legacy = quoteFor({ customersPerLocation: 40, locations: 1 });
    expect(legacy.total_cents).toBe(99_960);
    expect(legacy.sku_cents).toBe(0);
    expect(legacy.bonus_cents).toBe(0);
    expect(legacy.guarantee_type).toBe('visit');

    const visitOnly = quoteFor({ customersPerLocation: 40, locations: 1, guaranteeType: 'visit' });
    expect(visitOnly.total_cents).toBe(99_960);
  });

  it('bonus applies independently of guarantee type (visit-only + bonus still charges 33%)', () => {
    const q = quoteFor({ customersPerLocation: 40, locations: 1, guaranteeType: 'visit', shopperBonusCents: 2000 });
    expect(q.sku_cents).toBe(0);
    expect(q.bonus_cents).toBe(Math.round(40 * 2000 * (1 + BONUS_FEE_RATE)));
    expect(q.total_cents).toBe(99_960 + q.bonus_cents);
  });

  it('fee rates are exactly 7.5% (SKU) and 33% (bonus)', () => {
    expect(SKU_FEE_RATE).toBe(0.075);
    expect(BONUS_FEE_RATE).toBe(0.33);
  });

  it('bonus tiers: every $20 = +1 photo and +1 social set per shopper, capped at 3', () => {
    expect(quoteFor({ guaranteeType: 'visit', shopperBonusCents: 2000 }).bonus_tiers).toBe(1);
    expect(quoteFor({ guaranteeType: 'visit', shopperBonusCents: 5900 }).bonus_tiers).toBe(2);
    expect(quoteFor({ guaranteeType: 'visit', shopperBonusCents: 6000 }).bonus_tiers).toBe(3);
    expect(quoteFor({ guaranteeType: 'visit', shopperBonusCents: 20000 }).bonus_tiers).toBe(3);
    // photos include the bonus extras: 40 shoppers × (2 base + 3 extra) = 200
    const q = quoteFor({ customersPerLocation: 40, locations: 1, guaranteeType: 'visit', shopperBonusCents: 6000 });
    expect(q.ugc_photos).toBe(200);
  });

  it('rejects visit_purchase without a SKU price, and out-of-range SKU/bonus', () => {
    expect(() => quoteFor({ guaranteeType: 'visit_purchase' })).toThrow(/top_sku_price_cents/);
    expect(() => quoteFor({ guaranteeType: 'visit_purchase', topSkuPriceCents: 499 })).toThrow(/500/);
    expect(() => quoteFor({ guaranteeType: 'visit_purchase', topSkuPriceCents: 10001 })).toThrow(/10000|10,000/);
    expect(() => quoteFor({ guaranteeType: 'visit', shopperBonusCents: 1999 })).toThrow(/2000|bonus/);
    expect(() => quoteFor({ guaranteeType: 'visit', shopperBonusCents: 20001 })).toThrow(/20000|bonus/);
  });
});

describe('schemas accept the v8 fields', () => {
  it('StartCheckoutInput parses guarantee/sku/bonus and rejects bad ranges', () => {
    const ok = StartCheckoutInput.parse({
      customers_per_location: 40,
      locations: 1,
      guarantee_type: 'visit_purchase',
      top_sku_price_cents: 500,
      shopper_bonus_cents: 6000,
    });
    expect(ok.guarantee_type).toBe('visit_purchase');
    expect(() =>
      StartCheckoutInput.parse({ customers_per_location: 40, locations: 1, top_sku_price_cents: 400 }),
    ).toThrow();
    expect(() =>
      StartCheckoutInput.parse({ customers_per_location: 40, locations: 1, shopper_bonus_cents: 100 }),
    ).toThrow();
  });

  it('GetPricingInput accepts the v8 fields with defaults intact', () => {
    const q = GetPricingInput.parse({ guarantee_type: 'visit_purchase', top_sku_price_cents: 2500 });
    expect(q.customers_per_location).toBe(40);
    expect(q.guarantee_type).toBe('visit_purchase');
  });
});

describe('resolveAgentCheckout — v8 fields shape the order identity', () => {
  const contact = {
    your_name: 'Sam',
    work_email: 'sam@wildbar.co',
    brand_website: 'https://wildbar.co',
    campaign_start_date: '2099-01-01',
  };

  it('requires top_sku_price_cents when guarantee_type is visit_purchase', () => {
    const r = resolveAgentCheckout(
      { customers_per_location: 40, locations: 1, guarantee_type: 'visit_purchase', ...contact },
      undefined,
      'sess',
    );
    expect(r.missing.join(' ')).toMatch(/top_sku_price_cents/);
  });

  it('different guarantee/sku/bonus inputs produce different idempotency keys', () => {
    const base = { customers_per_location: 40, locations: 1, ...contact };
    const a = resolveAgentCheckout({ ...base }, undefined, 'sess').idempotencyKey;
    const b = resolveAgentCheckout(
      { ...base, guarantee_type: 'visit_purchase', top_sku_price_cents: 500 },
      undefined,
      'sess',
    ).idempotencyKey;
    const c = resolveAgentCheckout(
      { ...base, guarantee_type: 'visit_purchase', top_sku_price_cents: 500, shopper_bonus_cents: 6000 },
      undefined,
      'sess',
    ).idempotencyKey;
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
  });
});
