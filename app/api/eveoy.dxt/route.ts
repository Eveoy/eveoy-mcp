import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

/**
 * Serve the Claude Desktop .dxt one-click install package built by
 * `npm run build:dxt`. Falls through to 404 if the artifact wasn't built.
 */
export async function GET() {
  const path = join(process.cwd(), 'dist', 'eveoy.dxt');
  if (!existsSync(path)) {
    return NextResponse.json(
      { error: 'dxt not built — run `npm run build:dxt`' },
      { status: 404 },
    );
  }
  const body = readFileSync(path);
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="eveoy.dxt"',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
