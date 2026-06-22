# Cloudflare deploy runbook — Eveoy MCP

Everything needed to take the Worker from repo → live at `https://mcp.eveoy.com/mcp`.
The build is already verified locally (`wrangler dev` + `wrangler deploy --dry-run` both pass).

## 0. Prerequisites (one-time, your hands)

- A Cloudflare account on **Workers Paid ($5/mo)** — covers Durable Objects + the volumes here. (Free tier works for everything except sustained DO usage.)
- `npm install -g wrangler` (or use the repo's `npx wrangler`).
- `wrangler login` → authorizes the CLI against your account.

## 1. Create the KV namespace + paste the id

```bash
wrangler kv namespace create CACHE
# → prints: id = "abc123..."  Paste that into wrangler.jsonc kv_namespaces[0].id
```

(The repo ships a `PLACEHOLDER_SET_AFTER_kv_create` id so local dev works; deploy needs the real id.)

## 2. Set the secret

```bash
wrangler secret put IP_HASH_SALT
# paste a long random string (e.g. `openssl rand -base64 32`)
```

## 3. First deploy (workers.dev subdomain)

```bash
npm run deploy            # wrangler deploy
```

This publishes to `https://eveoy-mcp.<your-subdomain>.workers.dev`. Smoke-test it:

```bash
curl https://eveoy-mcp.<sub>.workers.dev/health
npx @modelcontextprotocol/inspector https://eveoy-mcp.<sub>.workers.dev/mcp
```

## 4. Move the eveoy.com DNS zone to Cloudflare (consolidation)

Full zero-downtime runbook is in [`ORDER_FLOW_SPEC.md` is unrelated — use the steps below]. Critical discipline: **mirror every record in Cloudflare before flipping nameservers**, especially MX / SPF / DKIM / DMARC (Cloudflare's auto-scan is best-effort).

1. Back up Route 53: `aws route53 list-resource-record-sets --hosted-zone-id <ZID> --output json > eveoy-route53-backup.json`
2. Cloudflare dashboard → add `eveoy.com` → let it scan → **reconcile every record against the backup** (mail records stay DNS-only / grey-cloud).
3. Recreate the apex marketing-site record (Cloudflare CNAME-flattening handles apex if it's currently a Vercel ALIAS).
4. Flip nameservers at the registrar (disable DNSSEC first). Keep the Route 53 zone ~1 week for instant rollback.

Registration doesn't move — only nameservers. The registrar stays wherever it is.

## 5. Attach mcp.eveoy.com to the Worker (Custom Domain)

Once the zone is active on Cloudflare, uncomment in `wrangler.jsonc`:

```jsonc
"routes": [{ "pattern": "mcp.eveoy.com", "custom_domain": true }]
```

```bash
npm run deploy
```

Custom Domain auto-creates the proxied DNS record + provisions/renews the TLS cert. Do **not** pre-create a `mcp` CNAME — let Wrangler create it.

## 6. MCP Registry — publish `com.eveoy/mcp`

The registry namespace is verified by a **DNS TXT record at the eveoy.com apex** (independent of which Worker hosts it). The Ed25519 keypair + GitHub Action are already wired (`.github/workflows/publish-mcp.yml`, secret `MCP_REGISTRY_DNS_PRIVATE_KEY`).

1. Add the TXT record at the `eveoy.com` apex in Cloudflare DNS (Name `@`, Type `TXT`, value:
   `v=MCPv1; k=ed25519; p=+fFr3OlIwEpehgCzATWQH5FMV8iKVsnuZ5uT/oKeFCw=` — paste WITHOUT wrapping quotes).
2. Re-run the publish workflow: `gh workflow run "Publish to MCP Registry" --repo Eveoy/eveoy-mcp --ref main`.
3. Verify: `curl 'https://registry.modelcontextprotocol.io/v0/servers?search=eveoy'`.

> Rotate the key any time with `scripts/setup-dns-key.sh` (regenerates keypair, updates the GH secret, prints a new TXT value).

## 7. Continuous deploy (optional)

Add a deploy step to CI using a Cloudflare API token (`wrangler deploy` with `CLOUDFLARE_API_TOKEN` set as a repo secret), or deploy manually with `npm run deploy`. CI today runs typecheck + tests + lint + dry-run build on every push.

## What's NOT yet wired (Phase 2 — held by you)

- `create_pilot_order` + `check_order_status` write tools
- `@cloudflare/workers-oauth-provider` (OAuth 2.1 + PKCE + DCR) — the schema (`CreatePilotOrderInput`) and the Supabase edge-fn contract are already locked in [`docs/ORDER_FLOW_SPEC.md`](ORDER_FLOW_SPEC.md). Phase 2 = one integration file + the OAuth wrap.

## Cost

| Item | Cost |
|---|---|
| Workers Paid | $5/mo |
| Durable Objects (sessions) | included in Workers Paid at this volume |
| KV, Rate Limit binding | included at this volume |
| DNS zone | free on Cloudflare |
| **Total Phase 1** | **~$5/mo** |
