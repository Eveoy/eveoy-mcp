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
    // server-level options (capabilities advertised automatically by the SDK)
  },
  {
    basePath: '/api',
    maxDuration: 800,
    verboseLogs: false,
    redisUrl: env().UPSTASH_REDIS_REST_URL,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
