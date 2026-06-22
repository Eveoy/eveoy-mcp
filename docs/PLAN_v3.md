# Plan v3 — Eveoy MCP (Cloudflare native, reconciled with Lovable brief)

> Supersedes the Vercel-era plan. Reflects: (a) the full Cloudflare cutover, and
> (b) reconciliation of Lovable's "Eveoy MCP Server — Build Brief" against the
> live site (eveoy.com, llms.txt, ai-plugin.json, agent-skills, /pricing,
> /directory, /how-it-works), read 2026-06-22.

## What changed since v2

**Product identity — reconciled.** Lovable's brief called Eveoy a "local business
directory + creator/UGC platform." The live site disagrees: the **primary product
is unchanged** — the experience-marketing platform for **verified in-store customer
visits at $24.99**, tiers **Starter $999 / Proof $2,499 / Rollout $9,996**. UGC is a
*feature* of that product (~2 photos per customer), not a separate creator platform.

**But the brief surfaced two real, new things:**
1. **The Eveoy Directory** — a separate free surface: ~11.1M businesses from
   government/city registries + storefront listings (Los Angeles live: 629,431),
   served via `sitemap.eveoy.com` + a `directory-sitemap` edge function. New MCP
   capability: `list_metros` (shipped), `search_directory` / `get_business` (Phase 2).
2. **A live agent-discovery infrastructure on the site** the MCP must slot into:
   `robots.txt` (AI bots allowed), `llms.txt`, `.well-known/ai-plugin.json`,
   `.well-known/agent-skills/index.json`, `.well-known/api-catalog`,
   `.well-known/http-message-signatures-directory` (Web Bot Auth), and in-browser
   `webmcp.ts` tools (`search_directory`, `open_pricing`, `book_demo`, `get_app`).

**Ground-truth corrections applied to the build:**
- **"15+ minutes" → "10+ minutes"** (5 live surfaces say 10; the internal skill said 15).
- Pricing example labels → official **Starter / Proof / Rollout** + **UGC photo counts** (80/200/800).
- `get_pricing` output: added `ugc_photos`; renamed `matches_marketing_pilot` → `is_starter_tier`.
- "**Makes a purchase**" added to the core claim (now standard on the site).
- serverInfo name → `eveoy-mcp`; instructions rewritten to the reconciled framing.
- CORS adds `eveoy.com` / `www.eveoy.com`; anon rate limit → 60/min (brief).

## Current state (Phase 1 — shipped, working on workerd)

Native Cloudflare Worker (`McpAgent` + Durable Object). 55 tests pass, tsc clean,
`wrangler dev` + `wrangler deploy --dry-run` verified.

**Tools (all read-only, anonymous):**
| Tool | Status |
|---|---|
| `ask_eveoy` | ✅ KB Q&A (8 sections incl. directory), audience-tuned, classifier-gated |
| `get_pricing` | ✅ mirrors eveoy.com/order; Starter/Proof/Rollout; UGC photos |
| `list_industries` | ✅ 23+ sectors |
| `list_metros` | ✅ directory coverage (LA live + 8 coming) |
| `get_app_link` | ✅ canonical /get-app |

**Resources:** `eveoy://kb/*` (8). **Prompts:** 4. **Static:** landing, /privacy, /robots.txt, /sitemap.xml, /.well-known/mcp/server-card.json, icons, /eveoy.dxt.

## Phase 2 — blocked on Lovable edge-fn contracts (see QUESTIONS_FOR_LOVABLE.md)

Mirror the brief's tool list. Schemas locked where known (`CreatePilotOrderInput`),
not wired until the Supabase edge-fn request/response contracts are provided.

| Tool | Auth | Wraps (Supabase edge fn) |
|---|---|---|
| `search_directory` | none | `directory-sitemap` (needs a queryable endpoint, not just the sitemap) |
| `get_business` | none | `directory-sitemap` (by slug/id) |
| `get_case_studies` | none | source TBD (insights/newsletter) |
| `subscribe_newsletter` | none | `subscribe-beehiiv` |
| `book_demo` | OAuth | booking flow |
| `claim_business` | OAuth | `unlock-business` |
| `start_checkout` | OAuth | `create-checkout-session` (already contracted in ORDER_FLOW_SPEC.md) |
| `check_order_status` | OAuth | `get-order-summary` |

**Security stance (firm):** the Worker should hold **only** `SUPABASE_URL` +
`SUPABASE_ANON_KEY`. Stripe stays in the edge fn (no `STRIPE_SECRET_KEY` in the
Worker). Beehiiv stays in `subscribe-beehiiv` (no `BEEHIIV_API_KEY` in the Worker).
No `SUPABASE_SERVICE_ROLE_KEY` in the Worker — every edge fn self-gates (Lovable will
fix any that can't rather than leak the role). Auth: the MCP stands up its **own**
OAuth 2.1 server at `mcp.eveoy.com/.well-known/oauth-authorization-server` via
`@cloudflare/workers-oauth-provider` (the site's existing OAuth `.well-known` files are
placeholder stubs, not a live IdP; they'll be repointed at the Worker's issuer). The
fail-closed public-only classifier stays in front of every response at every phase.

## Discovery alignment (what slots into the site)

- The MCP serves its own `/llms.txt`, `/.well-known/mcp/server-card.json`, robots, sitemap.
- Lovable adds an `mcp` block to the site's `ai-plugin.json` + a row to
  `agent-skills/index.json` + an `api-catalog` link → all pointing at
  `https://mcp.eveoy.com/mcp`. The exact snippets are in QUESTIONS_FOR_LOVABLE.md.
- Web Bot Auth (outbound signing) is **deferred** — only needed if the MCP makes
  outbound signed calls to third parties; Phase 1 doesn't.

## Deploy

Unchanged from `docs/CLOUDFLARE_DEPLOY.md`: Workers Paid, KV namespace, `IP_HASH_SALT`
secret, custom domain `mcp.eveoy.com`, DNS zone move, registry TXT publish.

## Open decisions

All parked in `docs/QUESTIONS_FOR_LOVABLE.md` — the single most important is **which
repo is the canonical Worker** (this repo, `Eveoy/eveoy-mcp`, already built and tested,
vs the `mcp-server/` skeleton Lovable scaffolded in their project). Recommendation:
this repo is canonical; Lovable owns eveoy.com + the Supabase edge functions.
