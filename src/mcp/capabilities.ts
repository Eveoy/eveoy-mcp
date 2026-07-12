/**
 * Canonical manifest of what the Eveoy MCP can do — the SINGLE source of truth
 * for the tool surface. Consumed by:
 *   - ask_eveoy        → answers "what can you do?" + hints the edge Q&A
 *   - /info.json       → live snapshot for the Lovable landing
 *   - public/llms.txt  → keep in sync (a test asserts every name appears there)
 *
 * When you add/rename/remove a tool, edit THIS file. No fs; the only import is the
 * lightweight config singleton, read to honor MCP_DISABLE_TOOL. Runs in the Worker isolate.
 */
import { config } from '@/config';

export type Auth = 'none' | 'oauth';

export interface Capability {
  name: string;
  title: string;
  /** One line, plain English: what it does FOR THE USER. */
  summary: string;
  group: 'Ask & learn' | 'Pricing & ordering' | 'Directory' | 'Industries & coverage' | 'More';
  triggers: string[];
  auth: Auth;
}

export const CAPABILITIES: Capability[] = [
  {
    name: 'ask_eveoy',
    title: 'Ask about Eveoy',
    summary: 'Answer any question about Eveoy — the model, pricing rationale, directory, industries, founders — and describe what this assistant can do.',
    group: 'Ask & learn',
    triggers: ['what is eveoy', 'how does eveoy work', 'eveoy vs ads', 'what can you do'],
    auth: 'none',
  },
  {
    name: 'capture_profile',
    title: 'Save your company profile',
    summary: 'Save the company you represent (name, sector, website, contact) so Eveoy tailors recommendations and the team can follow up.',
    group: 'Pricing & ordering',
    triggers: ['i represent', 'set up my company', "we're a brand", 'save our details'],
    auth: 'none',
  },
  {
    name: 'get_case_studies',
    title: 'List case studies & lookbooks',
    summary: 'List Eveoy case studies and lookbooks — links to the full write-ups on eveoy.com.',
    group: 'Ask & learn',
    triggers: ['case studies', 'success stories', 'show me results', 'lookbook'],
    auth: 'none',
  },
  {
    name: 'get_pricing',
    title: 'Get exact pricing',
    summary: 'Calculate the exact pilot price ($24.99 per shopper base; optional guaranteed purchase = SKU + 7.5% fee; optional shopper bonus + 33% fee) with the full fee breakdown.',
    group: 'Pricing & ordering',
    triggers: ['how much', 'price for 100 customers', 'cost of a pilot'],
    auth: 'none',
  },
  {
    name: 'start_checkout',
    title: 'Start a checkout',
    summary: 'Create a Stripe checkout link to buy a pilot — visit-only or guaranteed visit + purchase, optional shopper bonus — no sign-in (provide contact + campaign date, or call capture_profile first).',
    group: 'Pricing & ordering',
    triggers: ['buy a pilot', 'check out', 'place an order', 'pay'],
    auth: 'none',
  },
  {
    name: 'book_demo',
    title: 'Book a demo',
    summary: 'Get the link to book a live Eveoy demo or talk to the team.',
    group: 'Pricing & ordering',
    triggers: ['book a demo', 'schedule a call', 'talk to sales'],
    auth: 'none',
  },
  {
    name: 'check_order_status',
    title: 'Check order status',
    summary: 'Look up the status of an existing Eveoy order by its reference.',
    group: 'Pricing & ordering',
    triggers: ['order status', 'is my order paid', 'track my order'],
    auth: 'none',
  },
  {
    name: 'search_directory',
    title: 'Search the directory',
    summary: 'Search the Eveoy business directory by name, city, or category.',
    group: 'Directory',
    triggers: ['find a business', 'search the directory', 'coffee shops in LA'],
    auth: 'none',
  },
  {
    name: 'get_business',
    title: 'Get a business',
    summary: 'Fetch a single directory business listing with its details.',
    group: 'Directory',
    triggers: ['details for this business', 'show me this listing'],
    auth: 'none',
  },
  {
    name: 'claim_business',
    title: 'Claim a listing',
    summary: 'Claim a directory listing to verify ownership and see its contacts.',
    group: 'Directory',
    triggers: ['claim my business', 'this is my listing'],
    auth: 'none',
  },
  {
    name: 'list_industries',
    title: 'List industries',
    summary: 'List the 23+ industries and sectors Eveoy serves.',
    group: 'Industries & coverage',
    triggers: ['what industries', 'do you work with restaurants', 'list sectors'],
    auth: 'none',
  },
  {
    name: 'list_metros',
    title: 'List metros',
    summary: 'List the metros the Eveoy directory covers (Los Angeles live; more coming).',
    group: 'Industries & coverage',
    triggers: ['what cities', 'where are you available', 'coverage'],
    auth: 'none',
  },
  {
    name: 'get_app_link',
    title: 'Get the app',
    summary: 'Return the Eveoy shopper-app install link.',
    group: 'More',
    triggers: ['download the app', 'get the eveoy app'],
    auth: 'none',
  },
  {
    name: 'subscribe_newsletter',
    title: 'Subscribe to the newsletter',
    summary: 'Subscribe an email address to the Eveoy newsletter.',
    group: 'More',
    triggers: ['sign me up', 'newsletter', 'keep me posted'],
    auth: 'none',
  },
  {
    name: 'request_human',
    title: 'Talk to a human',
    summary: 'Hand off to a person on the Eveoy team and flag the conversation for follow-up.',
    group: 'More',
    triggers: ['talk to a human', 'connect me with someone', 'have someone call me', 'escalate'],
    auth: 'none',
  },
];

