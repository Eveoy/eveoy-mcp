import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import type { Env } from '../worker-env';
import { setRuntimeConfig, config } from '@/config';
import { registerAll } from '@/mcp/register';
import { extractIp, hashIp } from '@/lib/ipc';
import { log } from '@/lib/log';

const SERVER_INSTRUCTIONS =
  'Eveoy — the experience marketing platform built for verified in-store customer visits ' +
  '($24.99/customer). You don\'t pay for clicks, impressions, or hope. You pay $24.99 per real ' +
  'customer who walked into your store, spent 10 minutes, made a purchase, and brought back the ' +
  'photos to prove it (~2 UGC photos each). Published tiers: Starter $999 (40 customers), ' +
  'Proof $2,499 (100), Rollout $9,996 (400+). Use ask_eveoy for any question, get_pricing for an ' +
  'exact quote (inputs mirror eveoy.com/order), list_industries to confirm coverage. Read-only and ' +
  'anonymous today; write tools (book_demo, claim_business, start_checkout) arrive in Phase 2 behind OAuth 2.1.';

/**
 * McpAgent wraps the official SDK McpServer. Tool/resource/prompt registration
 * is identical to the prior build — registerAll() is unchanged. Session state +
 * SSE resumability are provided by the Durable Object (binding MCP_OBJECT).
 */
export class EveoyMCP extends McpAgent<Env> {
  server = new McpServer(
    { name: 'eveoy-mcp', version: '1.0.0' },
    { instructions: SERVER_INSTRUCTIONS },
  );

  async init() {
    registerAll(this.server);
  }
}

// ─── Edge gate: Origin allowlist · Host pin · CORS · HSTS ──────────

const ALLOWED_ORIGINS = new Set([
  'https://eveoy.com',
  'https://www.eveoy.com',
  'https://claude.ai',
  'https://chatgpt.com',
  'https://chat.openai.com',
  'https://cursor.sh',
  'https://lovable.dev',
  'https://windsurf.dev',
  'https://inspector.modelcontextprotocol.io',
]);
const ALLOWED_ORIGIN_SUFFIXES = ['.lovable.app', '.workers.dev'];

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const ALLOWED_HEADERS = 'Authorization,Content-Type,Mcp-Session-Id,MCP-Protocol-Version,Last-Event-ID';
const EXPOSED_HEADERS = 'Mcp-Session-Id,WWW-Authenticate';

function isLocalOrPreviewHost(host: string): boolean {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.endsWith('.workers.dev');
}

function originAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || ALLOWED_ORIGIN_SUFFIXES.some((s) => hostname.endsWith(s));
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
    'Access-Control-Allow-Credentials': 'false',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Expose-Headers': EXPOSED_HEADERS,
    'Access-Control-Max-Age': '86400',
  };
}

/** Returns an early Response to short-circuit, or null to proceed. */
function gate(request: Request, host: string): Response | null {
  // Host pinning — enforced only on real domains (skipped in local/preview).
  if (!isLocalOrPreviewHost(host) && host !== config().canonicalHost) {
    return new Response('Misdirected Request', { status: 421 });
  }
  const origin = request.headers.get('origin');
  // Browser-origin requests must be allowlisted; non-browser clients omit Origin.
  if (origin && !originAllowed(origin)) {
    return new Response('Forbidden Origin', { status: 403 });
  }
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...corsHeaders(origin), ...SECURITY_HEADERS } });
  }
  return null;
}

function withSecurity(resp: Response, origin: string | null): Response {
  const headers = new Headers(resp.headers);
  for (const [k, v] of Object.entries({ ...corsHeaders(origin), ...SECURITY_HEADERS })) headers.set(k, v);
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
}

async function softRateLimit(request: Request, env: Env): Promise<boolean> {
  if (!env.MCP_LIMIT) return true; // binding absent (local dev) → allow
  try {
    const key = hashIp(extractIp(request.headers));
    const { success } = await env.MCP_LIMIT.limit({ key });
    return success;
  } catch {
    return true; // fail-open on limiter error
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    setRuntimeConfig(env);
    const url = new URL(request.url);
    const host = url.host;
    const origin = request.headers.get('origin');

    const blocked = gate(request, host);
    if (blocked) return blocked;

    // Health (liveness + warm probe)
    if (url.pathname === '/health') {
      return withSecurity(
        Response.json({ ok: true, service: 'eveoy-mcp', ts: new Date().toISOString() }),
        origin,
      );
    }

    // MCP — Streamable HTTP (current spec)
    if (url.pathname === '/mcp') {
      if (!(await softRateLimit(request, env))) {
        return withSecurity(new Response('Too Many Requests', { status: 429 }), origin);
      }
      const resp = await EveoyMCP.serve('/mcp').fetch(request, env, ctx);
      return withSecurity(resp, origin);
    }

    // Legacy SSE transport (older clients)
    if (url.pathname === '/sse' || url.pathname === '/sse/message') {
      const resp = await EveoyMCP.serveSSE('/sse').fetch(request, env, ctx);
      return withSecurity(resp, origin);
    }

    // Everything else → static assets (landing, /privacy, icons, /.well-known, etc.)
    if (env.ASSETS) return env.ASSETS.fetch(request);
    log.warn('assets.unbound', { path: url.pathname });
    return new Response('Not found', { status: 404 });
  },
};
