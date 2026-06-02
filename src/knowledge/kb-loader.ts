import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Loads curated public-only KB files. These are imported via fs at module
 * init time so the deployment bundle is hermetic.
 *
 * Adding a new file: drop it into src/knowledge/public/ and add to KB_FILES.
 */
const PUBLIC_DIR = join(process.cwd(), 'src/knowledge/public');

export const KB_FILES = {
  overview:    'overview.md',
  product:     'product.md',
  pricing:     'pricing.md',
  comparison:  'comparison.md',
  'why-now':   'why-now.md',
  'ugc-ripple':'ugc-ripple.md',
  sectors:     'sectors.md',
} as const;

export type KbKey = keyof typeof KB_FILES;

const cache = new Map<KbKey, string>();

export function loadKb(key: KbKey): string {
  const cached = cache.get(key);
  if (cached) return cached;
  const content = readFileSync(join(PUBLIC_DIR, KB_FILES[key]), 'utf8');
  cache.set(key, content);
  return content;
}

export function loadAllKb(): Record<KbKey, string> {
  return Object.fromEntries(
    (Object.keys(KB_FILES) as KbKey[]).map((k) => [k, loadKb(k)]),
  ) as Record<KbKey, string>;
}

const KEYWORDS: Array<{ kb: KbKey; words: RegExp }> = [
  { kb: 'pricing',    words: /\b(pric|cost|how much|\$|999|24\.?99|pilot|spend|budget)\b/i },
  { kb: 'comparison', words: /\b(compar|vs|versus|cheaper|cheap|meta|google|facebook|influencer|ugc|ads?)\b/i },
  { kb: 'product',    words: /\b(how|work|verify|verified|gps|photos?|video|task|bundle|eight things)\b/i },
  { kb: 'sectors',    words: /\b(sector|industr|categor|vertical|qsr|retail|apparel|beauty|food)\b/i },
  { kb: 'ugc-ripple', words: /\b(ugc|content|social|viral|amplif|seo|loyalty|refer)\b/i },
  { kb: 'why-now',    words: /\b(why|now|problem|trend|cac|cpc|cpm|attribution|opt[- ]?in|att|foot traffic)\b/i },
  { kb: 'overview',   words: /\b(what|who|company|founders?|eveoy|eycrowd|tagline|headquarters?)\b/i },
];

export function pickKbForQuestion(question: string): KbKey[] {
  const hits = new Set<KbKey>();
  for (const { kb, words } of KEYWORDS) if (words.test(question)) hits.add(kb);
  if (hits.size === 0) hits.add('overview');
  return Array.from(hits);
}
