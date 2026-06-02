import { createMcpHandler } from 'mcp-handler';
import { registerAll } from '@/mcp/register';
import { env } from '@/lib/env';
import { log } from '@/lib/log';

export const runtime = 'nodejs';
export const maxDuration = 800;
export const dynamic = 'force-dynamic';

/**
 * Phase 2 observability — env-gated. If SENTRY_DSN is set, dynamically
 * import @sentry/node and wrap the registered server with
 * wrapMcpServerWithSentry. No hard dep; graceful no-op when DSN absent
 * or the package isn't installed.
 *
 * Reference: https://x.com/getsentry/status/1955989547205926987
 */
async function wrapWithSentryIfAvailable<T>(server: T): Promise<T> {
  if (!process.env.SENTRY_DSN) return server;
  try {
    const sentry = (await import('@sentry/node').catch(() => null)) as
      | { wrapMcpServerWithSentry?: <S>(s: S) => S }
      | null;
    if (sentry?.wrapMcpServerWithSentry) {
      log.info('sentry.mcp.wrapped');
      return sentry.wrapMcpServerWithSentry(server);
    }
    log.warn('sentry.mcp.skip', { reason: 'wrapMcpServerWithSentry missing' });
  } catch (err) {
    log.warn('sentry.mcp.error', { reason: String(err) });
  }
  return server;
}

const handler = createMcpHandler(
  async (server) => {
    const wrapped = await wrapWithSentryIfAvailable(server);
    registerAll(wrapped);
  },
  {
    serverInfo: {
      // `name` is the programmatic id clients use in tool chips; `title` is
      // spec-added in MCP RC 2026-07-28. Until mcp-handler types accept
      // `title`, the human-friendly framing lives in `instructions`.
      name: 'eveoy',
      version: '1.0.0',
    },
    instructions:
      'Eveoy — Verified In-Store Foot Traffic ($24.99/customer). ' +
      'Eveoy delivers verified in-store customer visits at $24.99 each — GPS-confirmed, 15+ minutes ' +
      'in-store, photos and video included, auto-refund on no-shows. The $999 pilot is the ' +
      'lowest-friction entry. Use ask_eveoy for any general question, get_pricing for an exact quote, ' +
      'list_industries to confirm vertical coverage. Tools are anonymous and read-only today; write ' +
      'tools (Phase 2) will require OAuth 2.1.',
  },
  {
    basePath: '/api',
    maxDuration: 800,
    verboseLogs: false,
    redisUrl: env().UPSTASH_REDIS_REST_URL,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
