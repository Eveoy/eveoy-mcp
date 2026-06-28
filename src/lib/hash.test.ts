import { describe, it, expect } from 'vitest';
import { stableId } from './hash';

describe('stableId', () => {
  it('is deterministic, varies with input, and returns a short base36 token', () => {
    expect(stableId('a')).toBe(stableId('a'));
    expect(stableId('a')).not.toBe(stableId('b'));
    expect(stableId('hello world')).toMatch(/^[0-9a-z]+$/);
  });
});
