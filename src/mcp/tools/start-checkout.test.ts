import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('@/integrations/edge', () => ({
  callEdge: vi.fn(),
  edgeErrorMessage: (e: unknown) => `edge error: ${String(e)}`,
  EdgeError: class EdgeError extends Error {
    constructor(public readonly status: number, public readonly path = '', public readonly detail = '') {
      super('edge');
    }
  },
}));
vi.mock('@/integrations/crm', () => ({ logEvent: vi.fn(async () => 'accepted') }));

import { callEdge } from '@/integrations/edge';
import { registerStartCheckout, type AuthAgent } from './start-checkout';

type ToolResult = { isError?: boolean; content: { type: string; text: string }[] };

function handlerFor(agent: AuthAgent) {
  const server = new McpServer({ name: 't', version: '1' });
  registerStartCheckout(server, agent);
  const internal = server as unknown as {
    _registeredTools: Record<string, { handler: (args: unknown, extra: unknown) => Promise<ToolResult> }>;
  };
  return internal._registeredTools['start_checkout'].handler;
}

const profileAgent = (): AuthAgent => ({
  state: { profile: { company_name: 'Acme', contact_name: 'Ada', work_email: 'ada@acme.com', brand_website: 'https://acme.com' } },
  getSessionId: () => 'sess',
  setState: () => {},
});

describe('start_checkout handler — agent path', () => {
  it('returns a missing-fields error when there is no JWT, no profile, and no contact provided', async () => {
    const agent: AuthAgent = { state: {}, getSessionId: () => 'sess', setState: () => {} };
    const handler = handlerFor(agent);
    const res = await handler({ customers_per_location: 40, locations: 1 }, {});
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain('work_email');
  });

  it('on a session-without-url response, surfaces the session reference instead of telling the user to retry', async () => {
    (callEdge as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ sessionId: 'cs_test_123' });
    const handler = handlerFor(profileAgent());
    const res = await handler({ customers_per_location: 40, locations: 1, campaign_start_date: '2026-12-01' }, {});
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain('cs_test_123');
  });
});
