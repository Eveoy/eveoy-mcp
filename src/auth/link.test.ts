import { describe, it, expect } from 'vitest';
import { __setConfigForTest } from '@/config';
import { mintLinkState, verifyLinkState, buildSignInUrl } from './link';

describe('link sign-in handoff', () => {
  __setConfigForTest({ ipHashSalt: 'test-salt-1234567890', canonicalHost: 'mcp.eveoy.com', siteUrl: 'https://www.eveoy.com' });

  it('mints a state that verifies back to the same session id', () => {
    const s = mintLinkState('streamable-http-abc');
    expect(verifyLinkState(s)).toBe('streamable-http-abc');
  });

  it('rejects a tampered state (forged session id)', () => {
    const s = mintLinkState('sess-A');
    const tampered = s.replace('sess-A', 'sess-B');
    expect(verifyLinkState(tampered)).toBeNull();
  });

  it('rejects malformed states', () => {
    expect(verifyLinkState('garbage')).toBeNull();
    expect(verifyLinkState('a.b')).toBeNull();
    expect(verifyLinkState('a.b.c.d')).toBeNull();
  });

  it('builds the www.eveoy.com sign-in URL with an encoded callback', () => {
    const url = buildSignInUrl('sid-1');
    expect(url.startsWith('https://www.eveoy.com/auth?next=')).toBe(true);
    // URLSearchParams decodes the `next` param once → the inner callback stays encoded once.
    const next = new URL(url).searchParams.get('next')!;
    expect(next.startsWith('/mcp-link?callback=')).toBe(true);
    expect(next).toContain(encodeURIComponent('https://mcp.eveoy.com/link/callback'));
    expect(next).toContain('state=');
  });
});
