import { describe, it, expect } from 'vitest';
import { resolveAgentCheckout } from './checkout-plan';

describe('resolveAgentCheckout', () => {
  it('falls back to the profile, reports nothing missing, and builds a content-hashed idempotency key', () => {
    const base = { customers_per_location: 40, locations: 1, campaign_start_date: '2026-08-01' };
    const prof = { company_name: 'Acme', contact_name: 'Ada Lovelace', work_email: 'ada@acme.com', brand_website: 'https://acme.com' };
    const r = resolveAgentCheckout(base, prof, 'sess1');
    expect(r.missing).toEqual([]);
    expect(r.your_name).toBe('Ada Lovelace');
    expect(r.work_email).toBe('ada@acme.com');
    // Bounded, hashed key (no raw params), deterministic, and sensitive to targeting + buyer email.
    expect(r.idempotencyKey).toMatch(/^sess1:checkout:[0-9a-z]+$/);
    expect(r.idempotencyKey).toBe(resolveAgentCheckout(base, prof, 'sess1').idempotencyKey);
    expect(r.idempotencyKey).not.toBe(
      resolveAgentCheckout({ ...base, advancedTargeting: { gender: 'Women' } }, prof, 'sess1').idempotencyKey,
    );
    expect(r.idempotencyKey).not.toBe(
      resolveAgentCheckout(base, { ...prof, work_email: 'bob@acme.com' }, 'sess1').idempotencyKey,
    );
  });
});
