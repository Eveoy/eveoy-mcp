import { createMcpHandler } from 'mcp-handler';
import { registerAll } from '@/mcp/register';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const maxDuration = 800;
export const dynamic = 'force-dynamic';

const handler = createMcpHandler(
  (server) => {
    registerAll(server);
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
