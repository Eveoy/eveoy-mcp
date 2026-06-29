import { describe, it, expect } from 'vitest';
import { INDUSTRIES_PUBLIC } from './industries';

describe('INDUSTRIES_PUBLIC', () => {
  it('uses the canonical sector names (QSR, All B2C Brands) and is 16 long', () => {
    expect(INDUSTRIES_PUBLIC).toContain('QSR');
    expect(INDUSTRIES_PUBLIC).toContain('All B2C Brands');
    expect(INDUSTRIES_PUBLIC).not.toContain('Quick-Service Restaurants');
    expect(INDUSTRIES_PUBLIC).not.toContain('Other B2C');
    expect(INDUSTRIES_PUBLIC).toHaveLength(16);
  });
});
