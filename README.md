# Eveoy MCP

> Marketing was always a bet. We made it a sure thing.
>
> Real customers · in real stores · from any AI.

The official Eveoy MCP server — a **native Cloudflare Worker** (`McpAgent` + Durable Objects). You don't pay for tokens. You don't pay for clicks. You don't pay for hope. You pay **$24.99** per real customer who walked into your store, spent 15 minutes, and brought back the photos to prove it.

**Endpoint** `https://mcp.eveoy.com/mcp` · Streamable HTTP (MCP spec `2025-06-18`)

## Add it to your AI

| Client | One-line setup |
|---|---|
| **Lovable** | Connectors → Chat connectors → New MCP server → paste the URL → Add & authorize. |
| **Claude Desktop** | Add `{"mcpServers":{"eveoy":{"url":"https://mcp.eveoy.com/mcp"}}}` to `claude_desktop_config.json`. Restart. |
| **Claude.ai** | Settings → Connectors → Add custom connector → paste the URL. |
| **ChatGPT** | Settings → Connectors → Add MCP server → paste the URL. |
| **Cursor** | Click *Add to Cursor* on [mcp.eveoy.com](https://mcp.eveoy.com), or Settings → MCP → Add (HTTP). |
| **Windsurf** | Click *Open in Windsurf* on [mcp.eveoy.com](https://mcp.eveoy.com), or Settings → MCP Servers → Add. |

## What it does

Twelve tools. One endpoint. Just receipts. The Worker is a thin adapter — read/static
tools run locally; the rest call Eveoy's Supabase edge functions ("the brain") with the
publishable anon key only.

**Read / static**
- `ask_eveoy` — any question about Eveoy (proxies the live `/ask-eveoy` brain; local KB fallback)
- `get_pricing` — exact price; mirrors eveoy.com/order (Starter/Proof/Rollout, $24.99/customer)
- `list_industries` — the 23+ sectors Eveoy serves
- `list_metros` — Eveoy directory coverage (LA live)
- `get_app_link` · `book_demo` — canonical install / demo links

**Edge-backed (Supabase)**
- `search_directory` — directory search (`/directory-query`)
- `get_business` — one business by slug/id (`/directory-business`)
- `check_order_status` — masked order lookup (`/get-order-summary`)
- `subscribe_newsletter` — newsletter opt-in (`/subscribe-beehiiv`)
- `claim_business` — listing claim + contact reveal (`/unlock-business`)
- `start_checkout` — Stripe Checkout URL (`/create-checkout-session`)

Contracts: [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md). Architecture: [`docs/WORKING_WITH_LOVABLE.md`](docs/WORKING_WITH_LOVABLE.md).

Four prompts. No ramp-up. No guesswork.

- `/eveoy_price_quote` · `/eveoy_objection_handle` · `/pitch_for_role` · `/pilot_scope_intake`

## What it won't say

This server speaks public Eveoy only. A versioned classifier in [`src/classifier/denylist.ts`](src/classifier/denylist.ts) blocks every internal pattern from the about-eveoy knowledge base — financials, roadmap, partner names, sales playbook, secrets — before it can leave the server. If a question can't be answered from the public set, the response is *"That detail isn't publicly available — email brad@eycrowd.com for more."*

---

## Architecture (Cloudflare-native)

```
mcp.eveoy.com  (Worker Custom Domain)
   │
   ▼  one Worker (src/index.ts)
 ├─ "/" → proxied to Lovable's mcp-landing edge fn (marketing source of truth)
 ├─ /info.json            live tool list + pricing + industries (for the landing)
 ├─ static assets (public/)         /privacy, icons, /.well-known/server-card.json,
 │    served free from the edge       robots.txt, sitemap.xml, llms.txt, eveoy.dxt
 ├─ EveoyMCP  (McpAgent + Durable Object + SQLite)
 │    wraps the official SDK McpServer; session state + SSE resumability
 │    serve('/mcp') = Streamable HTTP · serveSSE('/sse') = legacy
 │    start_checkout gated by sign-in handoff (/link/callback, /link/finish)
 ├─ KV (CACHE)            15-min eveoy.com fetch cache (Phase 3)
 ├─ Rate Limit binding    per-IP soft limit (60/60s)
 └─ Phase 2: @cloudflare/workers-oauth-provider for write-tool auth
```

The deterministic core (`src/lib/pricing.ts`, `src/classifier/*`, `src/industries.ts`, `src/mcp/schemas.ts`, `src/knowledge/*`, tool/prompt bodies) is platform-agnostic — no Cloudflare or Vercel imports. The Worker shell (`src/index.ts`) and `src/config.ts` are the only platform-coupled files.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars      # set IP_HASH_SALT
npm run dev                         # wrangler dev → http://localhost:8787 (workerd)
npm run inspect                     # MCP Inspector against localhost:8787/mcp
```

## Quality gates

```bash
npm run typecheck                   # tsc --noEmit
npm test                            # 50 tests (vitest)
npm run lint:descriptors            # tool-descriptor integrity gate
npx wrangler deploy --dry-run --outdir dist   # bundle validation, no login
```

The classifier suite must stay at 100% — every internal pattern from §10–15 of the about-eveoy KB has a deny case. The handshake suite asserts every tool follows the canonical description template, carries zero Glama anti-slop tokens, and that `server.json` + `dxt/manifest.json` descriptions stay ≤100 chars.

## Deploy

See [`docs/CLOUDFLARE_DEPLOY.md`](docs/CLOUDFLARE_DEPLOY.md) for the full runbook (account, KV namespace, secrets, custom domain, DNS zone move, registry publish). Short version:

```bash
wrangler login
wrangler kv namespace create CACHE          # paste the id into wrangler.jsonc
wrangler secret put IP_HASH_SALT
wrangler deploy
```

## Security posture

- Streamable HTTP per MCP spec `2025-06-18`
- Origin allowlist + Host pinning + HSTS + CORS in the Worker fetch gate ([src/index.ts](src/index.ts))
- Zod `.strict()` schemas on every tool — no extra params, inputs mirror eveoy.com/order
- Per-IP soft rate limit (Cloudflare Rate Limit binding), fail-open on limiter error
- Fail-closed public-only output classifier — every response passes `assertPublic`
- No tokens or secrets ever logged; IPs HMAC-hashed with a rotating salt
- Session state isolated per Durable Object

## Distribution

- [`mcp/server.json`](mcp/server.json) — Official MCP Registry manifest (reverse-DNS `com.eveoy/mcp`)
- [`smithery.yaml`](smithery.yaml) — Smithery auto-scan config
- [`dxt/manifest.json`](dxt/manifest.json) — Claude Desktop `.dxt`; `npm run build:dxt` → served at `/eveoy.dxt`
- `/.well-known/mcp/server-card.json` — out-of-band metadata mirror · `/sitemap.xml` · `/robots.txt`

Submission order and levers: [`docs/REGISTRY_SUBMISSION_CHECKLIST.md`](docs/REGISTRY_SUBMISSION_CHECKLIST.md). Launch plan: [`docs/LAUNCH_PLAYBOOK.md`](docs/LAUNCH_PLAYBOOK.md). Demo recipe: [`docs/DEMO_RECIPE.md`](docs/DEMO_RECIPE.md). Phase 2 order contract: [`docs/ORDER_FLOW_SPEC.md`](docs/ORDER_FLOW_SPEC.md). Working with Lovable: [`docs/WORKING_WITH_LOVABLE.md`](docs/WORKING_WITH_LOVABLE.md).

## License

Proprietary. © The Eveoy™ MCP by EyCrowd, Inc.
