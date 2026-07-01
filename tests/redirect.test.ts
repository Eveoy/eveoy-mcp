import { describe, it, expect } from 'vitest';
import { humanRedirect } from '../src/lib/redirect';

const req = (method: string, accept: string, path: string) =>
  new Request(`https://mcp.eveoy.com${path}`, {
    method,
    headers: accept ? { accept } : {},
  });
const CANON = 'https://www.eveoy.com/mcp';

/**
 * Humans who land on the root (or hit /mcp) in a browser should be sent to the
 * canonical marketing page. Agents send a non-HTML Accept (wildcard,
 * application/json, or text/event-stream) and must pass through untouched.
 * Static pages and discovery endpoints must never be redirected.
 */
describe('humanRedirect — humans to the marketing page, agents untouched', () => {
  it('redirects a browser landing on / (302 to canonical)', () => {
    const r = humanRedirect(req('GET', 'text/html,application/xhtml+xml', '/'));
    expect(r?.status).toBe(302);
    expect(r?.headers.get('location')).toBe(CANON);
  });

  it('redirects a browser hitting /index.html', () => {
    expect(humanRedirect(req('GET', 'text/html', '/index.html'))?.status).toBe(302);
  });

  it('redirects a browser that hits /mcp directly (avoids a raw JSON-RPC error page)', () => {
    const r = humanRedirect(req('GET', 'text/html', '/mcp'));
    expect(r?.status).toBe(302);
    expect(r?.headers.get('location')).toBe(CANON);
  });

  it('does NOT redirect an agent POST to /mcp', () => {
    expect(humanRedirect(req('POST', 'application/json, text/event-stream', '/mcp'))).toBeNull();
  });

  it('does NOT redirect an agent GET /mcp (Accept: application/json)', () => {
    expect(humanRedirect(req('GET', 'application/json', '/mcp'))).toBeNull();
  });

  it('does NOT redirect an SSE stream GET /mcp (Accept: text/event-stream)', () => {
    expect(humanRedirect(req('GET', 'text/event-stream', '/mcp'))).toBeNull();
  });

  it('does NOT redirect a browser viewing /llms.txt, /robots.txt, /sitemap.xml', () => {
    for (const p of ['/llms.txt', '/robots.txt', '/sitemap.xml']) {
      expect(humanRedirect(req('GET', 'text/html', p)), p).toBeNull();
    }
  });

  it('does NOT redirect discovery / health / info / sse endpoints', () => {
    for (const p of ['/health', '/info.json', '/.well-known/mcp/server-card.json', '/sse']) {
      expect(humanRedirect(req('GET', 'text/html', p)), p).toBeNull();
    }
  });

  it('does NOT redirect a non-browser GET / (Accept: */*) — landing proxy still handles it', () => {
    expect(humanRedirect(req('GET', '*/*', '/'))).toBeNull();
  });
});
