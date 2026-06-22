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
- `/unlock-business` → `{ email, full_slug, source_url? }` (email + full_slug required) ⇒
  `{ ok, cached, city_record { naics_code, council_district, account_number },
  contacts { phone, email, website, hours, *_source, phone_updated_at, representative,
  representative_title, representative_source, representative_updated_at, enriched_at },
  rating, rating_source, rating_updated_at }`. Errors: 400 invalid_json / invalid_email /
  missing_full_slug, 404 not_found, 405 method_not_allowed.

  **Parity rule (CLAUDE_CODE §4.4) — single source of truth.** `claim_business` MUST mirror
  the website's unlock flow exactly: same endpoint, same payload, surface the response
  verbatim. Do NOT branch the logic. The Worker does NOT run its own AI lookup, freshness
  check, or lead insert. Server behavior (identical for web + MCP, do not re-implement):
  1. Always inserts a `leads` row, even on partial AI failure.
  2. Returns `city_record` IDs instantly from the DB.
  3. Contacts resolved as `*_ai ?? open-data` column; open-data is never overwritten.
  4. JIT Gemini 2.5 Flash lookup (12s timeout) when a contact/representative is missing or
     `enriched_at` > 90 days; results write only to `_ai` shadow columns.
  5. `cached:true` = no AI ran; `cached:false` = JIT just ran.
  6. Google rating < 3.0 is floored to a random 3.0 / 3.1 / 3.2.

  There is **no** separate `claim-business` writeback endpoint — `/unlock-business` IS the
  complete claim contract. "Claim ownership" === submit the email through this flow.

## Classifier scoping

- `ask_eveoy` + KB resources run the FULL `assertPublic` (blocks internal data AND foreign PII emails).
- Directory + order + contact tools run `assertNoSecrets` (still blocks secrets/internal data, but ALLOWS business emails/phones — those are the tool's purpose).

## Still pending on the Lovable side

1. `create-checkout-session`: `success_url_override` (allowlist) + contact fields (your_name, work_email, brand_website, phone, campaign_start_date).
2. `get_case_studies` source (insights page vs newsletter archive).
3. OAuth issuer for write tools — only if we decide to gate them (recommendation: MCP's own AS at `mcp.eveoy.com`).

> Explicitly NOT pending: a `claim-business` writeback fn. Per Lovable, `/unlock-business`
> is the entire claim contract — do not build, stub, or request a separate endpoint.
