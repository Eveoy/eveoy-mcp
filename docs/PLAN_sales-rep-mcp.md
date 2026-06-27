# Plan — Eveoy MCP → Autonomous Inbound Sales Rep

Status: **DRAFT for sign-off** · Owner: Claude Code (MCP) + Lovable (Supabase/Zoho/Stripe)
Repo: `/Users/bcowdrey/Desktop/github/MCP` (Cloudflare Worker, `eveoy-mcp`, mcp.eveoy.com)

**TL;DR** — Add a thin Zoho-logging adapter + sales tools (`capture_profile`, agent-native
`start_checkout`, `recommend_pilot`) to the existing MCP so any agent can learn → profile → buy in one
session, with every interaction in Zoho and high-intent pings in Cliq. The work is additive (new tools
+ one integration module), gated by the existing tsc/tests/lint/classifier pipeline. Lovable builds two
edge fns (`crm-log`, `create-checkout-session` agent path); the MCP builds everything else and is
buildable now against those frozen contracts. Build order: 1 → 2 → 3 → 4 → (5 spike).

## Goal
Any AI agent can **learn → get Q&A/resources → profile its company → buy** $24.99 verified
in-store visits (each = 2 on-brand in-store UGC photos) **100% through the MCP**, with **every
interaction logged to Zoho CRM** and **high-intent events alerted to Zoho Cliq**. Eveoy is
pay-per-visit, not a contract.

## Locked decisions
- Zoho via a **new Supabase edge fn `crm-log`** (not n8n, not direct-from-Worker). Creds ready. Modules: **Leads + Deals + Activities**.
- Payment: agent gets the **Stripe checkout link directly**; Lovable adds an **agent-native (no-JWT) path** to `create-checkout-session`.
- Profile: lightweight → **Zoho Lead**; no MCP persistence beyond Durable Object session.
- Cliq: **high-intent only** (`profile_captured`, `demo_booked`, `checkout_started`, `order_paid`, `human_requested`). CRM logs everything.
- Canonical host **www.eveoy.com** is the source of truth ([[eveoy-website-source-of-truth]]).

---

## Phase 0 — Documentation Discovery (DONE — consolidated)

### Allowed APIs (verified, copy-from)
- **Tool registration** — `server.registerTool(name, {title, description, inputSchema, outputSchema?, annotations}, handler)`; MCP SDK **1.29.0**, current, not deprecated (new optional `icons` field exists; handler is `async (args, ctx) => CallToolResult`). Copy READ+outputSchema from `src/mcp/tools/list-metros.ts:36-70`; READ-edge from `src/mcp/tools/search-directory.ts:22-48`; WRITE-edge from `src/mcp/tools/subscribe-newsletter.ts:17-41` and `src/mcp/tools/claim-business.ts:29-57`. Handler returns `{ content: [{type:'text',text}], structuredContent?, isError? }`.
- **Edge client** — `callEdge<T>(path, body, authToken?)` POSTs to `${supabaseUrl}/functions/v1${path}` with `apikey` + `Authorization: Bearer <authToken ?? anon>`; throws `EdgeError(status, path, detail)`; `edgeErrorMessage(err)` maps to user strings. `src/integrations/edge.ts:12-83`.
- **Classifier** — `assertPublic(value,{tool})` (strict) / `assertNoSecrets(value,{tool})` (allows business contacts) / `classify(value, exclude?)` → `{ok, hits}`. `src/classifier/public-only.ts:18-54`. Soft-fail replaces payload with a generic message unless `MCP_CLASSIFIER_STRICT=1`.
- **DO state** — `EveoyMCP extends McpAgent<Env, EveoyState>`; `initialState`, `this.setState(...)`, `this.state`, `getSessionId()`; **`this.ctx` IS the `DurableObjectState`**. Add fields to `EveoyState` (`src/index.ts:21-51`). RPC pattern: `setUserJwt` (`src/index.ts`).
- **Schemas** — Zod `.strict()`, `z.enum`, `INDUSTRIES_PUBLIC` from `src/industries.ts:6-23`. Pattern at `src/mcp/schemas.ts:19-37`.
- **Wiring** — TOOLS array `src/mcp/register.ts:24-42`; `CAPABILITIES` manifest entry shape `src/mcp/capabilities.ts:11-128`; `PROMPTS` `:130-135`.
- **Tests/lint a new tool MUST satisfy** — add to `EXPECTED_TOOLS` in BOTH `tests/capabilities.test.ts:10-24` and `tests/mcp-handshake.test.ts`; description MUST contain `Use this when`, `Trigger phrases`, `Returns:`, `Do NOT use this for`, `Cost:`; anti-slop banlist (no "unlock/empower/seamless/leverage/AI-powered/game-changer/excited", no emojis, no `#mcp`); descriptor-lint (`scripts/lint-tool-descriptions.ts`) bans URLs, control/zero-width chars, base64, injection phrases.
- **Checkout/auth** — `AuthAgent` interface + JWT gate `src/mcp/tools/start-checkout.ts:12-84`; `buildSignInUrl` `src/auth/link.ts:47-52`; registered in `EveoyMCP.init()` `src/index.ts:40-46`.
- **Rate limit** — per-IP `softRateLimit` `src/index.ts:177-186`, `MCP_LIMIT.limit({key})`, `worker-env.d.ts:26-29`.

