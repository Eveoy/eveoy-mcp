import { describe, it, expect } from 'vitest';
import { pickKbForQuestion, loadKb, KB_KEYS } from './kb-loader';
import { classify } from '../classifier/public-only';

describe('pickKbForQuestion — keyword routing', () => {
  it('routes pricing questions to the pricing KB', () => {
    expect(pickKbForQuestion('what is the pilot price?')).toContain('pricing');
  });

  it('routes directory + metro questions to the directory KB (regression: trailing \\b stem bug)', () => {
    expect(pickKbForQuestion('what is the eveoy directory?')).toContain('directory');
    expect(pickKbForQuestion('which metros are covered?')).toContain('directory');
    expect(pickKbForQuestion('do you have a registry of businesses?')).toContain('directory');
  });

  it('falls back to overview when nothing matches', () => {
    expect(pickKbForQuestion('zzz qqq')).toEqual(['overview']);
  });

  it('every routable key resolves to non-empty content', () => {
    for (const k of KB_KEYS) expect(loadKb(k).length).toBeGreaterThan(20);
  });

  it('routes proof / testimonial questions to the validation KB', () => {
    expect(pickKbForQuestion('do you have any testimonials?')).toContain('validation');
    expect(pickKbForQuestion('who is Eveoy for?')).toContain('validation');
    expect(pickKbForQuestion('show me proof it works')).toContain('validation');
  });

  it('routes agent-usage questions to the for-agents KB', () => {
    expect(pickKbForQuestion('how do I buy through the MCP?')).toContain('for-agents');
    expect(pickKbForQuestion('how can an agent purchase via the MCP?')).toContain('for-agents');
    expect(pickKbForQuestion('what is the pilot price?')).not.toContain('for-agents');
  });

  it('no KB file trips the public-only classifier (no internal data leaks)', () => {
    for (const k of KB_KEYS) {
      const result = classify(loadKb(k));
      expect(result.ok, `${k} tripped: ${result.hits.map((h) => h.id).join(', ')}`).toBe(true);
    }
  });
});
