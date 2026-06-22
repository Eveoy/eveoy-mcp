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

## Phase 2 — WIRED (Lovable shipped the edge-fn contracts 2026-06-22)

The Worker is now a thin adapter over Supabase edge functions ([`docs/API_CONTRACTS.md`](API_CONTRACTS.md)).
All wired tools verified live through the MCP protocol on `wrangler dev`.

| Tool | Wraps (Supabase edge fn) | Status |
|---|---|---|
| `ask_eveoy` | `/ask-eveoy` (Gemini + live llms.txt) | ✅ wired, local KB fallback |
| `search_directory` | `/directory-query` | ✅ wired |
| `get_business` | `/directory-business` | ✅ wired |
| `check_order_status` | `/get-order-summary` | ✅ wired |
| `subscribe_newsletter` | `/subscribe-beehiiv` | ✅ wired |
| `claim_business` | `/unlock-business` (lead capture) | ✅ wired |
| `start_checkout` | `/create-checkout-session` | ✅ wired |
| `book_demo` | static `/book-demo` URL | ✅ |
| `get_case_studies` | source TBD | ❓ pending Lovable |

**Auth decision (current):** write tools (`subscribe_newsletter`, `claim_business`,
`start_checkout`) are **anonymous** — Lovable designed the edge fns to accept anon-key
calls and the actions are low-risk (newsletter opt-in, lead capture, and a Stripe
Checkout *link* the human still has to pay on Stripe's hosted page). They carry
`readOnlyHint:false` confirm-hint annotations and are covered by the 60/min per-IP
limit. OAuth gating remains available later (MCP's own AS via
`@cloudflare/workers-oauth-provider`) if abuse appears; the site's OAuth `.well-known`
files are placeholder stubs.

**Security stance (held):** the Worker holds **only** `SUPABASE_URL` +
`SUPABASE_ANON_KEY` + `SITE_URL`. Stripe/Beehiiv/service-role keys never leave their
edge functions. The output classifier runs on every response — full `assertPublic` on
`ask_eveoy`/KB, scoped `assertNoSecrets` on directory/order/contact tools (which return
business contacts by design but still must never leak secrets/internal data).

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
