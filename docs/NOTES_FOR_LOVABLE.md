# Notes for Lovable — Eveoy MCP is live

Everything you need to wire eveoy.com's discovery surfaces to the MCP, plus the
final tool list and the few items still on your side. The Worker is built,
deployed, and smoke-tested against your real edge functions.

---

## 1. Status + URLs

| | URL | State |
|---|---|---|
| **Live now (staging)** | `https://eveoy-mcp.eveoy-1782157982.workers.dev/mcp` | ✅ deployed + tested |
| **Final (production)** | `https://mcp.eveoy.com/mcp` | ⏳ needs the DNS zone move + Worker custom domain |

The Worker is one repo: `github.com/Eveoy/eveoy-mcp` (Cloudflare). It is a thin
adapter — it calls your Supabase edge fns with the anon key only. It holds NO
Stripe/Beehiiv/service-role keys.

**Sequencing (matches your "don't flip discovery until it's live" rule):**
1. Move the `eveoy.com` DNS zone to Cloudflare (your call / Brad's).
2. We attach `mcp.eveoy.com` as a Worker Custom Domain (one wrangler change).
3. THEN you flip the discovery wiring below live, pointing at `mcp.eveoy.com`.
Until step 2, you can test/stage against the `workers.dev` URL.

## 2. Transports

- Streamable HTTP: `POST https://mcp.eveoy.com/mcp`
- Legacy SSE: `GET https://mcp.eveoy.com/sse` + `POST https://mcp.eveoy.com/sse/message`
- Both require `Accept: application/json, text/event-stream`.
- serverInfo: `{ name: "eveoy-mcp", version: "1.0.0" }`.

## 3. Final tool list (12) — name · auth · what it does · backing fn

All tools are **anonymous** today (no OAuth). Writes carry confirm-hint annotations
+ a 60/min-per-IP cap.

| Tool | Auth | Backed by | One-liner |
|---|---|---|---|
| `ask_eveoy` | none | `/ask-eveoy` (+ local KB fallback) | Q&A about Eveoy |
| `get_pricing` | none | static | Starter/Proof/Rollout, $24.99/customer |
| `list_industries` | none | static | 23+ sectors |
| `list_metros` | none | static | directory coverage (LA live) |
| `get_app_link` | none | static | `https://eveoy.com/get-app` |
| `book_demo` | none | static | `https://eveoy.com/book-demo` |
| `search_directory` | none | `/directory-query` | directory search (paginated) |
| `get_business` | none | `/directory-business` | one business by slug/id |
| `check_order_status` | none | `/get-order-summary` | masked order lookup |
| `subscribe_newsletter` | none (write) | `/subscribe-beehiiv` | newsletter opt-in |
| `claim_business` | none (write) | `/unlock-business` | claim/contact reveal — exact parity, no writeback fn |
| `start_checkout` | none (write) | `/create-checkout-session` | returns Stripe Checkout URL |

OAuth discovery URL: **not enabled** (Phase 1 anonymous). If we later gate the
write tools, the MCP stands up its own AS at
`mcp.eveoy.com/.well-known/oauth-authorization-server`.

## 4. Discovery blocks to add on eveoy.com (point at the FINAL URL)

### `public/.well-known/ai-plugin.json` → add an `mcp` block
```json
"mcp": {
  "endpoint": "https://mcp.eveoy.com/mcp",
  "transport": "streamable-http",
  "sse_endpoint": "https://mcp.eveoy.com/sse",
  "server_card": "https://mcp.eveoy.com/.well-known/mcp/server-card.json",
  "auth": "none"
}
```

### `public/.well-known/agent-skills/index.json` → add to `skills[]`
```json
{
  "id": "mcp-server",
  "name": "Eveoy MCP server",
  "description": "Ask about Eveoy, price a pilot, search the directory, start checkout — via MCP.",
  "entrypoint": "https://mcp.eveoy.com/mcp",
  "method": "POST",
  "transport": "streamable-http"
}
```

### `public/.well-known/api-catalog` (RFC 9727 linkset) → add
```json
{ "anchor": "https://mcp.eveoy.com/mcp", "rel": "service-desc", "type": "application/json" }
```

### `public/_headers` → add on `/`
```
Link: <https://mcp.eveoy.com/mcp>; rel="mcp"
```

### `index.html` `<head>` → add
```html
<link rel="mcp" href="https://mcp.eveoy.com/mcp" />
```

(The MCP Worker already serves its OWN `/llms.txt`, `/.well-known/mcp/server-card.json`,
`/robots.txt`, `/sitemap.xml`, and open CORS on those discovery paths.)

## 5. CORS allowlist (already configured in the Worker)

`eveoy.com`, `www.eveoy.com`, `*.lovable.app` (covers `eveoy-v7.lovable.app` +
`id-preview--*.lovable.app`), `claude.ai`, `chatgpt.com`, `chat.openai.com`,
`cursor.sh`, `lovable.dev`, `windsurf.dev`, MCP Inspector. Tell us if you need more.

## 6. Still on your side (3 items)

1. **`create-checkout-session`**: add `success_url_override` (allowlist
   mcp.eveoy.com/eveoy.com/www/*.lovable.app) + persist contact fields
   (your_name, work_email, brand_website, phone, campaign_start_date). Until then
   `start_checkout` uses the default success URL and omits contact capture.
2. **`get_case_studies`** source: insights page vs newsletter archive? We'll add
   the tool once you pick.
3. **OAuth issuer** for write tools — only if we decide to gate them.

## 7. What NOT to build

No `claim-business` writeback fn. `/unlock-business` is the complete claim
contract (lead insert + city record + contact reveal + JIT enrichment). Our
`claim_business` tool mirrors it verbatim — same endpoint, same payload, no branch.

## 8. Test it now (staging)

```bash
npx @modelcontextprotocol/inspector https://eveoy-mcp.eveoy-1782157982.workers.dev/mcp
```
Or add that URL as a connector in Claude/Cursor/Lovable to try the 12 tools.
