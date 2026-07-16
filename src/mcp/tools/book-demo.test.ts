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

describe('book_demo identity forwarding (the 35-anonymous-demos fix)', () => {
  it('accepts contact fields, logs them as the profile, and prefills the booking link', async () => {
    (logEvent as unknown as ReturnType<typeof vi.fn>).mockClear();
    const handler = handlerFor({ getSessionId: () => 'sess', state: {} });
    const res = await handler(
      { contact_name: 'Sam Rivera', work_email: 'sam@wildbar.co', company_name: 'Wild Bar' },
      {},
    );
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'demo_booked',
        profile: expect.objectContaining({
          company_name: 'Wild Bar',
          contact_name: 'Sam Rivera',
          work_email: 'sam@wildbar.co',
        }),
      }),
    );
    const url = res.structuredContent?.url ?? '';
    expect(url).toContain('utm_source=mcp.eveoy.com');
    expect(url).toContain('name=Sam');
    expect(url).toContain(encodeURIComponent('sam@wildbar.co'));
  });

  it('derives a company from the email domain when only an email is given', async () => {
    (logEvent as unknown as ReturnType<typeof vi.fn>).mockClear();
    const handler = handlerFor({ getSessionId: () => 'sess', state: {} });
    await handler({ work_email: 'sam@wildbar.co' }, {});
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ profile: expect.objectContaining({ company_name: 'wildbar.co' }) }),
    );
  });

  it('falls back to the session profile when no inputs are given', async () => {
    (logEvent as unknown as ReturnType<typeof vi.fn>).mockClear();
    const handler = handlerFor({
      getSessionId: () => 'sess',
      state: { profile: { company_name: 'Acme', work_email: 'a@acme.com' } },
    });
    await handler({}, {});
    expect(logEvent).toHaveBeenCalledWith(
      expect.objectContaining({ profile: expect.objectContaining({ company_name: 'Acme' }) }),
    );
  });
});
