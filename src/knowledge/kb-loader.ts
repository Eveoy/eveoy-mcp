import { KB_CONTENT, type KbKey } from './kb-content';

/**
 * Public-only KB access + keyword routing. Content is inlined via kb-content.ts
 * (no node:fs) so this is fully portable to Cloudflare Workers.
 *
 * Adding a file: drop it in src/knowledge/public/, add the key to
 * scripts/gen-kb-content.sh, run it, then add a KEYWORDS entry below.
 */
export type { KbKey } from './kb-content';

export const KB_KEYS = Object.keys(KB_CONTENT) as KbKey[];

export function loadKb(key: KbKey): string {
  return KB_CONTENT[key];
}

export function loadAllKb(): Record<KbKey, string> {
  return { ...KB_CONTENT };
}

const KEYWORDS: Array<{ kb: KbKey; words: RegExp }> = [
  { kb: 'pricing',    words: /\b(pric|cost|how much|\$|999|24\.?99|pilot|spend|budget)\b/i },
  { kb: 'comparison', words: /\b(compar|vs|versus|cheaper|cheap|meta|google|facebook|influencer|ugc|ads?)\b/i },
  { kb: 'product',    words: /\b(how|work|verify|verified|gps|photos?|video|task|bundle|eight things)\b/i },
  { kb: 'sectors',    words: /\b(sector|industr|categor|vertical|qsr|retail|apparel|beauty|food)\b/i },
  { kb: 'ugc-ripple', words: /\b(ugc|content|social|viral|amplif|seo|loyalty|refer)\b/i },
  { kb: 'why-now',    words: /\b(why|now|problem|trend|cac|cpc|cpm|attribution|opt[- ]?in|att|foot traffic)\b/i },
  // Leading-boundary stems only (no trailing \b) so "directory"/"metros"/"registries" match.
  { kb: 'directory',  words: /\bdirector|\blisting|\bregistr|\bmetro|\bdataset|\bstorefront|\bbulk export/i },
  { kb: 'overview',   words: /\b(what|who|company|founders?|eveoy|eycrowd|tagline|headquarters?)\b/i },
];

export function pickKbForQuestion(question: string): KbKey[] {
  const hits = new Set<KbKey>();
  for (const { kb, words } of KEYWORDS) if (words.test(question)) hits.add(kb);
  if (hits.size === 0) hits.add('overview');
  return Array.from(hits);
}
