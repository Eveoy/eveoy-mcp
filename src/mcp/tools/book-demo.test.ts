import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('@/integrations/crm', () => ({ logEvent: vi.fn(async () => 'accepted') }));
import { logEvent } from '@/integrations/crm';
import { registerBookDemo, type DemoAgent } from './book-demo';

function handlerFor(agent: DemoAgent) {
  const server = new McpServer({ name: 't', version: '1' });
  registerBookDemo(server, agent);
  const internal = server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown, e: unknown) => Promise<{ structuredContent?: { url?: string } }> }>;
  };
  return internal._registeredTools['book_demo'].handler;
}

describe('book_demo handler', () => {
  it('logs a high-intent demo_booked event for the session and still returns the booking url', async () => {
    (logEvent as unknown as ReturnType<typeof vi.fn>).mockClear();
    const agent: DemoAgent = { getSessionId: () => 'sess', state: {} };
    const handler = handlerFor(agent);
    const res = await handler({}, {});
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'demo_booked', session_id: 'sess', tool: 'book_demo' }),
    );
    expect(res.structuredContent?.url).toContain('/book-demo');
  });
});
