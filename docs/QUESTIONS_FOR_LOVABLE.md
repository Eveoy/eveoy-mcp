# Questions for Lovable + answers to send back

Two parts: (A) what we need from Lovable to finish, (B) the answers Lovable asked us
to send back so they can wire the site.

> **Status (2026-06-22): A0–A7 RESOLVED by Lovable.** Decisions recorded inline below
> and applied to the build. The only thing still OPEN is **A2 — the edge-function
> contracts doc** (Lovable is sending request/response shapes separately); Phase 2
> tools stay stubbed until it arrives. Confirmed decisions:
> - **A0** Canonical Worker = `Eveoy/eveoy-mcp`; Lovable deletes its `mcp-server/` scaffold. ✅
> - **A1** 10 minutes canonical; "made a purchase" is standard + configurable. ✅ (applied)
> - **A2** `directory-sitemap` is sitemap-only → a new `directory-query` edge fn is needed
>   for `search_directory`/`get_business` (do NOT wrap directory-sitemap). `create-checkout-session`
>   will gain `success_url_override` (allowlist: mcp.eveoy.com, eveoy.com, www, *.lovable.app) +
>   persisted contact fields. Other contracts in a follow-up doc. ⏳ OPEN
> - **A3** Worker holds only `SUPABASE_URL` + `SUPABASE_ANON_KEY`; Stripe/Beehiiv keys stay in
>   their edge fns; no service-role in the Worker (edge fns self-gate). ✅ (applied)
> - **A4** Site OAuth `.well-known` files are placeholder stubs. The MCP stands up its OWN
>   OAuth server at `mcp.eveoy.com/.well-known/oauth-authorization-server` via
>   `@cloudflare/workers-oauth-provider`; the site will point at the Worker's issuer. ✅ (Phase 2)
> - **A5** `get_app_link` keeps returning `https://eveoy.com/get-app` (platform-detecting redirect). ✅
>   Beehiiv publication id arrives in the contracts doc.
> - **A6** Public contact = `support@eveoy.com`; dropped `brad@eycrowd.com` from MCP surfaces. ✅ (applied)
> - **A7** Hostname `mcp.eveoy.com` ✅ · serverInfo `eveoy-mcp` ✅ · CORS: `*.lovable.app` suffix
>   already covers `eveoy-v7.lovable.app` + `id-preview--*.lovable.app` (no change needed) ✅ ·
>   Web Bot Auth deferred ✅.

---

## A. Questions / decisions we need from Lovable

