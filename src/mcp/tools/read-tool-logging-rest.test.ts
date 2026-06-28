import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('@/integrations/edge', () => ({
  callEdge: vi.fn(async () => ({ items: [], business: null, status: 'unknown', ok: true })),
  edgeErrorMessage: (e: unknown) => String(e),
  EdgeError: class EdgeError extends Error {},
}));
vi.mock('@/integrations/crm', () => ({ logEvent: vi.fn(async () => 'accepted') }));
vi.stubGlobal(
  'fetch',
  vi.fn(async () => new Response('<urlset></urlset>', { status: 200, headers: { 'content-type': 'application/xml' } })),
);

import { logEvent } from '@/integrations/crm';
import type { ToolAgent } from '@/mcp/tool-agent';
import { registerListIndustries } from './list-industries';
import { registerListMetros } from './list-metros';
import { registerGetBusiness } from './get-business';
import { registerGetCaseStudies } from './get-case-studies';
import { registerCheckOrderStatus } from './check-order-status';
import { registerClaimBusiness } from './claim-business';

const agent: ToolAgent = { getSessionId: () => 'sess' };

function handlerFor(register: (s: McpServer, a: ToolAgent) => void, name: string) {
  const server = new McpServer({ name: 't', version: '1' });
  register(server, agent);
  const internal = server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown, e: unknown) => Promise<unknown> }>;
  };
  return internal._registeredTools[name].handler;
}

describe('remaining read-tool activity logging', () => {
  it('every remaining read tool logs an activity event (logEvent fires first)', async () => {
    (logEvent as unknown as ReturnType<typeof vi.fn>).mockClear();
    const cases: Array<[(s: McpServer, a: ToolAgent) => void, string, unknown]> = [
      [registerListIndustries, 'list_industries', {}],
      [registerListMetros, 'list_metros', {}],
      [registerGetBusiness, 'get_business', { slug: 'x' }],
      [registerGetCaseStudies, 'get_case_studies', {}],
      [registerCheckOrderStatus, 'check_order_status', { session_id: 'cs_x' }],
      [registerClaimBusiness, 'claim_business', { email: 'a@b.com', full_slug: 'x' }],
    ];
    for (const [reg, name, args] of cases) {
      await handlerFor(reg, name)(args, {}).catch(() => {});
    }
    const tools = (logEvent as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => (c[0] as { tool: string }).tool);
    expect(tools).toEqual(
      expect.arrayContaining([
        'list_industries',
        'list_metros',
        'get_business',
        'get_case_studies',
        'check_order_status',
        'claim_business',
      ]),
    );
  });
});
