import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('@/integrations/edge', () => ({
  callEdge: vi.fn(async () => ({ items: [], nextCursor: null })),
  edgeErrorMessage: (e: unknown) => String(e),
  EdgeError: class EdgeError extends Error {},
}));
vi.mock('@/integrations/crm', () => ({ logEvent: vi.fn(async () => 'accepted') }));

import { logEvent } from '@/integrations/crm';
import type { ToolAgent } from '@/mcp/tool-agent';
import { registerGetPricing } from './get-pricing';
import { registerSearchDirectory } from './search-directory';
import { registerGetAppLink } from './get-app-link';
import { registerSubscribeNewsletter } from './subscribe-newsletter';

const agent: ToolAgent = { getSessionId: () => 'sess' };

function handlerFor(register: (s: McpServer, a: ToolAgent) => void, name: string) {
  const server = new McpServer({ name: 't', version: '1' });
  register(server, agent);
  const internal = server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown, e: unknown) => Promise<unknown> }>;
  };
  return internal._registeredTools[name].handler;
}

describe('read-tool activity logging', () => {
  it('the core read tools each log their low-intent event type', async () => {
    (logEvent as unknown as ReturnType<typeof vi.fn>).mockClear();
    await handlerFor(registerGetPricing, 'get_pricing')({ customers_per_location: 40, locations: 1 }, {});
    await handlerFor(registerSearchDirectory, 'search_directory')({ q: 'coffee', limit: 5 }, {});
    await handlerFor(registerGetAppLink, 'get_app_link')({}, {});
    await handlerFor(registerSubscribeNewsletter, 'subscribe_newsletter')({ email: 'a@b.com' }, {});
    const types = (logEvent as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[0] as { event_type: string }).event_type,
    );
    expect(types).toEqual(expect.arrayContaining(['pricing', 'directory', 'app_link', 'newsletter']));
  });
});