### 🔴 Anti-patterns to AVOID (verified against current docs)
- **DO NOT `this.ctx.waitUntil(promise)` for fire-and-forget** — it's a documented **no-op** inside a Durable Object (does not extend lifetime). Source: developers.cloudflare.com/durable-objects/api/state.
- **DO NOT bare un-awaited `fetch()` from the DO** — "fetch never keeps the DO alive, even while streaming"; eviction (≈70-140s idle, hibernation ≈10s) can cancel it.
- **DO NOT await a slow Zoho write inline** — would add Zoho latency to every tool call. → `crm-log` must **fast-ack** and do Zoho/Cliq in the background on the Supabase side (Deno `EdgeRuntime.waitUntil`).
- **DO NOT use `agents` v0.17.0 APIs** (`keepAliveWhile`/`runFiber`/`runAgentTool({detached})`) — they shipped 2026-06-26; **the repo is pinned to `agents@^0.16.2`, which predates them.** Use the version-agnostic awaited-fast-ack approach below. (`AbortSignal.timeout` IS available — `compatibility_date` 2026-06-22; MCP SDK is `@modelcontextprotocol/sdk@^1.29.0`.)
- **DO NOT put internal data in any `crm-log` payload** — run `assertPublic`/`assertNoSecrets` on the payload first (denylist applies).
- **DO NOT add a tool without** updating both test `EXPECTED_TOOLS`, the `CAPABILITIES` manifest, `llms.txt`, and matching the descriptor template — the anti-drift tests will fail otherwise.

---

## Cross-cutting design (applies to every phase)

**Agent identity & attribution.** Reads stay anonymous, but every event captures a best-effort
caller identity for per-caller audit — the lightweight stand-in for OAuth-per-caller (OAuth/x402 is
the Phase 5 path). Source order: an explicit `agent_id`/`company` the agent supplies (e.g. via
`capture_profile`), else the MCP session id (`getSessionId()`). Thread `{ session_id, agent_id? }`
into every `crm-log` event.

**Audit completeness (EU AI Act Art. 12).** Each event records `event_id`, `session_id`, `agent_id?`,
`tool`, a params *summary* (secrets/internal stripped via `assertNoSecrets`; first-party business contact retained), `result_class`
(`ok`|`redacted`|`error`), and timestamp. Zoho is the system of record / retention. Sufficient for
post-hoc reconstruction.

**Delivery guarantees & idempotency.** Two tiers:

| Tier | Events | Mechanism | Guarantee |
|---|---|---|---|
| Best-effort | low-intent (qa, pricing, list_*) | MCP awaits `crm-log` fast-ack (`AbortSignal.timeout(1500)`), errors swallowed | may drop on Supabase cold-start — acceptable for activity |
| At-least-once | high-intent (profile_captured, demo_booked, checkout_started, order_paid, human_requested) | MCP retries once on timeout/5xx; `crm-log` dedups on `event_id` | survives a transient blip; **zero-loss upgrade: Cloudflare Queues producer→consumer** |

Every event carries a client-generated **`event_id` (uuid); `crm-log` is idempotent on it**, so retries
and double-fires never double-write a Lead/Deal or double-send a Cliq. Order creation carries its own
idempotency key (Phase 3). Per-tool rollback uses the existing `MCP_DISABLE_TOOL` kill-switch
(`config().disabledTools`, `src/config.ts:13`) — a new/buggy tool can be disabled without a redeploy.

## Phase 1 — Plumbing: `crm.ts` + DO session state

