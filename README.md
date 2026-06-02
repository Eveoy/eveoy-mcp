# Eveoy MCP Server

Public Model Context Protocol (MCP) server for Eveoy by EyCrowd.

**What it does today (Phase 1)**

- `ask_eveoy` — answers questions about Eveoy from a curated public knowledge base
- `get_pricing` — computes the price for N verified customers at $24.99 each
- `list_industries` — lists the 23+ sectors Eveoy serves
- Read-only resources at `eveoy://kb/*` for direct context loading
- Prompts: `pitch_for_role`, `pilot_scope_intake`

**Coming in Phase 2**

- OAuth 2.1 + PKCE for write tools
- `create_pilot_order` — generates a Stripe Checkout URL for the published $999 pilot tier
- `check_order_status` — subject-scoped order lookup

---

## Endpoint

```
https://mcp.eveoy.com/api/mcp
```

Transport: **Streamable HTTP** (MCP spec `2025-06-18`).

## Install per client

### Lovable

1. In your Lovable workspace: **Connectors → Chat connectors → New MCP server**
2. **Server name:** `Eveoy`
3. **Server URL:** `https://mcp.eveoy.com/api/mcp`
4. Click **Add & authorize**

The agent in your Lovable chat can now answer Eveoy questions and (after Phase 2) book pilots directly from chat.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "eveoy": {
      "url": "https://mcp.eveoy.com/api/mcp"
    }
  }
}
```

Restart Claude Desktop.

### Claude.ai

**Settings → Connectors → Add custom connector** → URL: `https://mcp.eveoy.com/api/mcp`.

### ChatGPT (Apps)

**Settings → Connectors → Add MCP server** → URL: `https://mcp.eveoy.com/api/mcp`.

### Cursor

**Settings → MCP → Add MCP Server** → Type: `HTTP`. URL: `https://mcp.eveoy.com/api/mcp`.

### Windsurf

**Settings → MCP Servers → Add server** → URL: `https://mcp.eveoy.com/api/mcp`.

---

## Security & confidentiality

This server is **public** but speaks only public Eveoy facts (those reconciled against eveoy.com). A fail-closed classifier blocks any internal content — financials, roadmap, partner names, sales playbook, etc. — before it can be returned to a client.

Highlights:
- Streamable HTTP per MCP spec `2025-06-18`
- Origin allowlist + Host pinning + HSTS in `middleware.ts`
- Rate limits per IP (anonymous) and per OAuth subject (Phase 2)
- Zod `.strict()` schemas on every tool — no extra params accepted
- Output classifier with versioned denylist in `src/classifier/denylist.ts`
- No tokens or secrets ever logged; IPs HMAC-hashed with rotating salt

See `/Users/bcowdrey/.claude/plans/come-up-with-a-zippy-comet.md` (Plan v2) for the full security model.

## Local development

```bash
pnpm install
cp .env.example .env.local      # then fill in IP_HASH_SALT at minimum
pnpm dev                        # starts on http://localhost:3000
pnpm inspect                    # opens MCP Inspector against localhost
```

## Tests

```bash
pnpm typecheck
pnpm test
pnpm lint:descriptors            # CI gate on tool descriptor integrity
```

The classifier test suite (`src/classifier/__tests__/classifier.test.ts`) MUST stay at 100% — every internal pattern from §10–15 of the about-eveoy KB has a deny case.

## Deploy

```bash
vercel link
vercel env pull .env.local
vercel deploy                    # preview
vercel deploy --prod             # production after Pre-Deploy Code Review (Protocol 5)
```

Required environment for production: see `.env.example`.

## Registry submissions (Phase 4)

`mcp/server.json` is the source of truth. After deploy, submit in this order:

1. **Official MCP Registry** — `mcp-publisher publish ./mcp/server.json` (DNS TXT verification on `eveoy.com`)
2. **mcp.so** — web form at mcp.so/submit
3. **Smithery.ai** — `smithery mcp publish https://mcp.eveoy.com -n eveoy/mcp`
4. **Glama.ai/mcp** — auto-indexes from the GitHub repo
5. **mcpservers.org/remote-mcp-servers** — GitHub PR (Lovable's recommended discovery surface)
6. **PulseMCP** — mirrors official registry
7. **punkpeye/awesome-mcp-servers** — GitHub PR
8. **ChatGPT Apps directory** — OpenAI Apps SDK portal (weeks of review)
9. **Claude Desktop Directory** — Anthropic submission

## License

Proprietary. © The Eveoy™ App by EyCrowd, Inc.
