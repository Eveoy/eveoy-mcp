import { describe, it, expect, vi, afterEach } from 'vitest';
import { logEvent, type CrmEvent } from './crm';
import { __setConfigForTest } from '@/config';

const CONFIGURED = { supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'anon-key' };
const base: CrmEvent = { event_type: 'qa', session_id: 's1', tool: 'ask_eveoy', summary: 'hello' };

function mockFetch(impl: () => Promise<{ ok: boolean; status: number }>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn as unknown as typeof fetch);
  return fn;
}

describe('crm.logEvent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns "skipped" with no fetch when the backend is not configured', async () => {
    __setConfigForTest({ supabaseUrl: '', supabaseAnonKey: '' });
    const f = mockFetch(async () => ({ ok: true, status: 200 }));
    await expect(logEvent(base)).resolves.toBe('skipped');
    expect(f).not.toHaveBeenCalled();
  });

  it('POSTs to /functions/v1/crm-log with an event_id + anon headers and returns "accepted"', async () => {
    __setConfigForTest(CONFIGURED);
    const f = mockFetch(async () => ({ ok: true, status: 200 }));
    await expect(logEvent(base)).resolves.toBe('accepted');
    const [url, opts] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://test.supabase.co/functions/v1/crm-log');
    expect((opts.headers as Record<string, string>).apikey).toBe('anon-key');
    expect(JSON.parse(opts.body as string).event_id).toBeTruthy();
  });

  it('ALLOWS a first-party work email AND ordinary business words ("runway") in goals', async () => {
    __setConfigForTest(CONFIGURED);
    const f = mockFetch(async () => ({ ok: true, status: 200 }));
    await expect(
      logEvent({
        ...base,
        event_type: 'profile_captured',
        profile: {
          company_name: 'Acme Co',
          work_email: 'jane@acme.com',
          goals: 'extend our store runway and grow foot traffic',
        },
      }),
    ).resolves.toBe('accepted');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('BLOCKS (skipped, no POST) when the payload contains an actual secret', async () => {
    __setConfigForTest(CONFIGURED);
    const f = mockFetch(async () => ({ ok: true, status: 200 }));
    await expect(logEvent({ ...base, summary: 'leaked key sk_live_abcdef0123456789' })).resolves.toBe('skipped');
    expect(f).not.toHaveBeenCalled();
  });

  it('swallows a fetch rejection and returns "failed" (never throws)', async () => {
    __setConfigForTest(CONFIGURED);
    mockFetch(async () => {
      throw new Error('network down');
    });
    await expect(logEvent(base)).resolves.toBe('failed');
  });

  it('retries once for high-intent events on failure, then returns "failed"', async () => {
    __setConfigForTest(CONFIGURED);
    const f = mockFetch(async () => ({ ok: false, status: 500 }));
    await expect(logEvent({ ...base, event_type: 'checkout_started' })).resolves.toBe('failed');
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry low-intent events on failure', async () => {
    __setConfigForTest(CONFIGURED);
    const f = mockFetch(async () => ({ ok: false, status: 500 }));
    await expect(logEvent(base)).resolves.toBe('failed');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('sends X-MCP-Secret when the webhook secret is configured, omits it otherwise', async () => {
    __setConfigForTest({ ...CONFIGURED, mcpWebhookSecret: 'shhh-armed' });
    const f = mockFetch(async () => ({ ok: true, status: 200 }));
    await logEvent(base);
    let headers = (f.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers['X-MCP-Secret']).toBe('shhh-armed');
    expect(headers.Authorization).toBe('Bearer anon-key'); // gateway auth unchanged

    __setConfigForTest({ ...CONFIGURED, mcpWebhookSecret: '' });
    f.mockClear();
    await logEvent(base);
    headers = (f.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers['X-MCP-Secret']).toBeUndefined();
  });

  it('marks synthetic identities with test:true (explicit flag, example.com, internal domains)', async () => {
    __setConfigForTest(CONFIGURED);
    const f = mockFetch(async () => ({ ok: true, status: 200 }));
    const sent = () => JSON.parse((f.mock.calls.at(-1) as unknown as [string, RequestInit])[1].body as string);

    await logEvent({ ...base, test: true });
    expect(sent().test).toBe(true);

    await logEvent({ ...base, event_type: 'demo_booked', profile: { company_name: 'T', work_email: 'x@example.com' } });
    expect(sent().test).toBe(true);

    await logEvent({ ...base, event_type: 'demo_booked', profile: { company_name: 'E', work_email: 'brad@eveoy.com' } });
    expect(sent().test).toBe(true);

    await logEvent({ ...base, event_type: 'demo_booked', profile: { company_name: 'Real Co', work_email: 'sam@wildbar.co' } });
    expect(sent().test).toBeUndefined();
  });
});
