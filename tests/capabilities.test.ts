import { describe, it, expect } from 'vitest';
import {
  CAPABILITIES,
  capabilitiesMarkdown,
  capabilitiesHint,
  isCapabilityQuestion,
} from '../src/mcp/capabilities';
import { buildInfo } from '../src/info';

const EXPECTED_TOOLS = [
  'ask_eveoy',
  'book_demo',
  'capture_profile',
  'check_order_status',
  'claim_business',
  'get_app_link',
  'get_business',
  'get_case_studies',
  'get_pricing',
  'list_industries',
  'list_metros',
  'search_directory',
  'start_checkout',
  'subscribe_newsletter',
];

describe('capabilities manifest — single source of truth', () => {
  it('lists exactly the registered tool set', () => {
    expect(CAPABILITIES.map((c) => c.name).sort()).toEqual(EXPECTED_TOOLS);
  });

  it('only start_checkout is auth-gated', () => {
    expect(CAPABILITIES.filter((c) => c.auth === 'oauth').map((c) => c.name)).toEqual(['start_checkout']);
  });

  it('/info.json tool list derives from the manifest', () => {
    expect(buildInfo().tools.map((t) => t.name).sort()).toEqual(EXPECTED_TOOLS);
  });

  it('the "what can you do" answer names every tool', () => {
    const md = capabilitiesMarkdown();
    for (const name of EXPECTED_TOOLS) expect(md, `markdown missing ${name}`).toContain(name);
  });

  it('the edge hint names every tool', () => {
    const hint = capabilitiesHint();
    for (const name of EXPECTED_TOOLS) expect(hint, `hint missing ${name}`).toContain(name);
  });

  it('public/llms.txt advertises every tool (no drift)', async () => {
    const fs = await import('node:fs/promises');
    const txt = await fs.readFile('public/llms.txt', 'utf8');
    for (const name of EXPECTED_TOOLS) expect(txt, `llms.txt missing ${name}`).toContain(name);
  });

  it('the manifest answer carries no banned anti-slop tokens', () => {
    const md = capabilitiesMarkdown();
    for (const pat of [/\bunlock\b/i, /\bempower\b/i, /\bseamless/i, /[🚀✨⚡]/]) {
      expect(pat.test(md), `markdown contains ${pat.source}`).toBe(false);
    }
  });
});

describe('isCapabilityQuestion — meta vs product routing', () => {
  it.each([
    'what can you do',
    'what can this MCP do',
    'what tools do you have',
    'list your capabilities',
    'show me the commands',
    'how can you help',
    'what can I do here',
    'can you book a demo',
    'can you check my order',
    'can you search the directory',
  ])('routes meta question to the capabilities answer: %s', (q) => {
    expect(isCapabilityQuestion(q)).toBe(true);
  });

  it.each([
    'what is eveoy',
    'how does eveoy work',
    'what can eveoy do for my coffee shop',
    'how much for 100 customers',
    'explain the pricing to a CFO',
    'what industries do you serve',
  ])('leaves product question for the knowledge base: %s', (q) => {
    expect(isCapabilityQuestion(q)).toBe(false);
  });
});
