import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import type { DurableObjectNamespace } from '@cloudflare/workers-types';
import { config } from '@/config';
import { log } from '@/lib/log';

/**
 * Out-of-band sign-in handoff for authenticated tools (start_checkout).
 *
 * Flow:
 *  1. start_checkout (no JWT) returns a sign-in URL → eveoy.com/auth?next=/mcp-link?callback=<mcp>/link/callback&state=<signed>
 *  2. user signs in at eveoy.com → 302 to <callback>#access_token=…&state=<signed>  (token in FRAGMENT)
 *  3. /link/callback serves a tiny HTML page; its JS reads location.hash and POSTs {access_token,state} to /link/finish
 *  4. /link/finish verifies the signed state (binds to one MCP session), then RPCs the JWT into that session's
 *     Durable Object (strongly consistent). The next start_checkout call reads this.state.jwt.
 *
 * The signed state prevents anyone from injecting a JWT into a session they don't control.
 */

interface DOStub {
  setUserJwt(jwt: string, exp?: number): Promise<void>;
}
interface LinkEnv {
  MCP_OBJECT: DurableObjectNamespace;
}

function sign(data: string): string {
  return createHmac('sha256', config().ipHashSalt).update(data).digest('base64url');
}

export function mintLinkState(sessionId: string): string {
  const body = `${sessionId}.${randomUUID().replace(/-/g, '')}`;
  return `${body}.${sign(body)}`;
}

export function verifyLinkState(state: string): string | null {
  const parts = state.split('.');
  if (parts.length !== 3) return null;
  const [sid, nonce, mac] = parts;
  const expected = sign(`${sid}.${nonce}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return sid;
}

/** Build the eveoy.com sign-in URL that returns here after auth. */
export function buildSignInUrl(sessionId: string): string {
  const c = config();
  const callback = `https://${c.canonicalHost}/link/callback`;
  const next = `/mcp-link?callback=${encodeURIComponent(callback)}&state=${encodeURIComponent(mintLinkState(sessionId))}`;
  return `${c.siteUrl}/auth?next=${encodeURIComponent(next)}`;
}

/** Decode a JWT's `exp` (seconds) without verifying — storage only; the edge fn verifies. */
function jwtExp(jwt: string): number | undefined {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1]!, 'base64url').toString('utf8')) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : undefined;
  } catch {
    return undefined;
  }
}

const BRIDGE_HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Finishing sign-in…</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#FAF8F2;color:#212121;display:grid;place-items:center;height:100vh;margin:0}p{font-size:18px}</style>
</head><body><p id="m">Finishing sign-in…</p><script>
(async()=>{
  var h=new URLSearchParams(location.hash.slice(1));
  var token=h.get("access_token"), state=h.get("state");
  history.replaceState(null,"",location.pathname);
  var m=document.getElementById("m");
  if(!token||!state){m.textContent="Invalid sign-in link.";return;}
  try{
    var r=await fetch("/link/finish",{method:"POST",credentials:"omit",headers:{"content-type":"application/json"},body:JSON.stringify({access_token:token,state:state})});
    m.textContent=r.ok?"Signed in. Return to your assistant and ask to start checkout again.":"Sign-in failed. Please try again.";
  }catch(e){m.textContent="Sign-in failed. Please try again.";}
})();
</script></body></html>`;

/** GET /link/callback → the fragment-bridge page. */
export function handleLinkCallback(): Response {
  return new Response(BRIDGE_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** POST /link/finish → verify state, RPC the JWT into the session's DO. Never logs the token. */
export async function handleLinkFinish(request: Request, env: LinkEnv): Promise<Response> {
  let parsed: { access_token?: string; state?: string };
  try {
    parsed = (await request.json()) as { access_token?: string; state?: string };
  } catch {
    return new Response('bad request', { status: 400 });
  }
  const { access_token, state } = parsed;
  if (!access_token || !state) return new Response('missing fields', { status: 400 });

  const sessionId = verifyLinkState(state);
  if (!sessionId) {
    log.warn('link.state_invalid');
    return new Response('invalid state', { status: 403 });
  }

  try {
    const stub = env.MCP_OBJECT.get(env.MCP_OBJECT.idFromName(`streamable-http:${sessionId}`));
    await (stub as unknown as DOStub).setUserJwt(access_token, jwtExp(access_token));
    log.info('link.jwt_stored'); // no token, no session id
    return Response.json({ ok: true });
  } catch (err) {
    log.error('link.store_failed', { error: String(err) });
    return new Response('store failed', { status: 500 });
  }
}
