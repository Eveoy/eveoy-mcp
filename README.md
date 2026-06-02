# Eveoy MCP

> Real customers · in real stores · from any AI.

The official Eveoy MCP server. Ask about Eveoy. Book pilots. From Claude, ChatGPT, Lovable, Cursor, Windsurf — anywhere the Model Context Protocol works.

## Endpoint

```
https://mcp.eveoy.com/api/mcp
```

Streamable HTTP (MCP spec `2025-06-18`). 5-minute setup. No contracts.

## Tools

- `ask_eveoy` — any question about Eveoy, grounded in the public knowledge base
- `get_pricing` — exact price for N real customers at $24.99 each
- `list_industries` — the 23+ sectors Eveoy serves

## Slash commands (prompts)

- `/eveoy_price_quote` — one-line price for a pilot
- `/eveoy_objection_handle` — tight responses to common buyer objections
- `/pitch_for_role` — role-tuned pitch (CMO · CFO · VP Retail · CEO)
- `/pilot_scope_intake` — guided pilot-scoping conversation

## Add to your AI

| Client | Steps |
|---|---|
| **Lovable** | Connectors → Chat connectors → New MCP server. Paste `https://mcp.eveoy.com/api/mcp`. Add & authorize. |
| **Claude Desktop** | Edit `~/Library/Application Support/Claude/claude_desktop_config.json` and add `{"mcpServers":{"eveoy":{"url":"https://mcp.eveoy.com/api/mcp"}}}`. Restart. |
| **Claude.ai** | Settings → Connectors → Add custom connector. Paste the URL. |
| **ChatGPT** | Settings → Connectors → Add MCP server. Paste the URL. |
| **Cursor** | Click "Add to Cursor" on [mcp.eveoy.com](https://mcp.eveoy.com), or Settings → MCP → Add (HTTP). |
| **Windsurf** | Click "Open in Windsurf" on [mcp.eveoy.com](https://mcp.eveoy.com), or Settings → MCP Servers → Add. |

## What it does NOT say

This server speaks public Eveoy only. A versioned classifier in `src/classifier/denylist.ts` blocks every internal pattern from the about-eveoy knowledge base — financials, roadmap, partner names, sales playbook, secrets, internal IPs, foreign emails. If the question can't be answered from the public set, the tool replies *"That detail isn't publicly available — email brad@eycrowd.com for more."*

## Security posture

- Streamable HTTP per MCP spec `2025-06-18`
- Origin allowlist + Host pinning + HSTS in `middleware.ts`
- Zod `.strict()` schemas on every tool — no extra params
- Rate limits per IP (anonymous) and per OAuth subject (Phase 2) via Upstash Redis
- Fail-closed output classifier — every response passes `assertPublic`
- No tokens or secrets ever logged; IPs HMAC-hashed with rotating salt
- Tool descriptor lint gate in CI; tool-manifest hash exposed at `/.well-known/mcp-tool-manifest.sig`

Full security model: [the plan](https://github.com/bc101101/eveoy-mcp/blob/main/.notes/plan.md) (or `/Users/bcowdrey/.claude/plans/come-up-with-a-zippy-comet.md` locally).

## Local development

```bash
npm install
cp .env.example .env.local       # set IP_HASH_SALT at minimum
npm run dev                      # http://localhost:3000
npm run inspect                  # opens MCP Inspector against localhost
```

## Tests + gates

```bash
npm run typecheck
npm test
npm run lint:descriptors         # CI gate on tool descriptor integrity
npm run build
```

35 unit tests, including a sweep that the classifier denies every internal pattern from §10–15 of the about-eveoy KB.

## Deploy

```bash
vercel link
vercel env pull .env.local
vercel deploy                    # preview
vercel deploy --prod             # production (after Pre-Deploy Code Review)
```

Required environment for production: see [`.env.example`](./.env.example).

## Distribution

The Eveoy MCP is meant to be findable in every registry an AI agent might check.

- [`mcp/server.json`](./mcp/server.json) — Official MCP Registry manifest (reverse-DNS `com.eveoy/mcp`)
- [`smithery.yaml`](./smithery.yaml) — Smithery auto-scan config
- [`dxt/manifest.json`](./dxt/manifest.json) — Claude Desktop one-click `.dxt` package
- [`/.well-known/mcp/server-card.json`](https://mcp.eveoy.com/.well-known/mcp/server-card.json) — out-of-band metadata mirror
- [`/sitemap.xml`](https://mcp.eveoy.com/sitemap.xml) + [`/robots.txt`](https://mcp.eveoy.com/robots.txt) with MCP discovery hints

Submission order, contacts, and the single highest-leverage lever per registry: [`docs/REGISTRY_SUBMISSION_CHECKLIST.md`](./docs/REGISTRY_SUBMISSION_CHECKLIST.md).

30-day launch plan synthesized from 20+ X.com posts (Dec 2025–Jun 2026): [`docs/LAUNCH_PLAYBOOK.md`](./docs/LAUNCH_PLAYBOOK.md).

Sub-60s demo recipe (artifact-first format, proven by Alex Albert/Anthropic): [`docs/DEMO_RECIPE.md`](./docs/DEMO_RECIPE.md).

## About Eveoy

You pay $24.99 per real customer who walked into your store, spent 15 minutes, and brought back the photos to prove it. $999 entry pilot for 40+ customers. 100% refunded for no-shows.

[eveoy.com](https://eveoy.com) · [brad@eycrowd.com](mailto:brad@eycrowd.com)

## License

Proprietary. © The Eveoy™ MCP by EyCrowd, Inc.
