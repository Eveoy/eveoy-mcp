import { describe, it, expect } from 'vitest';
import { StartCheckoutInput } from './schemas';

describe('StartCheckoutInput — agent contact fields', () => {
  it('accepts the optional agent contact fields (your_name, work_email, brand_website, campaign_start_date)', () => {
    const r = StartCheckoutInput.safeParse({
      customers_per_location: 40,
      locations: 1,
      your_name: 'Ada Lovelace',
      work_email: 'ada@acme.com',
      brand_website: 'https://acme.com',
      campaign_start_date: '2026-12-01',
    });
    expect(r.success).toBe(true);
  });
});
