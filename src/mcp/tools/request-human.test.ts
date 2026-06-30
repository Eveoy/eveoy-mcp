import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('@/integrations/crm', () => ({ logEvent: vi.fn(async () => 'accepted') }));
import { logEvent } from '@/integrations/crm';
import { registerRequestHuman, type RequestHumanAgent } from './request-human';

function handlerFor(agent: RequestHumanAgent) {
  const server = new McpServer({ name: 't', version: '1' });
  registerRequestHuman(server, agent);
  const internal = server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown, e: unknown) => Promise<{ structuredContent?: { ok?: boolean } }> }>;
  };
  return internal._registeredTools['request_human'].handler;
}

describe('request_human handler', () => {
  it('logs a high-intent human_requested event with the session profile and returns ok', async () => {
    (logEvent as unknown as ReturnType<typeof vi.fn>).mockClear();
    const agent: RequestHumanAgent = {
      getSessionId: () => 'sess',
      state: { profile: { company_name: 'Acme', work_email: 'a@acme.com' } },
    };
    const handler = handlerFor(agent);
    const res = await handler({ reason: 'need a callback' }, {});
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'human_requested',
        session_id: 'sess',
        tool: 'request_human',
        profile: expect.objectContaining({ company_name: 'Acme' }),
      }),
    );
    expect(res.structuredContent?.ok).toBe(true);
  });
});
