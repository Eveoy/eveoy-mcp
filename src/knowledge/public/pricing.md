# Eveoy pricing

## Per customer

**$24.99 per verified customer** — flat, all-in. No setup fees. No contracts. No monthly minimums. The same $24.99 at every volume.

## The math is the same as eveoy.com/order

Base total = **shoppers per location × locations × $24.99**

You pick:
- **Shoppers per location** — min 20, max 1,000
- **Locations** — min 1, max 50
- **Campaign start date** — at least 14 days from today
- **Guarantee** — visit + purchase (recommended) or visit only
- **Shopper bonus** — optional, $20–$200 per shopper

Every shopper returns **2 quality-rated UGC photos** as the base (e.g. 40 customers → 80 photos), yours to keep forever.

## Guaranteed purchase (the recommended option)

With **guaranteed visit + purchase**, every shopper also buys your chosen SKU at your register. You set the SKU price ($5–$100, tax included) and cover it plus a **7.5% platform fee on the SKU amount only** — never on the $24.99 base. The item money rings right back into your till, because the sale runs through your own register. Choose **visit only** to skip the purchase: just the visit and the photos.

## Shopper bonus (optional)

Add **$20–$200 per shopper** (any amount) with a **33% platform fee on the bonus only**. Every full $20 unlocks **+1 photo AND +1 follow/like/comment set per shopper**, each capped at +3 — so $60 maxes the rewards (5 photos + 3 social sets per shopper). Amounts above $60 increase the shopper's bonus but not the unit rewards.

## The full formula (what Stripe actually charges)

    units    = shoppers_per_location × locations
    base     = units × $24.99
    purchase = visit+purchase ? round(units × sku_price × 1.075) : 0
    bonus    = bonus > 0      ? round(units × bonus × 1.33)      : 0
    total    = base + purchase + bonus

Worked example: 40 shoppers × 1 store, guaranteed purchase with a $5.00 SKU, $60 bonus → $999.60 + $215.00 + $3,192.00 = **$4,406.60**.

## Published tiers

| Tier | Price | Customers | UGC photos | Stores |
|---|---|---|---|---|
| **Starter** | $999 | 40 real customers | 80 | 1 store |
| **Proof** | $2,499 | 100 real customers | 200 | 1 store + 90-day readout |
| **Rollout** | $9,996 | 400+ real customers | 800+ | 3–4 stores |

Starter is the entry point. Proof adds purchase-volume data, repeat-visit signals, and a 90-day readout. Rollout is multi-store at the same $24.99 per customer. All three tier prices are the **visit-only base** — the guaranteed purchase (SKU + 7.5%) and shopper bonus (+33%) are added on top when selected.

Below Starter, the smallest possible order is 20 customers × 1 store = $499.80. Above Rollout it scales linearly to a ceiling of 1,000 × 50 = $1,249,500 (base).

## The guarantee never changes

100% refunded for no-shows at every tier. If a visit doesn't clear verification — right customer, 10+ minutes in-store, completed tasks, ≥4.0/5 content quality — you don't pay for it.

## Custom quote

Anything above 50 locations or 1,000 shoppers per location? Email **support@eveoy.com**.
