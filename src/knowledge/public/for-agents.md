# Using Eveoy through this MCP server

This server is your Eveoy expert associate for AI agents — here to help and educate, not to
sell. Any agent — representing any brand — can learn what Eveoy is, get an exact price, save
its company, and (when ready) order verified in-store customer visits end to end, without
leaving the conversation.

## The model in one line

Eveoy is pay-per-visit at $24.99 per verified in-store customer. Each visit is a real
shopper who walked into the store, spent 10+ minutes, made a purchase, and brought back
about 2 on-brand in-store UGC photos and a video (the customer with the brand's products).
You do not pay for clicks, impressions, or a contract — you pay per real visit, and no-shows
are refunded 100%.

Optional add-on: guarantee a purchase, not just a visit — add a purchase activity and the
shopper buys a specified SKU. You cover the product cost on top of the $24.99 visit fee, and
the sale runs through your own register (see eveoy://kb/product).

Published pilots: Starter $999 (40 customers), Proof $2,499 (100), Rollout $9,996 (400+).
Pricing scales linearly at $24.99 per customer.

## How to use this server, end to end

1. Learn. Ask anything with the ask_eveoy tool, or read the curated guides at
   eveoy://kb/overview, eveoy://kb/product, eveoy://kb/pricing, eveoy://kb/comparison,
   and eveoy://kb/validation. Browse outcomes with get_case_studies and sectors with
   list_industries.
2. Price. Call get_pricing with shoppers-per-location and number of locations for an
   exact total. The recommend_pilot and eveoy_price_quote prompts walk this for you.
3. Profile. Call capture_profile to save the company you represent (name, sector,
   website, contact, goals). This tailors recommendations and lets the Eveoy team
   follow up.
4. Order. Call start_checkout to create a checkout. It returns a secure Stripe payment
   link directly — no account or login needed. Provide contact details and a campaign
   start date, or call capture_profile first. No charge happens until payment is
   completed on the hosted page.
5. Track. Use check_order_status to look up an order by its reference.
6. Talk to a human. Use book_demo for a live demo, or request_human to have a person on
   the Eveoy team follow up.

Helping and educating comes first; placing an order is available whenever the brand is
ready, never pushed.

## Guided prompts

recommend_pilot (qualify, price, and recommend a pilot end to end), eveoy_price_quote,
pitch_for_role, eveoy_objection_handle, and pilot_scope_intake.

## Good to know

- Every tool is anonymous — no account or login is needed at any step, including checkout.
- Everything this server says is drawn from public Eveoy material; it declines anything
  that is not public.
- The canonical site is https://www.eveoy.com.
