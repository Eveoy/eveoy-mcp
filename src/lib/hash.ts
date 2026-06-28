/**
 * FNV-1a (synchronous) content hash → short base36 token.
 * Used to build bounded, content-stable dedup ids: the same inputs hash to the same
 * token (so retries dedup), while any change in inputs yields a new token.
 */
export function stableId(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
