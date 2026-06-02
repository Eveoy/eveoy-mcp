import { NextResponse, type NextRequest } from 'next/server';

const ALLOWED_ORIGINS = new Set([
  'https://claude.ai',
  'https://chatgpt.com',
  'https://chat.openai.com',
  'https://cursor.sh',
  'https://lovable.dev',
  'https://windsurf.dev',
  'https://inspector.modelcontextprotocol.io',
]);

const ALLOWED_ORIGIN_SUFFIXES = ['.lovable.app', '.vercel.app'];

const CANONICAL_HOST = process.env.MCP_CANONICAL_HOST ?? 'mcp.eveoy.com';

const ALLOWED_HEADERS = [
  'Authorization',
  'Content-Type',
  'Mcp-Session-Id',
  'MCP-Protocol-Version',
  'Last-Event-ID',
].join(',');

const EXPOSED_HEADERS = ['Mcp-Session-Id', 'WWW-Authenticate'].join(',');

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return ALLOWED_ORIGIN_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isMcpRoute = pathname.startsWith('/api/') || pathname.startsWith('/.well-known/');
  if (!isMcpRoute) return NextResponse.next();

  // Host pinning (skip in dev / preview where host differs)
  if (process.env.NODE_ENV === 'production' && CANONICAL_HOST) {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    const isCanonical = host === CANONICAL_HOST;
    const isVercelPreview = host?.endsWith('.vercel.app') ?? false;
    if (!isCanonical && !isVercelPreview) {
      return new NextResponse('Misdirected Request', { status: 421 });
    }
  }

  const origin = req.headers.get('origin');

  // Browser-originated requests must come from an allowlisted Origin.
  // Non-browser clients (Node, CLI) omit Origin entirely — allow those.
  if (origin && !isAllowedOrigin(origin)) {
    return new NextResponse('Forbidden Origin', { status: 403 });
  }

  // Preflight
  if (req.method === 'OPTIONS') {
    const res = new NextResponse(null, { status: 204 });
    if (origin) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Vary', 'Origin');
      res.headers.set('Access-Control-Allow-Credentials', 'false');
      res.headers.set('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
      res.headers.set('Access-Control-Expose-Headers', EXPOSED_HEADERS);
      res.headers.set('Access-Control-Max-Age', '86400');
    }
    return res;
  }

  const res = NextResponse.next();
  if (origin) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
    res.headers.set('Access-Control-Allow-Credentials', 'false');
    res.headers.set('Access-Control-Expose-Headers', EXPOSED_HEADERS);
  }
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export const config = {
  matcher: ['/api/:path*', '/.well-known/:path*'],
};
