# Eveoy MCP

> Marketing was always a bet. We made it a sure thing.
>
> Real customers · in real stores · from any AI.

The official Eveoy MCP server. You don't pay for tokens. You don't pay for clicks. You don't pay for hope. You pay **$24.99** per real customer who walked into your store, spent 15 minutes, and brought back the photos to prove it.

**Endpoint** `https://mcp.eveoy.com/api/mcp`

## Add it to your AI

| Client | One-line setup |
|---|---|
| **Lovable** | Connectors → Chat connectors → New MCP server → paste the URL → Add & authorize. |
| **Claude Desktop** | Add `{"mcpServers":{"eveoy":{"url":"https://mcp.eveoy.com/api/mcp"}}}` to `claude_desktop_config.json`. Restart. |
| **Claude.ai** | Settings → Connectors → Add custom connector → paste the URL. |
| **ChatGPT** | Settings → Connectors → Add MCP server → paste the URL. |
| **Cursor** | Click *Add to Cursor* on [mcp.eveoy.com](https://mcp.eveoy.com), or Settings → MCP → Add (HTTP). |
| **Windsurf** | Click *Open in Windsurf* on [mcp.eveoy.com](https://mcp.eveoy.com), or Settings → MCP Servers → Add. |

## What it does

Three tools. One endpoint. Just receipts.

- `ask_eveoy` — any question about Eveoy, grounded in the public knowledge base
- `get_pricing` — exact price for N real customers at $24.99 each
- `list_industries` — the 23+ sectors Eveoy serves

Four prompts. Zero ramp-up.

- `/eveoy_price_quote` · `/eveoy_objection_handle` · `/pitch_for_role` · `/pilot_scope_intake`

## What it won't say

This server speaks public Eveoy only. A versioned classifier in [`src/classifier/denylist.ts`](src/classifier/denylist.ts) blocks every internal pattern from the about-eveoy knowledge base — financials, roadmap, partner names, sales playbook, secrets. If a question can't be answered from the public set, the response is *"That detail isn't publicly available — email brad@eycrowd.com for more."*

---

## For developers

### Run locally

```bash
npm install
cp .env.example .env.local       # set IP_HASH_SALT at minimum
npm run dev                      # http://localhost:3000
npm run inspect                  # opens MCP Inspector against localhost
```

### Quality gates

```bash
npm run typecheck
npm test                         # 38 tests
npm run lint:descriptors         # CI gate on tool descriptor integrity
npm run build
npm run build:dxt                # produces dist/eveoy.dxt for Claude Desktop
```

The classifier suite (`src/classifier/__tests__/classifier.test.ts`) must stay at 100% — every internal pattern from §10–15 of the about-eveoy KB has a deny case. The handshake suite (`tests/mcp-handshake.test.ts`) asserts every tool follows the canonical description template and carries zero Glama anti-slop tokens.

### Security posture

- Streamable HTTP per MCP spec `2025-06-18`
- Origin allowlist + Host pinning + HSTS in [`middleware.ts`](middleware.ts)
- Zod `.strict()` schemas on every tool — no extra params
- Rate limits per IP (anonymous) and per OAuth subject (Phase 2) via Upstash Redis
- Fail-closed public-only output classifier — every response passes `assertPublic`
- No tokens or secrets ever logged; IPs HMAC-hashed with rotating salt
- Tool descriptor lint gate in CI; tool-manifest hash exposed at `/.well-known/mcp-tool-manifest.sig`

### Deploy

```bash
vercel link
vercel env pull .env.local
vercel deploy                    # preview
vercel deploy --prod             # after Pre-Deploy Code Review (Protocol 5)
```

Required environment for production: see [`.env.example`](.env.example).

### Distribution surface

The Eveoy MCP is meant to be findable in every registry an AI agent might check.

- [`mcp/server.json`](mcp/server.json) — Official MCP Registry manifest (reverse-DNS `com.eveoy/mcp`)
- [`smithery.yaml`](smithery.yaml) — Smithery auto-scan config
- [`dxt/manifest.json`](dxt/manifest.json) — Claude Desktop `.dxt` package metadata; build with `npm run build:dxt` → `dist/eveoy.dxt` (also served live at `https://mcp.eveoy.com/api/eveoy.dxt`)
- [`/.well-known/mcp/server-card.json`](https://mcp.eveoy.com/.well-known/mcp/server-card.json) — out-of-band metadata mirror
- [`/sitemap.xml`](https://mcp.eveoy.com/sitemap.xml) + [`/robots.txt`](https://mcp.eveoy.com/robots.txt) — with MCP discovery hints

Submission order, contacts, and the single highest-leverage lever per registry: [`docs/REGISTRY_SUBMISSION_CHECKLIST.md`](docs/REGISTRY_SUBMISSION_CHECKLIST.md).

30-day launch plan synthesized from 20+ X.com posts (Dec 2025–Jun 2026): [`docs/LAUNCH_PLAYBOOK.md`](docs/LAUNCH_PLAYBOOK.md).

Sub-60s artifact-first demo recipe: [`docs/DEMO_RECIPE.md`](docs/DEMO_RECIPE.md).

---

## About Eveoy

You pay $24.99 per real customer who walked into your store, spent 15 minutes, and brought back the photos to prove it. $999 entry pilot for 40+ customers. 100% refunded for no-shows.

[eveoy.com](https://eveoy.com) · [brad@eycrowd.com](mailto:brad@eycrowd.com)

## License

Proprietary. © The Eveoy™ MCP by EyCrowd, Inc.