export const PROMPTS: Array<{ name: string; summary: string }> = [
  { name: 'eveoy_price_quote', summary: 'Build a clean price quote for a pilot.' },
  { name: 'pitch_for_role', summary: 'Pitch Eveoy tuned to a buyer role (CMO, CFO, VP Retail, CEO).' },
  { name: 'eveoy_objection_handle', summary: 'Handle a specific objection about Eveoy.' },
  { name: 'pilot_scope_intake', summary: 'Guided intake to scope a pilot.' },
  { name: 'recommend_pilot', summary: 'Qualify a brand, price it, and recommend a pilot end-to-end.' },
];

const GROUP_ORDER: Capability['group'][] = [
  'Ask & learn',
  'Pricing & ordering',
  'Directory',
  'Industries & coverage',
  'More',
];

/** The tool surface minus anything disabled via MCP_DISABLE_TOOL (reversible kill-switch). */
export function enabledCapabilities(): Capability[] {
  const disabled = config().disabledTools;
  return CAPABILITIES.filter((c) => !disabled.has(c.name));
}

/** Markdown the assistant returns when asked "what can you do?". */
export function capabilitiesMarkdown(): string {
  const lines: string[] = ['Eveoy MCP — here is everything I can do for you:', ''];
  for (const group of GROUP_ORDER) {
    const items = enabledCapabilities().filter((c) => c.group === group);
    if (!items.length) continue;
    lines.push(`**${group}**`);
    for (const c of items) {
      const tag = c.auth === 'oauth' ? ' _(sign-in required)_' : '';
      lines.push(`- **${c.name}** — ${c.summary}${tag}`);
    }
    lines.push('');
  }
  lines.push(`**Guided prompts:** ${PROMPTS.map((p) => `/${p.name}`).join(', ')}`);
  lines.push('');
  lines.push('Just tell me what you want to do and I will use the right one.');
  return lines.join('\n');
}

/** Compact one-liner for grounding the edge Q&A so it can route action requests. */
export function capabilitiesHint(): string {
  return (
    'Tools available via this Eveoy MCP: ' +
    enabledCapabilities().map((c) => `${c.name} (${c.summary.replace(/\.$/, '')})`).join('; ') +
    '. If the user asks what you can do, or asks to take an action (price, buy, book a demo, ' +
    'search the directory, check an order), point them to the matching tool. Otherwise answer normally.'
  );
}

const CAPABILITY_QUESTION_PATTERNS: RegExp[] = [
  /what\s+(can|do)\s+(you|it|this|that)\s+(do|help|offer)/i,
  /what\s+(can|do)\s+(this|the|that|your)?\s*(eveoy\s+)?(mcp|server|assistant|tool|connector)\s+(do|help|offer)/i,
  /what\s+are\s+you\s+able\s+to\s+do/i,
  /\b(what|which)\s+(tools?|functions?|capabilities|commands?|actions?)\b/i,
  /\b(list|show|tell)\s+(me\s+)?(your|the|all)?\s*(tools?|functions?|capabilities|commands?)\b/i,
  /how\s+can\s+you\s+help/i,
  /what\s+can\s+i\s+(do|ask|use)\s+(you\s+)?(for|here|with this)?/i,
  /\bcan\s+you\s+(book|schedule|order|buy|purchase|check\s+(my\s+)?order|search|find|look\s*up|claim|subscribe|sign\s+me\s+up)\b/i,
];

/** True when the question is about the server's OWN capabilities (not the product). */
export function isCapabilityQuestion(question: string): boolean {
  return CAPABILITY_QUESTION_PATTERNS.some((re) => re.test(question));
}
