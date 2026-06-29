# Notes for Lovable — Eveoy MCP is live

## ⚡ 2026-06-28 — Sales-rep upgrade is LIVE (v1.1.0). Read this first.

The MCP is now an **inbound sales rep**: agents can learn → profile → quote → buy end to
end. Shipped + live on `mcp.eveoy.com`; registry republished to **`com.eveoy/mcp` v1.1.0**.
Numbers in the older sections below predate this (they say v1.0.0 / 12 tools / 4 prompts —
it is now **14 tools, 5 prompts, 10 KB resources, v1.1.0**).

**New since v1.0.x (all live, anonymous):**
- `capture_profile` (write) — the agent saves the company it represents → session state + a
  `profile_captured` CRM event (Zoho Lead + Cliq once `crm-log` exists; today it no-ops
  gracefully and the tool still confirms in-session).
- `recommend_pilot` (prompt) — qualify (sector / #stores / goal) → `get_pricing` → explain
  $24.99/visit (10+ min, a purchase, ~2 on-brand in-store UGC photos, no-shows 100% refunded)
  → offer `capture_profile` + `start_checkout`.
- `eveoy://kb/for-agents` (resource) — the end-to-end "how to use this server" guide for agents.
- Reframed positioning across server-card, `llms.txt`, `mcp/server.json`, `dxt/manifest.json`,
  and SERVER_INSTRUCTIONS ("inbound sales rep for AI agents").

### 🔴 P0 — two edge fns we need from you (this upgrade stays dark until these land)

The MCP side is built and waiting; these are the only blockers.

**1. `crm-log`** — fast-ack logging fn. The MCP already POSTs this EXACT shape:
```
POST /functions/v1/crm-log    (apikey: anon; NO user JWT)
{ "event_type": "profile_captured|demo_booked|checkout_started|order_paid|qa|pricing|directory|app_link|newsletter|human_requested",
  "session_id": "string", "tool": "string", "summary": "string",
  "event_id": "string (idempotency / dedup key)",
  "agent_id": "string?",
  "profile": { "company_name", "brand_website?", "sector?", "locations?", "contact_name?", "work_email?", "goals?" }?,
  "metadata": {}? }
```
Return **202 immediately**, then in the background: write a Zoho **Activity**; upsert a **Lead**
when `profile` is present; fire **Cliq** only on high-intent types (`profile_captured`,
`demo_booked`, `checkout_started`, `order_paid`, `human_requested`). **Idempotent on `event_id`**
(the MCP retries high-intent events once). Hold the Zoho refresh token as a Supabase secret.
No MCP redeploy needed — logging lights up the moment this returns 202 instead of 404.

**2. `create-checkout-session` — add a no-JWT agent path.** Accept the 5 contact fields
(`your_name`, `work_email`, `brand_website`, `phone`, `campaign_start_date`) + `locations` +
`customers_per_location` **without a user JWT**; support an `idempotency_key`; create/attach a
Zoho **Deal** (in a `created` stage); return `{ url, sessionId }`. Soft-validate
`work_email`/`brand_website` + rate-limit server-side. This unblocks reworking `start_checkout`
to return a payment link directly instead of the sign-in handoff (§11b).

**3. Stripe webhook** — on `checkout.session.completed`: Zoho Deal → **Won** + Cliq "order paid".

**What we need back from you:** ✅ RESOLVED — `Web_MCP_*` fields created, Zoho auth via the
gateway connector, and the Cliq channel `#mcpleads` webhook is live + tested (HTTP 204). Full
field maps + contracts are in the build spec below. `ZOHO_CLIQ_WEBHOOK_URL` is delivered
**separately as a secret** (it carries a zapikey token — never in this repo).

### 🟡 Cloudflare / DNS — one standing note
MCP-registry publishing depends on the apex `eveoy.com` **TXT** record
`v=MCPv1; k=ed25519; p=0hazy…` — it lives in **your Cloudflare zone** (nameservers `simon`/
`stella.ns.cloudflare.com`), not in anything we control. **If `eveoy.com` DNS is ever migrated
or re-pointed, carry that TXT record over** — without it, registry publishes fail at DNS login.
Nothing to do otherwise: future republishes are just a version bump in `mcp/server.json` + push;
CI signs with the matching GitHub secret. (`mcp.eveoy.com` custom domain is unchanged.)

### Full Zoho/Stripe build spec — field mappings, Cliq, edge cases

**`crm-log` behavior:** insert into `mcp_events` (unique `event_id`; duplicate → return 202 and
stop), return **202**, then in `EdgeRuntime.waitUntil`: always create a Zoho **Task**; if `profile`
is present upsert a **Lead**; if high-intent, post **Cliq**. Payload shape is in the P0 block above.
`event_type` enum (10): `qa, pricing, directory, app_link, newsletter, profile_captured,
demo_booked, checkout_started, order_paid, human_requested` — build for the full enum; today only
`profile_captured` fires.

**Lead mapping** (when `profile` present):

| Zoho field | Source | Notes |
|---|---|---|
| `Company` | `profile.company_name` | |
| `Website` | `profile.brand_website` | |
| `Industry` | `profile.sector` | add the 16 values to the picklist; else use `Web_MCP_Sector` |
| `Last_Name` | `profile.contact_name` | split on first space → First/Last; **if absent, `Last_Name = company_name`** |
| `First_Name` | first token of `contact_name` | only if it splits |
| `Email` | `profile.work_email` | upsert key; **if absent, match/create by `Company`** |
| `Description` | `profile.goals` | |
| `Lead_Source` | `"MCP Agent"` (constant) | |
| `Web_MCP_Locations` | `profile.locations` | |
| `Web_MCP_Session_Id` | `session_id` | |
| `Web_MCP_Agent_Id` | `agent_id ?? session_id` | agent_id usually absent today |

**Activity (Task) mapping** (every event): `Subject ← event_type`, `Description ← summary`,
`Web_MCP_Event_Id ← event_id` (Unique), `Web_MCP_Event_Type ← event_type`, `Web_MCP_Tool ← tool`,
`Web_MCP_Session_Id ← session_id`, `Web_MCP_Agent_Id ← agent_id ?? session_id`.
> Volume guard (later): when read-tool logging is wired, only mirror `profile_captured` /
> `demo_booked` / `checkout_started` / `order_paid` / `human_requested` to Zoho Tasks; keep
> low-intent (`qa`/`pricing`/`directory`/`app_link`/`newsletter`) in `mcp_events` only.

**`create-checkout-session` no-JWT agent path** — input
`{ your_name, work_email, brand_website, campaign_start_date, locations, customers_per_location,
idempotency_key, session_id, phone?, agent_id? }` (NO JWT; **`phone` is optional**). Output
`{ url, sessionId }`. Rate-limit 10/min/IP. Deal mapping on create:

| Zoho field | Source |
|---|---|
| `Deal_Name` | `"{company or email} — MCP pilot ({total customers} visits)"` |
| `Amount` | the **Stripe checkout total** (don't recompute) |
| `Stage` | `"Qualification"` (→ `"Closed Won"` on paid) |
| `Closing_Date` | `campaign_start_date` |
| `Lead_Source` | `"MCP Agent"` |
| contact link | by `work_email` |
| `Web_MCP_Idempotency_Key` | `idempotency_key` |
| `Web_MCP_Session_Id` | `session_id` |
| `Web_MCP_Agent_Id` | `agent_id ?? session_id` |
| `Web_MCP_Checkout_Session_Id` | Stripe `sessionId` |

(total customers = `customers_per_location × locations`.)

**`stripe-webhook`** — on `checkout.session.completed`: find the Deal by
`Web_MCP_Checkout_Session_Id`, set `Stage = "Closed Won"`, post Cliq `order_paid`.

**Cliq — fire from exactly ONE place per event (no double-pings):**

| Event | Fired by |
|---|---|
| `profile_captured`, `demo_booked`, `checkout_started`, `human_requested` | `crm-log` |
| `order_paid` | `stripe-webhook` |
| (Deal creation) | `create-checkout-session` posts **no** Cliq |

**`Web_MCP_*` custom fields (created in Zoho):**

| Field | Type | Module(s) |
|---|---|---|
| `Web_MCP_Event_Id` | Single Line (Unique) | Tasks |
| `Web_MCP_Event_Type` | Picklist | Tasks |
| `Web_MCP_Tool` | Single Line | Tasks |
| `Web_MCP_Session_Id` | Single Line | Tasks, Leads, Deals |
| `Web_MCP_Agent_Id` | Single Line | Tasks, Leads, Deals |
| `Web_MCP_Locations` | Number | Leads |
| `Web_MCP_Sector` | Picklist | Leads (only if not using standard `Industry`) |
| `Web_MCP_Idempotency_Key` | Single Line | Deals |
| `Web_MCP_Checkout_Session_Id` | Single Line | Deals |

**`Industry` / `Web_MCP_Sector` picklist values (16):** Specialty Retail, Apparel, Footwear,
Health and Beauty, Food and Beverage, Health and Wellness, Pet Care, Personal Care, Baby Care,
Department Stores, Discount Stores, Grocery and Food, Home Goods, QSR,
Hospitality, All B2C Brands. (Updated: was "Quick-Service Restaurants" / "Other B2C".)

**`Web_MCP_Event_Type` picklist values (10):** qa, pricing, directory, app_link, newsletter,
profile_captured, demo_booked, checkout_started, order_paid, human_requested.

**Edge cases (will bite if missed):**
1. `contact_name` is one optional field, not First/Last — split on first space; fallback
   `Last_Name = company_name` if absent.
2. `work_email` is optional → upsert the Lead by Company when absent (don't drop/dupe).
3. `phone` is optional on the agent checkout path — never require it.
4. `Web_MCP_Agent_Id` defaults to `session_id` today (no per-caller identity yet).
5. Deal `Amount` = the Stripe total, never recomputed.

---

Everything you need to wire eveoy.com's discovery surfaces to the MCP, plus the
final tool list and the few items still on your side. The Worker is built,
deployed, and smoke-tested against your real edge functions.

---

## 1. Status + URLs — LIVE

| | URL | State |
|---|---|---|
| **Production (canonical)** | `https://mcp.eveoy.com/mcp` | ✅ LIVE — custom domain attached, cert active |
| MCP Registry | `com.eveoy/mcp` v1.1.0 | ✅ published (DNS-verified) |

The Worker is one repo: `github.com/Eveoy/eveoy-mcp` (Cloudflare). It is a thin
adapter — it calls your Supabase edge fns with the anon key only. It holds NO
Stripe/Beehiiv/service-role keys.

The `workers.dev` URL is now **disabled** (custom domain only) — use `mcp.eveoy.com`.

**You're cleared to flip the discovery wiring live** (§4) — `mcp.eveoy.com` resolves
and the registry listing is published. All six deploy steps are done:
KV namespace ✅ · IP_HASH_SALT secret ✅ · deploy ✅ · DNS zone on Cloudflare ✅ ·
mcp.eveoy.com custom domain ✅ · MCP Registry TXT + publish ✅.

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
| `start_checkout` | **OAuth (sign-in handoff)** | `/create-checkout-session` | signed-in → Stripe URL; else returns a sign_in_url |

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

## 8. Test it now (production)

```bash
npx @modelcontextprotocol/inspector https://mcp.eveoy.com/mcp
```
Or add `https://mcp.eveoy.com/mcp` as a connector in Claude / Cursor / Lovable to try the 12 tools.

## 9. GitHub — repo map

Repo: **https://github.com/Eveoy/eveoy-mcp** (branch `main`). Base for file links:
`https://github.com/Eveoy/eveoy-mcp/blob/main/<path>`

| Path | What it is |
|---|---|
| `src/index.ts` | Worker entry: McpAgent + fetch gate (Host pin · Origin allowlist · CORS · HSTS), routes `/mcp`, `/sse`, `/health`, static fall-through |
| `src/integrations/edge.ts` | `callEdge()` Supabase client + `EdgeError` (402/429 surfaced) — the only thing that talks to your edge fns |
| `src/config.ts` | runtime config from Worker `env` (set in fetch AND in the Durable Object `init()`) |
| `src/mcp/register.ts` | registers all 12 tools + KB resources + 4 prompts |
| `src/mcp/schemas.ts` | Zod input/output schemas (mirror eveoy.com/order constraints) |
| `src/mcp/tools/*.ts` | one file per tool (`ask-eveoy`, `search-directory`, `claim-business`, `start-checkout`, …) |
| `src/classifier/denylist.ts`, `public-only.ts` | output guard: `assertPublic` (Q&A) / `assertNoSecrets` (directory/contact) |
| `src/knowledge/` | curated public KB (the `ask_eveoy` fallback) + `kb-content.ts` |
| `src/lib/pricing.ts` | $24.99 math · Starter/Proof/Rollout · UGC photos |
| `wrangler.jsonc` | Cloudflare config — bindings, vars, custom domain |
| `worker-env.d.ts` | `Env` binding types |
| `public/` | static surface: `index.html`, `privacy/`, `llms.txt`, `robots.txt`, `sitemap.xml`, `.well-known/mcp/server-card.json`, `_headers`, icons |
| `mcp/server.json` | Official MCP Registry manifest (`com.eveoy/mcp`) |
| `smithery.yaml`, `dxt/manifest.json` | Smithery + Claude-Desktop `.dxt` metadata |
| `.github/workflows/ci.yml` | typecheck + 55 tests + descriptor lint + `wrangler --dry-run` on every push |
| `.github/workflows/publish-mcp.yml` | registry publish (DNS-verified) when `mcp/server.json` changes |
| `docs/` | `API_CONTRACTS.md`, `CLOUDFLARE_DEPLOY.md`, `WORKING_WITH_LOVABLE.md`, `PLAN_v3.md`, this file |

GitHub Actions secret: `MCP_REGISTRY_DNS_PRIVATE_KEY` (Ed25519 private key matching the apex TXT).

## 10. Cloudflare — resources & dashboard pathways

Account: **Admin@eveoy.com** · id `7417c643ff74250fc2616be55d53ebd0`

| Resource | Value | Dashboard path |
|---|---|---|
| Worker | `eveoy-mcp` (latest version `5d55cf14…`) | Workers & Pages → **eveoy-mcp** |
| Custom domain | `mcp.eveoy.com` | eveoy-mcp → Settings → **Domains & Routes** |
| Logs / metrics | observability enabled | eveoy-mcp → **Observability / Logs** |
| KV namespace | `CACHE` = `da0dc20e2dad4f01b94a2cad266d6d1a` | Storage & Databases → **KV** |
| Durable Object | class `EveoyMCP`, binding `MCP_OBJECT` (SQLite) | eveoy-mcp → Settings → Bindings |
| Rate limit | `MCP_LIMIT` = 60 req / 60 s (per IP) | in `wrangler.jsonc` |
| Assets | binding `ASSETS` ← `public/` | served from edge |
| Vars | `MCP_CANONICAL_HOST`, `EVEOY_ORIGIN`, `MCP_CLASSIFIER_STRICT=0`, `SUPABASE_URL`, `SITE_URL` | eveoy-mcp → Settings → Variables |
| Secrets | `IP_HASH_SALT`, `SUPABASE_ANON_KEY` (publishable) | eveoy-mcp → Settings → Variables and Secrets |
| Zone | `eveoy.com` id `8d36b1df997c8cec90d73e0f720b9826` | dash → **eveoy.com** |
| Registry TXT | `eveoy.com` apex: `v=MCPv1; k=ed25519; p=0hazyCQE+4wgltLrzTG3i4CU7ORlNZPJ5xDn5475eqQ=` | eveoy.com → DNS → Records |
| Registry listing | `com.eveoy/mcp` v1.1.0 | registry.modelcontextprotocol.io |

The Worker holds **no** backend secrets beyond `SUPABASE_ANON_KEY` (publishable) + `IP_HASH_SALT`.
All Stripe/Beehiiv/service-role/Lovable keys stay in your edge functions.

## 11d. ask_eveoy is now capability-aware (LIVE)

`ask_eveoy` used to only know the product (your `/ask-eveoy` edge grounds on llms.txt).
Now it also knows the server's own tools:
- "what can you do / what tools do you have / can you book a demo" → answered
  deterministically from a canonical manifest (`src/mcp/capabilities.ts`), no edge call.
- For normal product questions we now pass a one-line **capabilities hint** in the
  `context` field to `/ask-eveoy` so Gemini can route action requests ("how do I buy",
  "book a demo") to the right tool. If your prompt uses `context`, please weave it in;
  if it ignores extra context, no harm — the deterministic path still covers it.
- **`mcp.eveoy.com/llms.txt` now lists all 12 tools** (was 5 — stale). If your edge grounds
  on our llms.txt, it'll now see the full surface. `/info.json` tool objects gained a `summary`.

## 11e. ask_eveoy KB enrichment, reconciliation (LOCKED), + get_case_studies (LIVE)

I reviewed the internal Eveoy knowledge base and added **only public, site-confirmed**
supporting context to the MCP's local KB (the fallback path). I held the line strictly:
the live site is source of truth, and the fail-closed classifier blocks all internal data.

**What I added (public-safe — mirror in your `/ask-eveoy` grounding if useful):**
- Category statement + plain "what it is" (two-sided marketplace + SaaS + automated verification).
- **Guaranteed-purchase add-on** (shopper buys a specified SKU, brand covers product cost, sale
  flows through the brand's register) — this was missing from the MCP KB; it's on your site.
- Glossary: verified visit, shopper, Action IRL, receipt, brief/campaign/order.
- New `validation` KB section: exec quotes (Google / Wendy's, verbatim), sample campaigns
  (Retail Reveal, Cafe Crowd, Shelf Sweep, Taco Turnout), who-it's-for / not-for, Insights link.
- Company facts: Founder & CEO Brad Cowdrey; US offices; **sales email hello@eveoy.com**;
  iOS/Android app links; LinkedIn.

**Conflicts — RECONCILED (locked by Lovable, applied across the MCP):**
1. **Photos per visit → 2 base, +bonus.** `get_pricing` stays at **2 photos/shopper base**; added a
   note: "+1 photo per +$20, max +3 extra, at eveoy.com/order." The marketing "3/visit" is a typical
   configured bundle, not the base SKU. Matches the create-checkout contract.
2. **Legal entity → "Eveoy, Inc."** Applied everywhere public (KB, server.json vendor, server-card,
   dxt manifest, README). (Heads-up: you mentioned a stale "EyCrowd, Inc." footer on PilotMarketing.tsx.)
3. **Receipts → 20,247 exactly** (KB, prompts). Dropped the "20,000+" rounding for the receipts count;
   "20,000+ verified shoppers" stays (that's the community size, a different metric).
4. **Time in store → 10+ minutes** everywhere. Purged the last stale "15+ min" refs (two prompts,
   README, dxt long_description, a test fixture).

**get_case_studies — SHIPPED (per §6.2, built against the real sitemap).**
Live: returns 28 items (27 case studies + the lookbook). `{ archive_url, items:[{kind,slug,title,url}], note }`.
- Discovery follows the sitemap **index** → same-host child (`sitemap-pages.xml`); skips the 629k
  directory sitemap on Supabase; 10-min edge cache.
- **One spec deviation, by necessity:** the lookbook's canonical sitemap URL is
  `https://eveoy.com/lookbook/issue-01-real-people` (NOT `/newsletter/lookbook-issue-1`). The tool
  returns the real sitemap URL so links always resolve. If you'd rather it return `/newsletter/...`,
  add that to the sitemap (or tell me) and I'll switch — right now I trust the sitemap as truth.
- `kind:"playbook"` returns `items: []` with a note pointing at the archive (none published yet).

**What I deliberately EXCLUDED (internal — keep these out of public grounding too):**
financials/burn/raise/margins, CAC figures, man-hours/$ invested, Project Y / Project Coach,
AWS Marketplace/ULA specifics, Saudi entity & partners, patent counts, and the internal sales
playbook. The MCP's classifier hard-blocks all of these; a test asserts no KB file trips it.

## 11c. Agent-discovery hand-off — items 1–4 + 7 SHIPPED (LIVE)

Per your isitagentready worklist:
- **1. HTTP `Link:` headers** on `/`, `/index.html`, `/health` (RFC 8288) advertising
  server-card, oauth-protected-resource, oauth-authorization-server (→ eveoy.com),
  auth.md, the `/mcp` service, and api-catalog. Static `/.well-known/mcp/server-card.json`
  also carries a `Link` via `_headers`.
- **2. server-card.json is now SEP-1649** (`serverInfo` / `transport` / `capabilities` /
  `auth`) — NO longer the registry-manifest shape. ⚠️ **Please re-mirror it on eveoy.com.**
  Note: the *registry* manifest (`com.eveoy/mcp`) still lives at `mcp/server.json` in the
  repo and is a different artifact — don't mirror that one.
- **3. `/.well-known/oauth-protected-resource`** live on mcp.eveoy.com, deferring to
  `https://eveoy.com/.well-known/oauth-authorization-server` (single AS source of truth).
- **4. `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource"`**
  is attached to any 401 the Worker emits (RFC 9728). Note: `/mcp` is intentionally
  anonymous for reads, so it doesn't blanket-401; `start_checkout` returns a `sign_in_url`
  in the tool result rather than a transport 401. Discovery still works via the
  protected-resource metadata + Link header.
- **7. CORS** `Access-Control-Expose-Headers` now includes `Link` (and `WWW-Authenticate`).

**Deferred (your call — product decisions, not config):**
- **5. x402** on `/mcp` (agent-native payments) — needs a wallet address + payment policy.
- **6. MPP `/openapi.json`** with `x-payment-info` — pairs with x402. Ping when you want these scoped.

**User-only (neither of us):** DNS-AID SVCB records (`_index._agents.eveoy.com` → mcp.eveoy.com/mcp)
+ DNSSEC, and the Cloudflare Transform Rule for the eveoy.com homepage `Link:` header.

## 11a. Landing page is yours (proxied) + /info.json for live data (LIVE)

- `GET /` and `/index.html` on `mcp.eveoy.com` now **proxy verbatim** to your
  `https://…/functions/v1/mcp-landing` edge fn (Cache-Control honored; `cf` edge
  cache 300s). The Worker forces `Content-Type: text/html` (your fn currently
  returns `text/plain` — harmless, but you may want to fix the header). `public/index.html`
  is deleted — the landing is 100% yours now; iterate in Lovable, no Worker change.
- Everything else stays on the Worker: `/privacy`, `/llms.txt`, `/sitemap.xml`,
  `/robots.txt`, `/.well-known/*`, `/favicon.png`, `/icon-512.png`, `/wordmark.png`,
  `/og-image.svg`, `/eveoy.dxt`.
- **`GET https://mcp.eveoy.com/info.json`** (CORS `*`, cached 5 min) — live snapshot
  so your landing stays in sync without the MCP handshake:
  `{ version, endpoint, transports, tools:[{name,title,auth}], prompts, pricing:{unit_usd,tiers}, industries }`.
  Fetch it server-side in `mcp-landing` to render the tool list / pricing.

## 11b. Authenticated checkout — the sign-in handoff (Phase 2b, LIVE)

`create-checkout-session` now requires a user JWT. The MCP gates ONLY `start_checkout`
(reads stay anonymous). Flow, using your `/mcp-link` handoff:

1. `start_checkout` (no JWT) returns a `sign_in_url`:
   `https://eveoy.com/auth?next=%2Fmcp-link%3Fcallback%3D<enc(https://mcp.eveoy.com/link/callback)>%26state%3D<signed>`
2. User signs in at eveoy.com → you 302 to `https://mcp.eveoy.com/link/callback#access_token=…&state=…`
3. Our bridge page reads the fragment, POSTs the token to `/link/finish`, which verifies the
   HMAC-signed `state` (binds to one MCP session) and RPCs the JWT into that session's DO.
4. Next `start_checkout` call sends `Authorization: Bearer <jwt>` + `apikey: <anon>` to
   `create-checkout-session`.

**Callback path we use: `https://mcp.eveoy.com/link/callback`** — covered by your existing
`https://mcp.eveoy.com` callback allowlist (origin match). No new origins needed. The `state`
round-trips unchanged (we sign+verify it). Tokens never touch our logs or any URL we store.

## 11. How to change behavior (no Worker redeploy needed)

- **Change what a tool returns / add a field / fix an answer** → edit the edge function in
  Lovable. The Worker passes through; no Cloudflare deploy. (One source of truth.)
- **Add/remove a tool, change adapter logic, change CORS/limits** → ping Claude Code → edit
  the Worker (`src/...`) → `wrangler deploy`. Needs a Cloudflare token (Workers Scripts:Edit;
  + Zone Workers Routes/DNS only if touching the custom domain).
- **Change the registry manifest** → edit `mcp/server.json`, push → the publish workflow
  re-publishes automatically (DNS-verified).
