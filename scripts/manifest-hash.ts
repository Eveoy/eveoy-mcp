#!/usr/bin/env tsx
/**
 * Compute SHA-256 of the current tool/resource/prompt registration manifest
 * and write to app/.well-known/mcp-tool-manifest.sig/route.ts at build time.
 *
 * Clients/auditors can probe /.well-known/mcp-tool-manifest.sig and compare
 * across deploys to detect post-install descriptor mutation ("rug-pull").
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const SOURCES = [
  'src/mcp/register.ts',
  'src/mcp/schemas.ts',
];

function listFiles(): string[] {
  const root = 'src/mcp';
  const out = execSync(`find ${root} -type f -name '*.ts'`, { encoding: 'utf8' });
  return out.trim().split('\n').filter(Boolean).sort();
}

const hash = createHash('sha256');
for (const f of [...SOURCES, ...listFiles()].sort()) {
  try {
    hash.update(`${f}\n${readFileSync(f, 'utf8')}\n`);
  } catch {
    /* skip missing */
  }
}
const digest = hash.digest('hex');

const dir = join('app', '.well-known', 'mcp-tool-manifest.sig');
mkdirSync(dir, { recursive: true });
const route = `import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

const DIGEST = ${JSON.stringify(digest)};
const BUILT_AT = ${JSON.stringify(new Date().toISOString())};

export async function GET() {
  return NextResponse.json(
    { algorithm: 'sha256', digest: DIGEST, built_at: BUILT_AT },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
`;
writeFileSync(join(dir, 'route.ts'), route);
console.log(`Wrote manifest hash ${digest.slice(0, 16)}… to ${dir}/route.ts`);
