import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('@/integrations/edge', () => ({
  callEdge: vi.fn(async () => ({ answer: 'Eveoy is verified in-store foot traffic.' })),
  edgeErrorMessage: (e: unknown) => String(e),
  EdgeError: class EdgeError extends Error {},
}));
vi.mock('@/integrations/crm', () => ({ logEvent: vi.fn(async () => 'accepted') }));

import { logEvent } from '@/integrations/crm';
import { registerAskEveoy } from './ask-eveoy';
import type { ToolAgent } from '@/mcp/tool-agent';

function handlerFor(agent: ToolAgent) {
  const server = new McpServer({ name: 't', version: '1' });
  registerAskEveoy(server, agent);
  const internal = server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown, e: unknown) => Promise<unknown> }>;
  };
  return internal._registeredTools['ask_eveoy'].handler;
}

describe('ask_eveoy handler', () => {
  it('logs a best-effort qa activity event for the session', async () => {
    (logEvent as unknown as ReturnType<typeof vi.fn>).mockClear();
    const handler = handlerFor({ getSessionId: () => 'sess' });
    await handler({ question: 'how does eveoy work?', audience: 'general' }, {});
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'qa', session_id: 'sess', tool: 'ask_eveoy' }),
    );
  });
});
