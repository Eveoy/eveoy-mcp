import { NextResponse } from 'next/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

/**
 * Serves the canonical server.json at a well-known path so any registry,
 * crawler, or AI client can discover this MCP's metadata without auth.
 */
export async function GET() {
  const card = readFileSync(join(process.cwd(), 'mcp', 'server.json'), 'utf8');
  return new NextResponse(card, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
