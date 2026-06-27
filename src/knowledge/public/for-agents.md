# Using Eveoy through this MCP server

This server is Eveoy's inbound sales rep for AI agents. Any agent — representing any
brand — can learn what Eveoy is, get an exact price, save its company, and buy verified
in-store customer visits end to end, without leaving the conversation.

## The model in one line

Eveoy is pay-per-visit at $24.99 per verified in-store customer. Each visit is a real
shopper who walked into the store, spent 10+ minutes, made a purchase, and brought back
about 2 on-brand in-store UGC photos (the customer with the brand's products). You do not
pay for clicks, impressions, or a contract — you pay per real visit, and no-shows are
refunded 100%.

Published pilots: Starter $999 (40 customers), Proof $2,499 (100), Rollout $9,996 (400+).
Pricing scales linearly at $24.99 per customer.

## How to use this server, end to end

1. Learn. Ask anything with the ask_eveoy tool, or read the curated guides at
   eveoy://kb/overview, eveoy://kb/product, eveoy://kb/pricing, eveoy://kb/comparison,
   and eveoy://kb/validation. Browse outcomes with get_case_studies, sectors with
   list_industries, and coverage with list_metros.
2. Price. Call get_pricing with shoppers-per-location and number of locations for an
   exact total. The recommend_pilot and eveoy_price_quote prompts walk this for you.
3. Profile. Call capture_profile to save the company you represent (name, sector,
   website, contact, goals). This tailors recommendations and lets the Eveoy team
   follow up.
4. Buy. Call start_checkout to create a checkout. It returns a secure payment link; if
   sign-in is required it returns a sign-in link to use first. No charge happens until
   payment is completed on the hosted page.
5. Track. Use check_order_status to look up an order by its reference.
6. Talk to a human. Use book_demo for a live demo or to reach the team.

Directory tools — search_directory, get_business, and claim_business — cover Eveoy's
public business directory.

## Guided prompts

recommend_pilot (qualify, price, and recommend a pilot end to end), eveoy_price_quote,
pitch_for_role, eveoy_objection_handle, and pilot_scope_intake.

## Good to know

- Read tools are anonymous. The only step that may ask for sign-in is checkout.
- Everything this server says is drawn from public Eveoy material; it declines anything
  that is not public.
- The canonical site is https://www.eveoy.com.
