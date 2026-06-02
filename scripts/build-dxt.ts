#!/usr/bin/env tsx
/**
 * Build dist/eveoy.dxt — the Claude Desktop one-click install package.
 *
 * .dxt is a zip with at minimum a manifest.json + an icon. For remote MCPs
 * (us), the manifest points at the public URL; no server code is bundled.
 *
 * Reference: https://x.com/AnthropicAI/status/1938272883618312670
 */
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const STAGE = join(ROOT, '.dxt-build');
const OUT_DIR = join(ROOT, 'dist');
const OUT = join(OUT_DIR, 'eveoy.dxt');

function build() {
  rmSync(STAGE, { recursive: true, force: true });
  mkdirSync(STAGE, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  copyFileSync(join(ROOT, 'dxt/manifest.json'), join(STAGE, 'manifest.json'));
  const icon = join(ROOT, 'public/icon-512.png');
  if (!existsSync(icon)) {
    console.error('FATAL: public/icon-512.png missing — run `sips -z 512 512 public/brand/y-mark.png --out public/icon-512.png`');
    process.exit(1);
  }
  copyFileSync(icon, join(STAGE, 'icon.png'));

  rmSync(OUT, { force: true });
  execSync(`( cd "${STAGE}" && zip -qr "${OUT}" . )`);
  rmSync(STAGE, { recursive: true, force: true });

  const stat = execSync(`stat -f %z "${OUT}"`).toString().trim();
  console.log(`Built ${OUT} (${stat} bytes)`);
}

build();
