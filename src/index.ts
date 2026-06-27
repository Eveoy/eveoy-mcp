import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import type { Env } from '../worker-env';
import { setRuntimeConfig, config } from '@/config';
import { registerAll } from '@/mcp/register';
import { registerStartCheckout, type AuthAgent } from '@/mcp/tools/start-checkout';
import { registerCaptureProfile, type ProfileAgent } from '@/mcp/tools/capture-profile';
import { handleLinkCallback, handleLinkFinish } from '@/auth/link';
import type { CompanyProfile } from '@/integrations/crm';
import { buildInfo } from '@/info';
import { extractIp, hashIp } from '@/lib/ipc';
import { log } from '@/lib/log';

const SERVER_INSTRUCTIONS =
  'Eveoy is an inbound sales rep you can use end to end: learn about Eveoy, get an exact price, ' +
  'save your company, and buy verified in-store customer visits — all through this server. Eveoy is ' +
  'pay-per-visit at $24.99 per real customer who walks into your store, spends 10+ minutes, makes a ' +
  'purchase, and brings back ~2 on-brand in-store UGC photos. Not clicks, not impressions, not a ' +
  'contract — no-shows are refunded 100%. Published tiers: Starter $999 (40 customers), Proof $2,499 ' +
  '(100), Rollout $9,996 (400+). Flow: ask_eveoy (or read eveoy://kb/for-agents) to learn, get_pricing ' +
  'or the recommend_pilot prompt to price, capture_profile to save your brand, start_checkout to buy ' +
  '(it returns a payment link; read tools are anonymous, checkout may ask for one-time sign-in). Also ' +
  'search_directory/get_business for the directory and book_demo to reach the team.';

/** Per-session state, persisted in this session's Durable Object (SQLite). */
export interface EveoyState {
  jwt?: string;
  jwtExp?: number;
  /** The agent's captured company profile (set by capture_profile), reused by start_checkout. */
  profile?: CompanyProfile;
}

/**
 * McpAgent wraps the official SDK McpServer. Each Mcp-Session-Id maps to its own
 * Durable Object, so `this.state` is per-session. The sign-in handoff RPCs a
 * Supabase JWT into this state via setUserJwt(); start_checkout reads it.
 */
export class EveoyMCP extends McpAgent<Env, EveoyState> {
  server = new McpServer(
    { name: 'eveoy-mcp', version: '1.0.1' },
    { instructions: SERVER_INSTRUCTIONS },
  );

  initialState: EveoyState = {};

  async init() {
    // Tools run in THIS Durable Object isolate, so config must be set here
    // (the fetch-handler's setRuntimeConfig ran in the separate Worker isolate).
    setRuntimeConfig(this.env);
    registerAll(this.server);
    // start_checkout needs the agent instance for per-session JWT state.
    registerStartCheckout(this.server, this as unknown as AuthAgent);
    // capture_profile needs the agent instance to persist the profile in session state.
    registerCaptureProfile(this.server, this as unknown as ProfileAgent);
  }

  /** Called via DO RPC from /link/finish after the user signs in at eveoy.com. */
  async setUserJwt(jwt: string, exp?: number): Promise<void> {
    this.setState({ ...this.state, jwt, jwtExp: exp });
  }

  /** Persist the agent's captured company profile for reuse within the session. */
  setProfile(profile: CompanyProfile): void {
    this.setState({ ...this.state, profile });
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
const EXPOSED_HEADERS = 'Mcp-Session-Id, WWW-Authenticate, Link';

// RFC 8288 discovery links advertised via HTTP headers (agent-discovery / isitagentready).
const LANDING_LINK_HEADER = [
  '</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"',
  '</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"; type="application/json"',
  '<https://www.eveoy.com/.well-known/oauth-authorization-server>; rel="oauth-authorization-server"; type="application/json"',
  '<https://www.eveoy.com/auth.md>; rel="author"; type="text/markdown"',
  '</mcp>; rel="service"; title="MCP Streamable HTTP endpoint"',
  '<https://www.eveoy.com/.well-known/api-catalog>; rel="api-catalog"',
].join(', ');

const WWW_AUTH = `Bearer resource_metadata="https://mcp.eveoy.com/.well-known/oauth-protected-resource"`;

function isLocalOrPreviewHost(host: string): boolean {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.endsWith('.workers.dev');
}

function originAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname === config().canonicalHost) return true; // same-origin (e.g. /link/finish from the bridge page)
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
  // RFC 9728: a 401 from a protected resource advertises where to find its auth server.
  if (resp.status === 401 && !headers.has('WWW-Authenticate')) {
    headers.set('WWW-Authenticate', WWW_AUTH);
  }
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
}

const LANDING_UPSTREAM = 'https://ascyiwwrflizprjypxxr.supabase.co/functions/v1/mcp-landing';

/** Proxy the landing page from Lovable's Supabase edge fn (the marketing source of truth). */
async function proxyLanding(method: string): Promise<Response> {
  try {
    const upstream = await fetch(LANDING_UPSTREAM, {
      method,
      headers: { Accept: 'text/html' },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': upstream.headers.get('cache-control') ?? 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        Link: LANDING_LINK_HEADER,
      },
    });
  } catch (err) {
    log.error('landing.proxy_failed', { error: String(err) });
    return new Response('Eveoy MCP — https://mcp.eveoy.com/mcp', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
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
        Response.json(
          { ok: true, service: 'eveoy-mcp', ts: new Date().toISOString() },
          { headers: { Link: LANDING_LINK_HEADER } },
        ),
        origin,
      );
    }

    // Public snapshot of the MCP surface (tools, pricing, industries) for the
    // Lovable landing + any client. Open CORS — it's public discovery data.
    if (url.pathname === '/info.json') {
      return new Response(JSON.stringify(buildInfo()), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
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

    // Sign-in handoff (start_checkout): eveoy.com redirects the browser here with
    // the Supabase JWT in the URL fragment; the bridge page POSTs it to /link/finish.
    if (url.pathname === '/link/callback') {
      return handleLinkCallback();
    }
    if (url.pathname === '/link/finish' && request.method === 'POST') {
      const resp = await handleLinkFinish(request, env);
      return withSecurity(resp, origin);
    }

    // Landing page is owned by Lovable (Supabase edge fn). Proxy GET/HEAD "/" and
    // "/index.html" verbatim so marketing/SEO iteration happens in one place.
    if ((request.method === 'GET' || request.method === 'HEAD') &&
        (url.pathname === '/' || url.pathname === '/index.html')) {
      return proxyLanding(request.method);
    }

    // Everything else → static assets (icons, /privacy, /llms.txt, /.well-known, etc.)
    if (env.ASSETS) return env.ASSETS.fetch(request);
    log.warn('assets.unbound', { path: url.pathname });
    return new Response('Not found', { status: 404 });
  },
};
