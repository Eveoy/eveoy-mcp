# Edge-function contracts (Worker ⇄ Supabase)

> Source of truth: Lovable's `API_CONTRACTS.md` + `CLAUDE_CODE_INSTRUCTIONS.md` (2026-06-22).
> The Worker is a thin adapter: speak MCP ↔ call these edge functions with the anon key.

## Connection

- Base: `${SUPABASE_URL}/functions/v1` (var: `https://ascyiwwrflizprjypxxr.supabase.co`)
- Auth (every POST): `apikey: ${SUPABASE_ANON_KEY}` + `Authorization: Bearer ${SUPABASE_ANON_KEY}` + `Content-Type: application/json`
- The anon key is publishable; it is the **only** backend credential the Worker holds.
- Client: [`src/integrations/edge.ts`](../src/integrations/edge.ts) (`callEdge` + `EdgeError` with status; 402/429 surfaced distinctly).

## Tool → endpoint map

| MCP tool | Edge fn | Status |
|---|---|---|
| `ask_eveoy` | `POST /ask-eveoy` | ✅ wired (Gemini + live llms.txt; local KB fallback on 402/429/5xx) |
| `search_directory` | `POST /directory-query` | ✅ wired (paginated via `nextCursor`→`after`) |
| `get_business` | `POST /directory-business` | ✅ wired (`{slug}` or `{id}`; 404 → not found) |
| `check_order_status` | `POST /get-order-summary` | ✅ wired (email masked) |
| `subscribe_newsletter` | `POST /subscribe-beehiiv` | ✅ wired (email only) |
| `claim_business` | `POST /unlock-business` | ✅ wired (lead capture + contact reveal) |
| `start_checkout` | `POST /create-checkout-session` | ✅ wired (returns Stripe URL + sessionId) |
| `get_pricing` | static | ✅ Starter/Proof/Rollout, $24.99/customer |
| `list_metros` | static | ✅ LA live |
| `list_industries` | static | ✅ 23+ sectors |
| `get_app_link` | static URL | ✅ `https://eveoy.com/get-app` |
| `book_demo` | static URL | ✅ `https://eveoy.com/book-demo` |
| `get_case_studies` | TBD | ❓ source not chosen (insights vs newsletter) |

`GET /directory-sitemap` and `GET /get-app` are NOT called from the Worker
(sitemap-only; get-app is a browser 302). Use `/directory-query`/`/directory-business`
and return the get-app URL string respectively.

## Key request/response shapes

- `/ask-eveoy` → `{ question, context? }` ⇒ `{ answer, model, kb_chars }`. Errors: 402 credits_exhausted, 429 rate_limited.
- `/directory-query` → `{ q?, metro?, naics?, limit(1..50), after? }` ⇒ `{ items[], nextCursor }`.
- `/directory-business` → `{ slug }|{ id }` ⇒ `{ business }` or 404 `{ error:"not_found" }`.
- `/create-checkout-session` → `{ locations, customers_per_location, advancedTargeting? }` ⇒ `{ url, sessionId }`.
- `/get-order-summary` → `{ session_id }` ⇒ `{ customer_email(masked), locations, customers_per_location, total_cents, status }`.
- `/subscribe-beehiiv` → `{ email, source, utm_* }` ⇒ `{ ok:true }`.
- `/unlock-business` → `{ email, full_slug, source_url }` ⇒ `{ store_location_id, contacts{...}, enriched_at }`.

## Classifier scoping

- `ask_eveoy` + KB resources run the FULL `assertPublic` (blocks internal data AND foreign PII emails).
- Directory + order + contact tools run `assertNoSecrets` (still blocks secrets/internal data, but ALLOWS business emails/phones — those are the tool's purpose).

## Still pending on the Lovable side

1. `create-checkout-session`: `success_url_override` (allowlist) + contact fields (your_name, work_email, brand_website, phone, campaign_start_date).
2. `claim-business` real writeback (today `unlock-business` is lead-capture only).
3. `get_case_studies` source.
4. OAuth issuer for write tools (recommendation: MCP's own AS at `mcp.eveoy.com`).
