# Working with Lovable + Claude Code — the Eveoy stack

Honest tool-fit first, because it determines who does what.

| Tool | Great at | Not the right tool for |
|---|---|---|
| **Claude Code** (me) | The MCP **Worker** — TypeScript, Cloudflare Workers, Durable Objects, the classifier, Zod schemas, Phase 2 OAuth + Supabase wiring, tests, deploy config | Designing polished marketing UI from scratch |
| **Lovable** | **eveoy.com** front-end + the **Supabase order backend** (it already built the `/order` page, the `create-checkout-session` / `stripe-webhook` edge functions per `ORDER_FLOW_SPEC.md`); consuming MCP servers as connectors | Authoring/operating a Cloudflare Worker MCP server — that's not its wheelhouse |
| **You** (Brad) | Cloudflare account, DNS, secrets, the deploy button, registry TXT, final approvals | — |

**The key realization:** don't hand the MCP Worker to Lovable. Lovable already owns the half of this system it's best at — the order page and the Supabase/Stripe backend. The MCP Worker stays with Claude Code. They meet at one clean contract.

## Division of labor

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  Claude Code  → owns         │         │  Lovable  → owns             │
│  github.com/Eveoy/eveoy-mcp  │         │  eveoy.com + Supabase        │
│                              │         │                              │
│  • The MCP Worker (this repo)│         │  • /order page (React)       │
│  • Tools, classifier, schemas│         │  • create-checkout-session   │
│  • Phase 2 OAuth + the call  │────────▶│  • stripe-webhook            │
│    into Supabase edge fn     │  HTTPS  │  • public.orders table       │
│  • Cloudflare deploy config  │         │  • order-confirmation page   │
└─────────────────────────────┘         └──────────────────────────────┘
            ▲                                         ▲
            └──────────  shared contract  ────────────┘
                     docs/ORDER_FLOW_SPEC.md
```

The seam is `ORDER_FLOW_SPEC.md`. The MCP's Phase-2 `create_pilot_order` tool will call Lovable's existing `supabase.functions.invoke("create-checkout-session", { body })`. The MCP schema (`CreatePilotOrderInput` in `src/mcp/schemas.ts`) is already field-for-field aligned with that edge function. No translation layer.

## What to ask Lovable to do (Phase 2 only — when you greenlight it)

Lovable needs to make **one** small change on its side so the MCP can drive a checkout. Paste this to Lovable:

> **Brief for Lovable — extend `create-checkout-session` for agent-initiated orders**
>
> Our MCP server (separate Cloudflare Worker) will call `create-checkout-session` to start a pilot checkout on behalf of a user talking to an AI. Two changes:
>
> 1. Accept an optional `success_url_override` (string, https only, must be on an allowlist: `https://mcp.eveoy.com/*`, `https://eveoy.com/*`). Use it as the Stripe Checkout `success_url` when present; otherwise keep today's `${origin}/order-confirmation`.
> 2. Accept and persist the contact fields the form currently discards (`your_name`, `work_email`, `brand_website`, `phone`, `campaign_start_date`) — add columns to `public.orders` and write them through. (This also fixes the "known gap #1" in our shared spec.)
>
> Keep everything else identical: unit_price_cents = 2499, `customers_per_location × locations`, the `advanced_targeting` JSONB shape, the webhook, the email to orders@eveoy.com. Constraints must stay: customers_per_location 20–1000, locations 1–50, start date ≥ today + 14 days.

That's the entire Lovable ask. Everything else on the MCP side (OAuth, the tool, calling the edge fn) is Claude Code's job.

## Using the Eveoy MCP *inside* Lovable

Separately — once the Worker is deployed, anyone (including you, in a Lovable project) can connect to it:

1. Lovable → **Connectors → Chat connectors → New MCP server**
2. Server name: `Eveoy` · URL: `https://mcp.eveoy.com/mcp`
3. Add & authorize

The Lovable agent can then answer Eveoy questions and price pilots from chat.

## If you really want Lovable to touch the Worker code

Possible but not recommended. Lovable can sync to a GitHub repo, so in principle it could open `Eveoy/eveoy-mcp`. But Lovable's strength is React/Vite generation, not Cloudflare Workers — you'd be fighting the tool. Keep the Worker with Claude Code; keep the front-end + Supabase with Lovable. That plays to both.

## The loop, in practice

1. **You** describe what you want (a feature, a fix, a launch step).
2. **Claude Code** does anything touching the MCP Worker, this repo, Cloudflare, or the MCP↔Supabase integration — and runs the tests + `wrangler dev` to prove it works.
3. **Lovable** does anything touching eveoy.com's UI or the Supabase/Stripe order backend.
4. **You** run the privileged one-time actions: `wrangler login`, `wrangler deploy`, DNS, secrets, registry TXT.
5. The two sides stay compatible because they share one written contract (`ORDER_FLOW_SPEC.md`) — when either side changes the order shape, update that file and tell the other.
