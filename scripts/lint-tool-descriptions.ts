#!/usr/bin/env tsx
/**
 * CI gate: tool descriptions are part of the trust boundary.
 *
 * Reject if any description contains:
 *  - control or zero-width chars
 *  - prompt-injection-shaped phrases ("ignore previous", "system:", "<|", etc.)
 *  - URLs
 *  - base64 blobs (≥32 chars)
 *  - excessive whitespace runs
 *
 * Update the FORBIDDEN patterns when new attack shapes are observed.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = join(process.cwd(), 'src/mcp');

const FORBIDDEN: Array<{ id: string; pattern: RegExp }> = [
  { id: 'control_chars',  pattern: /[\x00-\x08\x0b-\x1f\x7f]/ },
  { id: 'zero_width',     pattern: /[​-‏‪-‮⁠-⁤﻿]/ },
  { id: 'ignore_previous',pattern: /\bignore\s+(?:all\s+)?previous\b/i },
  { id: 'system_marker',  pattern: /(?:^|\s)system\s*:/i },
  { id: 'role_marker',    pattern: /<\|[a-z_]+\|>/i },
  { id: 'url',            pattern: /https?:\/\//i },
  { id: 'base64_blob',    pattern: /[A-Za-z0-9+/]{32,}={0,2}/ },
  { id: 'long_whitespace',pattern: /\s{8,}/ },
];

function listFiles(): string[] {
  const out = execSync(`find ${ROOT} -type f -name '*.ts'`, { encoding: 'utf8' });
  return out.trim().split('\n').filter(Boolean);
}

const errors: Array<{ file: string; rule: string; preview: string }> = [];

for (const file of listFiles()) {
  const src = readFileSync(file, 'utf8');
  // crude extraction: look for string literals after `description:` and `title:`
  const fields = ['description', 'title'];
  for (const field of fields) {
    const re = new RegExp(`${field}\\s*:\\s*([\\'\\"])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`, 'g');
    for (const m of src.matchAll(re)) {
      const value = m[2] ?? '';
      for (const f of FORBIDDEN) {
        if (f.pattern.test(value)) {
          errors.push({ file, rule: f.id, preview: value.slice(0, 80) });
        }
      }
    }
  }
}

if (errors.length) {
  console.error('Tool descriptor lint failed:');
  for (const e of errors) console.error(`  ${e.file}  [${e.rule}]  ${e.preview}`);
  process.exit(1);
}
console.log('Tool descriptor lint passed.');
