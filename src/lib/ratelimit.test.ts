import { describe, it, expect, vi } from 'vitest';
import { checkRateLimits } from './ratelimit';

describe('checkRateLimits', () => {
  it('enforces per-IP and per-session limits, and fails open without a binding', async () => {
    const ok = { limit: vi.fn(async () => ({ success: true })) };
    expect(await checkRateLimits(ok, 'iphash', 'sess1')).toBe(true);
    expect(ok.limit).toHaveBeenCalledWith({ key: 'ip:iphash' });
    expect(ok.limit).toHaveBeenCalledWith({ key: 'sess:sess1' });

    const failSession = { limit: vi.fn(async ({ key }: { key: string }) => ({ success: key !== 'sess:sess1' })) };
    expect(await checkRateLimits(failSession, 'iphash', 'sess1')).toBe(false);

    const failIp = { limit: vi.fn(async ({ key }: { key: string }) => ({ success: key !== 'ip:iphash' })) };
    expect(await checkRateLimits(failIp, 'iphash', null)).toBe(false);

    expect(await checkRateLimits(undefined, 'iphash', 'sess1')).toBe(true);
  });
});
