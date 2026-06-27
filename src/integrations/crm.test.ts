import { describe, it, expect, vi, afterEach } from 'vitest';
import { logEvent, type CrmEvent } from './crm';
import { __setConfigForTest } from '@/config';

const CONFIGURED = { supabaseUrl: 'https://test.supabase.co', supabaseAnonKey: 'anon-key' };
const base: CrmEvent = { event_type: 'qa', session_id: 's1', tool: 'ask_eveoy', summary: 'hello' };

function mockFetch(impl: () => Promise<{ ok: boolean }>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn as unknown as typeof fetch);
  return fn;
}

describe('crm.logEvent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('no-ops (never calls fetch) when the backend is not configured', async () => {
    __setConfigForTest({ supabaseUrl: '', supabaseAnonKey: '' });
    const f = mockFetch(async () => ({ ok: true }));
    await logEvent(base);
    expect(f).not.toHaveBeenCalled();
  });

  it('POSTs to /functions/v1/crm-log with an event_id + anon headers when configured', async () => {
    __setConfigForTest(CONFIGURED);
    const f = mockFetch(async () => ({ ok: true }));
    await logEvent(base);
    expect(f).toHaveBeenCalledTimes(1);
    const [url, opts] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://test.supabase.co/functions/v1/crm-log');
    expect((opts.headers as Record<string, string>).apikey).toBe('anon-key');
    expect(JSON.parse(opts.body as string).event_id).toBeTruthy();
  });

  it('ALLOWS a first-party work email (foreign-email rule is excluded for CRM payloads)', async () => {
    __setConfigForTest(CONFIGURED);
    const f = mockFetch(async () => ({ ok: true }));
    await logEvent({
      ...base,
      event_type: 'profile_captured',
      profile: { company_name: 'Acme Co', work_email: 'jane@acme.com' },
    });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('BLOCKS (no POST) when the payload contains internal/secret data', async () => {
    __setConfigForTest(CONFIGURED);
    const f = mockFetch(async () => ({ ok: true }));
    await logEvent({ ...base, summary: 'notes on our Project Y roadmap' });
    expect(f).not.toHaveBeenCalled();
  });

  it('swallows a fetch rejection and never throws', async () => {
    __setConfigForTest(CONFIGURED);
    mockFetch(async () => {
      throw new Error('network down');
    });
    await expect(logEvent(base)).resolves.toBeUndefined();
  });

  it('retries once for high-intent events on failure (crm-log dedups on event_id)', async () => {
    __setConfigForTest(CONFIGURED);
    const f = mockFetch(async () => ({ ok: false }));
    await logEvent({ ...base, event_type: 'checkout_started' });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry low-intent events on failure', async () => {
    __setConfigForTest(CONFIGURED);
    const f = mockFetch(async () => ({ ok: false }));
    await logEvent(base); // 'qa' is low-intent
    expect(f).toHaveBeenCalledTimes(1);
  });
});