### A0. Which repo is the canonical MCP Worker? (most important)
Lovable scaffolded an `mcp-server/` (wrangler.toml + agents skeleton) inside the
eveoy.com project. We also have a **complete, tested, working** Worker at
`github.com/Eveoy/eveoy-mcp` (native McpAgent + Durable Objects, 55 tests, runs on
`wrangler dev`, validated `wrangler deploy --dry-run`).
**Recommendation:** `Eveoy/eveoy-mcp` is the canonical Worker; please don't build a
parallel one. Lovable owns eveoy.com + the Supabase edge functions; Claude Code owns
the Worker. They meet at the edge-fn contracts below. **Confirm?** (If you want us to
adopt anything specific from your skeleton — bindings, naming — paste it and we'll merge.)

### A1. The "10 vs 15 minutes" dwell time
Every live surface (homepage, /how-it-works, /pricing, llms.txt, ai-plugin.json) says
**10+ minutes**. Our internal knowledge base said 15. We changed the MCP to **10**.
**Confirm 10 is canonical** (and that "made a purchase" is now a standard part of the
offer, per the homepage).

### A2. Edge-function contracts (request + response JSON)
For each tool we'd wrap, we need the exact invoke body and response shape. Highest
priority first:
- `directory-sitemap` — is there a **queryable** endpoint (search by city/name/NAICS,
  fetch one business by slug/id), or only the static `sitemap.eveoy.com`? `search_directory`
  / `get_business` need a query API, not just a sitemap dump.
- `create-checkout-session` — confirm it can accept `success_url_override` (allowlisted
  to `mcp.eveoy.com`/`eveoy.com`) + the contact fields it currently discards
  (your_name, work_email, brand_website, phone, campaign_start_date). See ORDER_FLOW_SPEC.md.
- `unlock-business` (claim), `subscribe-beehiiv` (newsletter), `get-order-summary`,
  `get-app`, and the source for `get_case_studies` (insights/newsletter?).

### A3. Secrets / security posture (please confirm our firm stance)
We want the Worker to hold **only** `SUPABASE_URL` + `SUPABASE_ANON_KEY`.
- Stripe key stays inside `create-checkout-session` (Worker does NOT get `STRIPE_SECRET_KEY`). ✅?
- Beehiiv key stays inside `subscribe-beehiiv` (Worker does NOT get `BEEHIIV_API_KEY`). ✅?
- `SUPABASE_SERVICE_ROLE_KEY` only if a specific edge fn can't self-gate — which ones, if any?

### A4. OAuth (Phase 2 write tools)
The site already publishes `/.well-known/oauth-authorization-server`,
`oauth-protected-resource`, `openid-configuration`. **Which IdP backs these?** Should
the MCP's write-tool OAuth (`@cloudflare/workers-oauth-provider`) **reuse that server**,
or stand up a separate one at `mcp.eveoy.com/.well-known/oauth-authorization-server`?

### A5. App + newsletter specifics
- `get_app_link` currently returns `https://eveoy.com/get-app`. Want direct App Store /
  Play Store URLs instead? If so, send them.
- Beehiiv publication id (if `subscribe_newsletter` should target a specific list).

### A6. Public contact for the MCP
The site uses `support@eveoy.com` (ai-plugin) and `hello@eveoy.com` (agent-skills); our
classifier fallback currently says `brad@eycrowd.com`. **Which should the MCP use
publicly?** (We'll align the fallback message + KB.)

### A7. Confirmations
- Hostname `mcp.eveoy.com`? ✅
- serverInfo `name: "eveoy-mcp"` (matches your brief)? ✅
- CORS allowlist: `eveoy.com`, `www.eveoy.com`, `*.lovable.app`, plus the MCP clients
  (claude.ai, chatgpt.com, cursor.sh, lovable.dev, windsurf.dev, inspector). Anything to add
  (e.g. the published mirror `eveoy-v7.lovable.app`)?
- Web Bot Auth outbound signing — deferred (not needed for Phase 1). OK to defer?

---

## B. Answers to send back (so you can wire the site now — Phase 1)

> 1. **Final MCP URL + transports**
> - Streamable HTTP: `POST https://mcp.eveoy.com/mcp`
> - Legacy SSE: `GET https://mcp.eveoy.com/sse` + `POST https://mcp.eveoy.com/sse/message`
> - Both require `Accept: application/json, text/event-stream`.
>
> 2. **Final tool list (Phase 1, all auth: none)**
> - `ask_eveoy` — answer any question about Eveoy from the public knowledge base
> - `get_pricing` — exact pilot price (mirrors eveoy.com/order; Starter/Proof/Rollout + UGC photos)
> - `list_industries` — the 23+ sectors Eveoy serves
> - `list_metros` — Eveoy directory coverage (LA live + coming-soon metros)
> - `get_app_link` — the shopper-app install link
> - (Phase 2, auth: oauth) `book_demo`, `claim_business`, `start_checkout`, `check_order_status`; (auth: none) `search_directory`, `get_business`, `get_case_studies`, `subscribe_newsletter`
>
> 3. **OAuth discovery URL** — not enabled yet (Phase 1 is anonymous read-only). TBD per A4.
>
> 4. **Confirmed hostname** — `mcp.eveoy.com` (pending your ✅).

### `mcp` block to add to `public/.well-known/ai-plugin.json`
```json
"mcp": {
  "endpoint": "https://mcp.eveoy.com/mcp",
  "transport": "streamable-http",
  "sse_endpoint": "https://mcp.eveoy.com/sse",
  "server_card": "https://mcp.eveoy.com/.well-known/mcp/server-card.json",
  "auth": "none"
}
```

### Row to add to `public/.well-known/agent-skills/index.json` `skills[]`
```json
{
  "id": "mcp-server",
  "name": "Eveoy MCP server",
  "description": "Ask about Eveoy, get pricing, browse directory metros, get the app — via Model Context Protocol.",
  "entrypoint": "https://mcp.eveoy.com/mcp",
  "method": "POST",
  "transport": "streamable-http"
}
```

### `api-catalog` (RFC 9727) linkset entry
```json
{ "anchor": "https://mcp.eveoy.com/mcp", "rel": "service-desc", "type": "application/json" }
```
