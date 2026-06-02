import { describe, it, expect } from 'vitest';
import { classify, assertPublic, PUBLIC_FALLBACK } from '../public-only';

describe('classifier — public-only denylist', () => {
  describe('PUBLIC content must pass through unchanged', () => {
    const publicExamples = [
      'Eveoy charges $24.99 per verified customer.',
      'The pilot is $999 for 40+ customers, with auto-refund on no-shows.',
      'Marketing was always a bet. We made it a sure thing.',
      'We serve 23+ sectors including Specialty Retail, Apparel, and QSR.',
      'A real customer walks in, spends 15+ minutes, and delivers verified photos.',
      'Founders: Brad Cowdrey and Ayman Al-Zamil. HQ in San Francisco.',
      'Contact: brad@eycrowd.com',
    ];
    for (const text of publicExamples) {
      it(`passes: ${text.slice(0, 50)}…`, () => {
        const r = classify(text);
        expect(r.ok, JSON.stringify(r.hits)).toBe(true);
      });
    }
  });

  describe('INTERNAL content from §10–15 MUST be denied', () => {
    const internalExamples: Array<[string, string]> = [
      ['project_y',         'Project Y creates exclusive datasets linking purchase intent and emotion.'],
      ['project_coach',     'Project Coach treats every campaign like a match to win.'],
      ['eyla',              'The EyLa AI Builder reduces inputs from 50 to 0-6.'],
      ['burn_rate',         'Monthly burn rate is approximately $85,000 as of Q1 2026.'],
      ['pre_series_a',      'Seeking a $1.2M Pre-Series A round from family offices.'],
      ['nob',               'NOB Marketing Solutions is our most advanced KSA partnership.'],
      ['foaj',              'Foaj Group governance restructuring delayed the decision.'],
      ['ksa_entity',        'Legal entity registered as Eveoy Technology Company.'],
      ['playbook_dont',     "Do not lead with foot traffic for CMOs — only 10% respond."],
      ['playbook_dont2',    "Don't lead with content for VPs of Retail."],
      ['roundtables',       'Validated through 121 B2C retail and CPG brand roundtables.'],
      ['ops_inquiries',     '4 campaign inquiries per week average from inbound.'],
      ['ops_meetings',      '30-40 meetings per week, scalable to 300/week.'],
      ['margin',            'Revenue: 35-40% margin on campaign experience fees.'],
      ['stripe_secret',     'STRIPE_SECRET_KEY=sk_live_abcdef1234567890QWERTY'],
      ['stripe_restricted', 'rk_live_abcdef1234567890XYZ'],
      ['jwt',               'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature'],
      ['internal_ip',       'Server at 10.0.5.42 returned 500'],
      ['cloud_metadata',    'curl http://169.254.169.254/latest/meta-data/'],
      ['foreign_email',     'Contact ceo@competitor.com for details'],
    ];
    for (const [label, text] of internalExamples) {
      it(`denies: ${label}`, () => {
        const r = classify(text);
        expect(r.ok, `expected deny but passed: ${text}`).toBe(false);
        expect(r.hits.length).toBeGreaterThan(0);
      });
    }
  });

  describe('assertPublic', () => {
    it('returns value unchanged when clean', () => {
      const v = { tool: 'ask_eveoy', text: '$24.99 per verified customer' };
      expect(assertPublic(v)).toEqual(v);
    });

    it('soft-fails to PUBLIC_FALLBACK in default mode', () => {
      delete process.env.MCP_CLASSIFIER_STRICT;
      const result = assertPublic('Burn rate is $85,000/month', { tool: 'ask_eveoy' });
      expect(result).toBe(PUBLIC_FALLBACK);
    });
  });
});
