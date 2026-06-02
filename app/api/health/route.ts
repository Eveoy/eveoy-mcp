import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'eveoy-mcp',
      ts: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
