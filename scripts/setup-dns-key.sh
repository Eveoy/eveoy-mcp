#!/usr/bin/env bash
# Generate an Ed25519 keypair for the Official MCP Registry DNS-verified
# namespace `com.eveoy/*`, upload the private key to the repo's GitHub
# Actions secrets, and print the DNS TXT record value you must add at
# the apex of eveoy.com.
#
# Safe to re-run: rotates the key and updates the secret + TXT record.
# The private key is NEVER written to stdout or to a persistent file.
#
# Requires:  openssl, gh (authenticated)
# Usage:     scripts/setup-dns-key.sh [repo]   (default: Eveoy/eveoy-mcp)
set -euo pipefail

REPO="${1:-Eveoy/eveoy-mcp}"
SECRET_NAME="MCP_REGISTRY_DNS_PRIVATE_KEY"

command -v openssl >/dev/null || { echo "openssl required" >&2; exit 1; }
command -v gh      >/dev/null || { echo "gh CLI required (brew install gh)"  >&2; exit 1; }

KEY=$(mktemp -t eveoy-mcp-dns)
trap 'rm -f "$KEY"' EXIT INT TERM

openssl genpkey -algorithm Ed25519 -out "$KEY"
PRIV_HEX=$(openssl pkey -in "$KEY" -noout -text \
  | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n')
PUB_B64=$(openssl pkey -in "$KEY" -pubout -outform DER \
  | tail -c 32 | base64)

printf '%s' "$PRIV_HEX" | gh secret set "$SECRET_NAME" --repo "$REPO" --body -
unset PRIV_HEX

cat <<EOF

✓ Private key uploaded to ${REPO} secret: ${SECRET_NAME}

DNS TXT record to add at the apex of eveoy.com (NOT _mcp.eveoy.com):

  Host:   eveoy.com
  Type:   TXT
  Value:  v=MCPv1; k=ed25519; p=${PUB_B64}
  TTL:    300 (or the lowest your provider allows)

Once DNS has propagated (5–60 min), re-run the publish workflow:
  gh workflow run "Publish to MCP Registry" --repo ${REPO} --ref main

Verify propagation with:
  dig +short TXT eveoy.com

EOF
