import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

describe('start_checkout handler — agent path', () => {
  it('returns a missing-fields error when there is no JWT, no profile, and no contact provided', async () => {
    const agent: AuthAgent = { state: {}, getSessionId: () => 'sess', setState: () => {} };
    const handler = handlerFor(agent);
    const res = await handler({ customers_per_location: 40, locations: 1 }, {});
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain('work_email');
  });
});
