import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';

/**
 * Positioning + surface-accuracy guard.
 *
 * The Eveoy MCP is a helpful Eveoy **expert associate** — here to help and educate, and
 * able to take an order when asked. It is NOT an "inbound sales rep". And the server's own
 * instructions and the agent-facing guide must never advertise tools that are turned off
 * via MCP_DISABLE_TOOL (search_directory, get_business, claim_business, list_metros) or
 * claim checkout needs a sign-in (it is anonymous).
 */
describe('positioning + surface accuracy of served copy', () => {
  const SERVED = [
    'src/index.ts',
    'mcp/server.json',
    'dxt/manifest.json',
    'public/.well-known/mcp/server-card.json',
    'public/llms.txt',
    'README.md',
    'src/knowledge/public/for-agents.md',
    'smithery.yaml',
  ];

  it('no served copy calls the server an "inbound sales rep"', async () => {
    for (const f of SERVED) {
      const raw = await readFile(f, 'utf8');
      expect(raw, `${f} still uses the "inbound sales rep" framing`).not.toMatch(/inbound sales rep/i);
    }
  });

  it('server instructions and the agent guide do not advertise disabled tools', async () => {
    const disabled = ['search_directory', 'get_business', 'claim_business', 'list_metros'];
    for (const f of ['src/index.ts', 'src/knowledge/public/for-agents.md']) {
      const raw = await readFile(f, 'utf8');
      for (const t of disabled) {
        expect(raw, `${f} advertises disabled tool ${t}`).not.toContain(t);
      }
    }
  });

  it('the agent guide does not claim checkout requires a sign-in', async () => {
    const raw = await readFile('src/knowledge/public/for-agents.md', 'utf8');
    expect(raw, 'for-agents.md still claims checkout may need sign-in').not.toMatch(/sign-?in/i);
  });
});
