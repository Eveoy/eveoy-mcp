# eveoy.com/order — Stripe + Supabase integration contract

> Source: Lovable-authored spec, captured 2026-06-02. This is the **wire-level contract** the MCP must conform to so Phase 2 (`create_pilot_order` tool) is a thin call into the existing backend, not a parallel re-implementation.

## High-level flow

```
User on /order (eveoy.com)
  │ fills form (name, email, brand, phone, shoppers, locations,
  │             start date, optional advanced targeting)
  ▼
Client Zod-validates
  │
  ▼
supabase.functions.invoke("create-checkout-session", { body })
  │
  ▼
Supabase Edge Function: create-checkout-session
  ├─ INSERT public.orders (status='pending')
  ├─ creates Stripe Checkout Session (mode=payment)
  ├─ UPDATE orders.stripe_session_id
  └─ returns { url, sessionId }
  │
  ▼
window.location.href = url → Stripe-hosted Checkout
  │
  ├─ success → /order-confirmation?session_id={CHECKOUT_SESSION_ID}
  └─ cancel  → /order
  │
  ▼ (async)
Stripe → Supabase Edge Function: stripe-webhook
  ├─ verifies signature with STRIPE_WEBHOOK_SECRET
  ├─ on checkout.session.completed:
  │    UPDATE orders SET status='paid', customer_email, stripe_payment_intent_id, stripe_customer_id
  │    invokes send-transactional-email (template: order-notification → orders@eveoy.com)
  └─ on checkout.session.expired:
       UPDATE orders SET status='expired'
```

## Pricing + constraints (mirror these exactly)

| Constant | Value |
|---|---|
| Unit price | `$24.99` (`2499` cents server-side) |
| `customers_per_location` (UI label: "Shoppers per location") | min 20 · max 1,000 |
| `locations` | min 1 · max 50 |
| Start date floor | **today + 14 days** |
| Total | `customers_per_location × locations × 2499` cents |

## `public.orders` table schema

```sql
id                        uuid PRIMARY KEY default gen_random_uuid()
stripe_session_id         text UNIQUE
stripe_payment_intent_id  text
stripe_customer_id        text
customer_email            text                  -- filled by webhook from Stripe
locations                 integer NOT NULL  (>= 1)
customers_per_location    integer NOT NULL  (>= 1)
unit_price_cents          integer NOT NULL default 2499
total_cents               integer NOT NULL
status                    text NOT NULL default 'pending'
                          CHECK in ('pending','paid','failed','expired')
advanced_targeting        jsonb                 -- see schema below
created_at, updated_at    timestamptz default now()
```

Row-level security: enabled. Only `service_role` can read/write. All access goes through edge functions.

## `advanced_targeting` JSONB shape

Nullable — `null` when user left the section empty.

```ts
{
  age: ("13-17" | "18-24" | "25-34" | "35-44" | "45-54" | "55+")[],
  locationType: "Country" | "Region / State" | "DMA (US)" | "City" | "ZIP / postal code" | null,
  locationValues: string[],                    // empty unless locationType set
  gender: "Men" | "Women" | null,              // "All" collapses to null
  householdIncome: ("Top 5%" | "Top 10%" | "Top 10-25%" | "Top 25-50%")[]
}
```

## Edge function: `create-checkout-session`

- **POST only**, CORS open
- **Request body:**
  ```ts
  {
    locations: number,                    // integer ≥ 1
    customers_per_location: number,       // integer ≥ 1
    advancedTargeting?: AdvancedTargeting | null
  }
  ```
- **Behavior:** validates input → normalizes `advancedTargeting` (string arrays trimmed, capped 50 entries; collapses to `null` if all empty) → `total_cents = locations * customers_per_location * 2499` → `INSERT orders status='pending'` → creates Stripe Checkout Session → `UPDATE orders.stripe_session_id` → returns `{ url, sessionId }`
- **Stripe SDK:** `stripe@14.21.0`, API version `2023-10-16`
- **Customer + invoice creation:** both `enabled`

## Edge function: `stripe-webhook`

- **POST only**, no CORS
- Verifies signature via `stripe.webhooks.constructEventAsync()` (Deno-safe async form)
- Configured with `verify_jwt = false` in `supabase/config.toml` (authenticates via Stripe signature, not Supabase JWT)
- Webhook URL: `https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `checkout.session.expired`
- Idempotency: `UPDATE … WHERE stripe_session_id = …` is naturally idempotent on re-delivery; email send uses idempotency key `order-notify-${order.id}`

## Edge function: `get-order-summary`

Used by `/order-confirmation`. Returns PII-masked subset:

```ts
{
  customer_email: "j****@brand.com" | null,
  locations: number,
  customers_per_location: number,
  total_cents: number,
  status: string
}
```

`advanced_targeting` is deliberately NOT returned (session_id can leak via Referer/history).

## Billing portal flow (returning customers)

- `/billing` → user enters email
- `create-portal-by-email` → looks up most recent paid order, emails a one-time signed link (15-min TTL, single-use). Response is always generic — doesn't leak which emails exist.
- Link → `redeem-billing-portal` → validates token → 302 to fresh Stripe Billing Portal session

## State machine

```
pending ──(checkout.session.completed)──▶ paid
   │
   └──(checkout.session.expired)─────────▶ expired
```

`failed` is in the CHECK constraint but never written today.

## Known gaps to flag

These are the *existing* gaps in eveoy.com/order. The MCP Phase 2 design has to decide which to leave as-is vs fix:

1. **Customer-entered `name`, `email`, `brand_website`, `phone`, `startDate` from the form are DISCARDED.** They're Zod-validated client-side but never posted to the edge function or stored on `orders`. Stripe Checkout collects its own email/billing. Fix: add columns + plumb through `create-checkout-session` body + metadata.
2. **No `failed` writes** despite the CHECK constraint allowing it.
3. **`/order-confirmation` doesn't poll.** If the webhook hasn't fired yet, status is still `pending` when the page first loads.
4. **Currency hard-coded to USD.** No multi-currency.
5. **Stripe API version pinned to `2023-10-16`** — old. Worth bumping.

## What this means for the MCP Phase 2 wiring

When `create_pilot_order` ships:

| Concern | Approach |
|---|---|
| Stripe key on Vercel | **NOT NEEDED.** MCP calls Supabase edge fn; edge fn holds the Stripe key. |
| Separate Postgres on Vercel | **NOT NEEDED.** Supabase `public.orders` is the table of record. |
| Separate webhook handler | **NOT NEEDED.** Supabase `stripe-webhook` already exists and is idempotent. |
| Resend / email | **NOT NEEDED.** `stripe-webhook` already calls `send-transactional-email` to `orders@eveoy.com`. |
| Required env vars | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (anon — the edge fn is invokable by anonymous clients; auth is via Stripe signature on the webhook side) |
| Phase 2 implementation | One file: `src/integrations/supabase.ts` — wraps `@supabase/supabase-js` `functions.invoke("create-checkout-session", { body })`. The MCP tool is a 30-line wrapper. |
| success_url override | The edge fn uses `${origin}/order-confirmation`. From MCP land, `origin` would be `mcp.eveoy.com` (wrong). Either (a) extend the edge fn to accept a `success_url_override` param, or (b) add a Phase-2 query-string passthrough on `mcp.eveoy.com/order-confirmation`. Pick (a) — simpler, server-controlled. |
| Form-field-discard gap (#1 above) | Extend `create-checkout-session` body to accept `your_name`, `work_email`, `brand_website`, `phone`, `campaign_start_date`; add columns to `orders`. Do this when wiring Phase 2 so the MCP doesn't perpetuate the gap. |
