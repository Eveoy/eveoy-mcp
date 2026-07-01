# Eveoy MCP

> Marketing was always a bet. We made it a sure thing.
>
> Real customers · in real stores · from any AI.

The official Eveoy MCP server — **a knowledgeable Eveoy associate any AI agent can install.** It's here to help and educate first, not to sell. Through one endpoint an agent can learn what Eveoy is, get an exact quote, save the brand it represents, and — when ready — **order verified in-store customer visits end to end, anonymously, no sign-in.**

You don't pay for tokens. You don't pay for clicks. You don't pay for hope. You pay **$24.99** per real customer who walks into your store, spends 10+ minutes, makes a purchase, and brings back ~2 on-brand photos to prove it. No-shows are **100% refunded.**

Built as a native **Cloudflare Worker** (`McpAgent` + Durable Objects). Registry: **`com.eveoy/mcp`** (v1.1.1).

**Endpoint** `https://mcp.eveoy.com/mcp` · Streamable HTTP (MCP spec `2025-06-18`) · legacy SSE at `/sse`

**Humans:** `mcp.eveoy.com` is an agent endpoint. A browser that lands on `/`, `/index.html`, or `/mcp` (Accept: `text/html`) is **302-redirected to the human-facing page at [www.eveoy.com/mcp](https://www.eveoy.com/mcp)**. Agents (Accept `*/*`, `application/json`, `text/event-stream`) are never redirected, and static/discovery paths (`/llms.txt`, `/robots.txt`, `/.well-known/*`, `/info.json`, `/health`, `POST /mcp`, `/sse`) pass through untouched.

## Add it to your AI

Remote, no auth — connects immediately. `mcp-remote` is **not** needed.

| Client | One-line setup |
|---|---|
| **Claude.ai / Claude Desktop** | Settings → Connectors → **Add custom connector** → paste `https://mcp.eveoy.com/mcp`. |
| **Claude Code** | `claude mcp add --transport http eveoy https://mcp.eveoy.com/mcp` |
| **ChatGPT** | Settings → Connectors → Add → paste the URL (developer mode). |
| **Cursor** | `.cursor/mcp.json` → `{"mcpServers":{"eveoy":{"url":"https://mcp.eveoy.com/mcp"}}}` |
| **VS Code (Copilot)** | `.vscode/mcp.json` → `{"servers":{"eveoy":{"type":"http","url":"https://mcp.eveoy.com/mcp"}}}` |
| **Windsurf** | `mcp_config.json` → `{"mcpServers":{"eveoy":{"serverUrl":"https://mcp.eveoy.com/mcp"}}}` |
| **Lovable** | Connectors → Chat connectors → New MCP server → paste the URL → Add. |

## What it does

**11 tools · 5 prompts · 10 resources.** One endpoint. Just receipts. The Worker is a thin adapter — read/static tools run at the edge; the rest call Eveoy's Supabase edge functions ("the brain") with the publishable anon key only. Every interaction is logged to Eveoy's CRM (Zoho, via a Supabase `crm-log` edge function); high-intent events — profile captured, demo booked, checkout started, order paid, human requested — also ping the team in Zoho Cliq.

**Learn**
- `ask_eveoy` — any question about Eveoy (proxies the live brain; public-only KB fallback)
- `get_case_studies` — outcome stories (aggregate; no client PII)
- `list_industries` — the 16 B2C sectors Eveoy serves
- `get_app_link` — canonical app / install links

**Quote**
- `get_pricing` — exact price; mirrors eveoy.com/order ($24.99/customer · $999 Starter pilot for 40 customers)

**Buy & convert**
- `capture_profile` — save the brand the agent represents (→ Zoho Lead)
- `start_checkout` — returns a Stripe Checkout URL directly · anonymous, no sign-in (→ Zoho Deal)
- `book_demo` — book a live walkthrough
- `subscribe_newsletter` — newsletter opt-in

**Status & handoff**
- `check_order_status` — masked order lookup by session id
- `request_human` — escalate to a person (→ Zoho Task + Cliq)

**Prompts** — `/recommend_pilot` · `/eveoy_price_quote` · `/eveoy_objection_handle` · `/pitch_for_role` · `/pilot_scope_intake`

**Resources** — 10 read-only KB docs at `eveoy://kb/*` (`overview`, `product`, `pricing`, `comparison`, `sectors`, `why-now`, `ugc-ripple`, `validation`, `directory`, and **`for-agents`** — the end-to-end how-to-buy guide written for agents).

Contracts: [`docs/API_CONTRACTS.md`](docs/API_CONTRACTS.md). Backend integration + current state: [`docs/NOTES_FOR_LOVABLE.md`](docs/NOTES_FOR_LOVABLE.md).

## What it won't say

This server speaks public Eveoy only. A versioned classifier in [`src/classifier/denylist.ts`](src/classifier/denylist.ts) blocks every internal pattern — financials, roadmap, partner names, sales playbook, secrets — before it can leave the server, and the same `assertPublic` gate ([src/classifier/public-only.ts](src/classifier/public-only.ts)) runs on every CRM payload. If a question can't be answered from the public set, the response is *"That detail isn't publicly available — email brad@eycrowd.com for more."*

---

## Architecture (Cloudflare-native)

```
mcp.eveoy.com  (Worker Custom Domain)
   │
   ▼  one Worker (src/index.ts)
 ├─ "/" → Lovable's mcp-landing edge fn (marketing source of truth)
 ├─ /info.json            live tool list + pricing + industries
 ├─ static assets (public/)      /privacy, icons, /.well-known/server-card.json,
 │    served free from the edge    robots.txt, sitemap.xml, llms.txt, eveoy.dxt
 ├─ EveoyMCP  (McpAgent + Durable Object + SQLite)
 │    wraps the official SDK McpServer; per-session state (profile, session_id) + SSE resumability
 │    serve('/mcp') = Streamable HTTP · serveSSE('/sse') = legacy
 │    start_checkout → anonymous agent path on create-checkout-session (no sign-in)
 ├─ src/integrations/crm.ts → crm-log edge fn (Zoho Activity/Lead/Deal + Cliq) · fire-and-forget
 ├─ KV (CACHE)            15-min eveoy.com fetch cache (not used for rate counting)
 └─ Rate Limit binding    per-session + per-IP soft limit (60 / 60s)
```

The deterministic core (`src/lib/pricing.ts`, `src/classifier/*`, `src/industries.ts`, `src/mcp/schemas.ts`, `src/knowledge/*`, tool/prompt bodies) is platform-agnostic — no Cloudflare imports. The Worker shell (`src/index.ts`) and `src/config.ts` are the only platform-coupled files.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars      # set IP_HASH_SALT, SUPABASE_ANON_KEY
npm run dev                         # wrangler dev → http://localhost:8787 (workerd)
npm run inspect                     # MCP Inspector against localhost:8787/mcp
```

## Quality gates

```bash
npm run typecheck                   # tsc --noEmit
npm test                            # 110 tests across 20 files (vitest)
npm run lint:descriptors            # tool-descriptor integrity gate
npx wrangler deploy --dry-run --outdir dist   # bundle validation, no login
```

The classifier suite must stay at 100% — every internal pattern from the about-eveoy KB has a deny case. The handshake suite asserts every tool follows the canonical description template, carries zero anti-slop tokens, and that `server.json` + `dxt/manifest.json` descriptions stay ≤100 chars.

## Deploy

See [`docs/CLOUDFLARE_DEPLOY.md`](docs/CLOUDFLARE_DEPLOY.md) for the full runbook (account, KV namespace, secrets, custom domain, DNS zone, registry publish). Short version:

```bash
wrangler login
wrangler kv namespace create CACHE          # paste the id into wrangler.jsonc
wrangler secret put IP_HASH_SALT
wrangler secret put SUPABASE_ANON_KEY
wrangler deploy
```

## Security posture

- Streamable HTTP per MCP spec `2025-06-18`
- Origin allowlist + Host pinning + HSTS + CORS in the Worker fetch gate ([src/index.ts](src/index.ts))
- Zod `.strict()` schemas on every tool — no extra params; inputs mirror eveoy.com/order
- **Anonymous by design** — agents read *and* buy without sign-in; no OAuth friction on the path to purchase
- Per-session + per-IP soft rate limit (Cloudflare Rate Limit binding), fail-open on limiter error
- Fail-closed public-only output classifier — every response *and* every CRM payload passes `assertPublic`
- No tokens or secrets ever logged; IPs HMAC-hashed with a rotating salt
- Session state isolated per Durable Object

## Distribution

- [`mcp/server.json`](mcp/server.json) — Official MCP Registry (`com.eveoy/mcp`, v1.1.1)
- [`smithery.yaml`](smithery.yaml) — Smithery · [`dxt/manifest.json`](dxt/manifest.json) — Claude Desktop `.dxt` (`npm run build:dxt` → served at `/eveoy.dxt`)
- `/.well-known/mcp/server-card.json` · `/llms.txt` · `/sitemap.xml` · `/robots.txt`
- Listed on mcp.so, awesome-mcp-servers, Glama, PulseMCP, and Smithery. Packets + status: [`docs/DIRECTORY_SUBMISSIONS.md`](docs/DIRECTORY_SUBMISSIONS.md).

## License

Proprietary. © The Eveoy™ MCP by Eveoy, Inc.