**What to build (copy, don't transform):**
1. `src/integrations/crm.ts` — `logEvent(event: CrmEvent): Promise<void>`:
   - Sanitize the payload with **`assertNoSecrets(event)`** — NOT `assertPublic`. `assertNoSecrets` blocks secrets/internal data but intentionally ALLOWS the first-party contact email/phone the agent supplied; `assertPublic`'s `pii.foreign_email` rule would otherwise drop **every** `capture_profile`/`checkout_started` event (work emails are non-`eveoy.com`). Tool OUTPUTS returned to the agent still use `assertPublic`. Skip the POST only on a secrets/internal hit (`classify(event, PII_RULE_IDS).ok === false`); never throw.
   - `await fetch(${supabaseUrl}/functions/v1/crm-log, { method:'POST', headers:{apikey, Authorization:Bearer anon, 'Content-Type':'application/json'}, body, signal: AbortSignal.timeout(1500) }).catch(() => {})` — **awaited fast-ack, errors swallowed, never blocks/fails a tool**. Mirror header/URL construction from `callEdge` (`src/integrations/edge.ts:23-45`) but standalone (don't throw).
   - `CrmEvent = { event_type, session_id, tool, summary, profile?, metadata? }`.
2. `EveoyState` (`src/index.ts:21`) gains `profile?: CompanyProfile`. Add a `setProfile()` RPC mirroring `setUserJwt` (`src/index.ts`). `session_id = getSessionId()`.

**Lovable dependency:** `crm-log` must return **202 immediately** and run Zoho/Cliq via `EdgeRuntime.waitUntil` (so the awaited MCP call is ~50-150ms).

**Verification:** `npx tsc --noEmit`; unit test `crm.test.ts` — `logEvent` (a) no-ops when `SUPABASE_URL` empty, (b) swallows fetch rejection, (c) skips POST when payload trips `classify`. `npx vitest run`.

**Anti-pattern guards:** no `this.ctx.waitUntil`; no un-awaited fetch; classifier before POST.

---

## Phase 2 — Sales tools

1. **`capture_profile`** (write) — input `{ company_name, brand_website(url), sector(enum INDUSTRIES_PUBLIC — 16-item public list in `src/industries.ts`), locations?(int), contact_name, work_email(email), goals?(max 500) }` `.strict()` (schema in `src/mcp/schemas.ts`, copy pattern `:19-37`). Handler: `this.setProfile(...)`, `logEvent({event_type:'profile_captured', profile, ...})`, return a concise confirmation. Tool body copy from `subscribe-newsletter.ts:17-41`. Needs the agent instance (like `start_checkout`) → register in `init()`. **Data-handling:** the description must state the agent is providing its own/represented company's business contact info for follow-up (lawful-basis clarity); the tool stores only first-party business-contact fields (no consumer PII) → Zoho Lead. Confirm Zoho Lead field-mapping with Lovable.
2. **`start_checkout` rework** (`src/mcp/tools/start-checkout.ts`) — drop the mandatory JWT gate; call `callEdge('/create-checkout-session', { customers_per_location, locations, advancedTargeting, your_name, work_email, brand_website, phone, campaign_start_date, idempotency_key })` (no auth token), return `{ url }` directly; `logEvent('checkout_started')`. Pull contact fields from the captured profile in `this.state.profile` when present, else require them as inputs. Keep the OAuth `buildSignInUrl` path as a fallback only if Lovable signals auth required (EdgeError 401). **Abuse control (the no-JWT path is open):** it only creates a Stripe Checkout *session* (no charge) + a Zoho Deal in a `created` stage — gate it behind the Phase-3 per-session rate limit + the idempotency key so a retry loop can't spam sessions/Deals; Lovable should soft-validate `work_email`/`brand_website` server-side; the Deal advances to Won **only** via the Stripe `checkout.session.completed` webhook.
3. **`recommend_pilot`** prompt (copy `src/mcp/prompts/eveoy-price-quote.ts`) — qualify (sector, #stores, goal) → instruct calling `get_pricing` → present "$24.99/visit incl. 2 in-store UGC photos" → offer `start_checkout`.
4. **`book_demo`** — add `logEvent('demo_booked')`.

**Verification:** add both new tools to `EXPECTED_TOOLS` (both test files) + `CAPABILITIES` + `llms.txt`; descriptors pass template + anti-slop + lint; live: call `capture_profile` → confirm Zoho Lead + Cliq; `start_checkout` → returns a Stripe URL + Zoho Deal + Cliq.

**Lovable dependency:** `create-checkout-session` agent path (no JWT, 5 contact fields, idempotency key, → `{url, sessionId}` + Zoho Deal).

---

## Phase 3 — Coverage + safety
- Call `logEvent` from every tool (Activities for all; Cliq only on the 5 high-intent types). Centralize via a small wrapper so each tool adds one line.
- **Idempotency key** on order creation (e.g. `sha256(session+pricing+floor(now/60000))`) passed to `create-checkout-session`.
- **Per-session rate limiting** — key `softRateLimit` by `getSessionId()`/Mcp-Session-Id where present, fall back to IP (`src/index.ts:177-186`).
- Optional **`request_human`** tool → `logEvent('human_requested')` (Cliq + Lead flag).

**Verification:** tests for idempotency-key shape + per-session key derivation; live confirm Cliq fires only on high-intent.

---

## Phase 4 — Discovery + education
- Reframe `description`/`title` in `mcp/server.json`, `public/.well-known/mcp/server-card.json`, `public/llms.txt`, and the registry as an **inbound sales rep** ("learn, get a quote, profile your brand, buy $24.99 verified visits — 100% via MCP"). Republish registry (`mcp-publisher`, DNS-verified).
- New KB resource **`eveoy://kb/for-agents`** (end-to-end: how to learn → profile → quote → buy here). Add md to `src/knowledge/public/`, run `scripts/gen-kb-content.sh`, add KEYWORDS + the `kb.ts` TITLES entry + the kb-loader test.
- **Claim/list** on mcp.so, Smithery, Glama (Official tier), PulseMCP, awesome-mcp-servers.

**Verification:** server-card/llms.txt show the new framing; `eveoy://kb/for-agents` reads 200; classifier-clean; directories show "claimed/official".

---

## Phase 5 — Forward path (evaluate, not commit)
- x402 / Stripe ACP for true machine-to-machine pay (MCP is the data plane). Spike only after Phases 1-4 ship + the agent-native Stripe-link flow is validated in production.
- **Go/no-go criteria to even start the spike:** (a) ≥1 partner agent explicitly asks for no-human-in-loop pay; (b) Stripe ACP (or x402) is GA-stable with a Workers-compatible SDK; (c) a wallet/funding + refund-on-no-show policy is signed off by finance; (d) the Stripe-link flow's conversion data shows the human-pay step is the actual drop-off. If any is unmet, defer — the checkout link already delivers "buy via MCP."

---

## Lovable contract (must be frozen before Phase 1/2 ship)
1. **`crm-log`** — `POST {event_type, session_id, tool, summary, profile?, metadata?}` → **202 immediately**, then (background) write Zoho **Activity**, upsert **Lead** when `profile` present, fire **Cliq** on high-intent types. Holds Zoho OAuth refresh token as a Supabase secret. Anon `apikey`.
2. **`create-checkout-session` agent path** — accept 5 contact fields + `locations` + `customers_per_location` **without a user JWT**, support an **idempotency key**, create/attach a Zoho **Deal**, return `{url, sessionId}`.
3. **Stripe webhook** → `checkout.session.completed`: Zoho Deal → Won + Cliq "order paid".
Provide: Zoho Lead/Deal/Activity field maps + the Cliq channel/webhook.

## Global verification gates (every phase, before deploy)
`npx tsc --noEmit` · `npx vitest run` · `npm run lint:descriptors` · classifier-clean (no internal data in payloads/outputs) · pre-deploy `engineering:code-review` · `wrangler deploy` + live handshake (`tools/list`, call new tools, confirm Zoho Activity/Lead/Deal + Cliq fired). Node: `/Users/bcowdrey/.nvm/versions/node/v22.22.1/bin`; CF creds `~/.eveoy-cf-deploy.env`.

## Sequencing & Lovable-dependency matrix
Freeze the `crm-log` + `create-checkout-session` agent-path contracts FIRST; then the MCP work proceeds
in parallel with Lovable's build. "Buildable now" = code can be written + unit-tested against the frozen
contract; "Verifiable when" = when an end-to-end live check can pass.

| MCP work | Buildable now? | Verifiable when |
|---|---|---|
| Phase 1 (`crm.ts` + DO state) | ✅ yes — `logEvent` no-ops until live | unit tests now; live once `crm-log` is deployed |
| `capture_profile` | ✅ code now | live Lead + Cliq once `crm-log` is deployed |
| `start_checkout` rework | ⚠️ code now | **only after** Lovable's agent-path `create-checkout-session` is live |
| Phase 3 (logging/idempotency/rate-limit) | ✅ yes | live after `crm-log` |
| Phase 4 (discovery/education) | ✅ yes — no Lovable dependency | live on deploy |

Build order: **1 → 2 → 3 → 4 → (5 spike)**. Phase 4 has no Lovable dependency and can ship anytime.
