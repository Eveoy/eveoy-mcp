import { describe, it, expect } from 'vitest';
import { resolveAgentCheckout } from './checkout-plan';

describe('resolveAgentCheckout', () => {
  it('falls back to the captured profile and reports nothing missing when complete', () => {
    const r = resolveAgentCheckout(
      { customers_per_location: 40, locations: 1, campaign_start_date: '2026-08-01' },
      { company_name: 'Acme', contact_name: 'Ada Lovelace', work_email: 'ada@acme.com', brand_website: 'https://acme.com' },
      'sess1',
    );
    expect(r.missing).toEqual([]);
    expect(r.your_name).toBe('Ada Lovelace');
    expect(r.work_email).toBe('ada@acme.com');
    expect(r.idempotencyKey).toBe('sess1:checkout:40x1:2026-08-01');
  });
});
