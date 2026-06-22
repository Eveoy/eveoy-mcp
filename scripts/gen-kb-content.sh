#!/usr/bin/env bash
# Regenerate src/knowledge/kb-content.ts from src/knowledge/public/*.md.
# KB markdown is inlined at authoring time so the Worker bundle is hermetic
# (no node:fs at runtime — required for Cloudflare workerd).
#
# Safe because the public KB files contain no backticks and no ${...}.
# If you add either, switch to a ?raw text-import instead.
set -euo pipefail
cd "$(dirname "$0")/.."

KEYS=(overview product pricing comparison why-now ugc-ripple sectors directory)

{
  echo '/**'
  echo ' * KB content inlined at authoring time from src/knowledge/public/*.md.'
  echo ' * No node:fs at runtime — portable to Cloudflare Workers (workerd).'
  echo ' * Regenerate with: scripts/gen-kb-content.sh'
  echo ' */'
  echo ''
  echo 'export const KB_CONTENT = {'
  for key in "${KEYS[@]}"; do
    printf "  '%s': String.raw\`" "$key"
    cat "src/knowledge/public/${key}.md"
    echo '`,'
  done
  echo '} as const;'
  echo ''
  echo 'export type KbKey = keyof typeof KB_CONTENT;'
} > src/knowledge/kb-content.ts

echo "Regenerated src/knowledge/kb-content.ts"
