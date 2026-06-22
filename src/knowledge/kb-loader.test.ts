import { describe, it, expect } from 'vitest';
import { pickKbForQuestion, loadKb, KB_KEYS } from './kb-loader';

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
});
