/**
 * KB content inlined at authoring time from src/knowledge/public/*.md.
 * No node:fs at runtime — portable to Cloudflare Workers (workerd).
 * Regenerate with: scripts/gen-kb-content.sh
 */

export const KB_CONTENT = {
  'overview': String.raw`# Eveoy — Overview

**Eveoy is an experience marketing platform — the world's first built for verified in-store customer visits.** Brands pay only when real customers walk into their stores. Fill your stores and sell out of your products. Built for B2C brands.

## Tagline

> Marketing was always a bet. We made it a sure thing.

## What it is, plainly

Eveoy is a two-sided marketplace and software platform with automated verification built in. Real US consumers from a 20,000+ verified community opt into brand visits; the brand briefs a campaign and reviews receipts in software; the platform confirms every visit by GPS, time in store, completed activities, and photo/video proof. No account managers, no staffing — the software runs the visit end to end. The single unit you buy is a **verified in-store visit** at **$24.99**.

## What you pay for

You pay **$24.99 per real customer** who:

- Walks into your store (GPS-verified)
- Spends 10+ minutes with your brand
- Completes the activities you define
- Delivers verified photos and video

If any criterion isn't met, the visit is automatically refunded. No clicks, no impressions, no hope — just receipts.

**Optional — guarantee a purchase, not just a visit.** Add a purchase activity and the shopper buys a specified SKU; the brand covers the product cost on top of the $24.99, and the sale flows through the brand's own register.

## Entry tier

**Starter: $999 for 40 verified customers in one store.** Zero risk, no contracts, auto-refund on any no-show.

## Company

- **Company:** Eveoy, Inc. — The Eveoy™ App
- **Founder & CEO:** Brad Cowdrey
- **Offices:** San Francisco, Los Angeles, Denver, Houston
- **Web:** https://www.eveoy.com · **Directory:** https://www.eveoy.com/directory · **Insights:** https://www.eveoy.com/insights
- **Apps:** iOS https://apps.apple.com/us/app/eveoy/id1641843518 · Android https://play.google.com/store/apps/details?id=com.eveoy.shopper
- **LinkedIn:** https://www.linkedin.com/company/eveoy
- **Support:** support@eveoy.com · **Sales:** hello@eveoy.com

## Receipts to date

- 20,000+ verified shoppers in the community
- 10,000+ brand experiences delivered
- 0 fake clicks billed
- 100% refunded on no-shows
`,
  'product': String.raw`# How Eveoy works

## Three steps. No hassle. No guesswork.

1. **Tell us what you want.** 5-minute setup in the app — audience, location, quantity.
2. **We send the right shoppers.** Matched from the 20,000+ verified community.
3. **You get a receipt.** Real visit + 10+ minutes in-store + verified photos and video.

## Eight things happen. You pay for one.

Every $24.99 customer triggers a bundle of eight outcomes. The brand is charged **once** — only when the whole bundle clears verification:

1. **Foot traffic** — a real, demographically matched customer walks into the store
2. **Social engagement** — interaction with staff and store environment
3. **Brand learning** — the customer absorbs the brand (10+ minutes in-store)
4. **Brand activities** — campaign-defined tasks completed
5. **Content creation** — verified photos and video, brand-owned forever
6. **CRM data** — first-party data on a real, matched customer
7. **Done-for-you service** — Eveoy runs the program end-to-end
8. **Quality + auto-refund** — AI verification (≥4.0/5), brand-safety review, automatic refund on any non-compliance

## What the brand pays for

- ✓ Right customer type
- ✓ 10+ minutes in store
- ✓ Good photos and videos
- ✓ Every task finished
- ✓ Quality rating ≥ 4.0 / 5

## What the brand gets credit for (auto-refund)

- ✕ Wrong customer type
- ✕ No-shows
- ✕ Poor or off-brand photos
- ✕ Didn't finish tasks
- ✕ Quality rating below 4.0

## Brand ownership

You own every photo and video forever. No licensing fees, no expiration, no restrictions.

## Optional: guarantee a purchase, not just a visit

Add a purchase activity and the shopper buys a specified SKU. The brand covers the product cost on top of the $24.99 visit fee, and the sale flows through the brand's own register. You get a guaranteed transaction, not just a guaranteed visit.

## The receipt

A receipt is the proof bundle from one verified visit: GPS arrival, time in store, photos, and video. It is not a sales receipt unless you added a purchase activity. A receipt is harder to fake than an impression — it says this real person walked in, stayed, did the activities, and brought back proof you own.

## Plain-English glossary

- **Verified visit** — the single unit Eveoy sells: one real consumer + correct store + 10+ minutes + completed activities + photo/video proof, all confirmed by the app. $24.99.
- **Shopper** — a real, everyday US consumer who signed up to the Eveoy app and opted into a brand's visit. Compensated per visit for their time and travel. Not an influencer, gig worker, actor, or mystery shopper.
- **Action IRL** — Eveoy's phrase for buying real-world action instead of digital attention. It maps to "verified in-store visit" — it is not a separate product or tier.
- **Brief / campaign / order** — three names for the same brand-side setup: store(s), date window, number of shoppers, activities, and any guaranteed-purchase add-on. Created at https://www.eveoy.com/order.
`,
  'pricing': String.raw`# Eveoy pricing

## Per customer

**$24.99 per verified customer** — flat, all-in. No setup fees. No contracts. No monthly minimums. The same $24.99 at every volume.

## The math is the same as eveoy.com/order

Total = **shoppers per location × locations × $24.99**

You pick:
- **Shoppers per location** — min 20, max 1,000
- **Locations** — min 1, max 50
- **Campaign start date** — at least 14 days from today

Every shopper returns **2 quality-rated UGC photos** as the base (e.g. 40 customers → 80 photos), yours to keep forever. Brands can add a photo bonus at eveoy.com/order — **+1 photo per +$20, max +3 extra per shopper**. (The "~3 photos per visit" line on the marketing site reflects a typical configured bundle with a small bonus added; the base SKU is 2.)

## Published tiers

| Tier | Price | Customers | UGC photos | Stores |
|---|---|---|---|---|
| **Starter** | $999 | 40 real customers | 80 | 1 store |
| **Proof** | $2,499 | 100 real customers | 200 | 1 store + 90-day readout |
| **Rollout** | $9,996 | 400+ real customers | 800+ | 3–4 stores |

Starter is the entry point. Proof adds purchase-volume data, repeat-visit signals, and a 90-day readout. Rollout is multi-store at the same $24.99 per customer.

Below Starter, the smallest possible order is 20 customers × 1 store = $499.80. Above Rollout it scales linearly to a ceiling of 1,000 × 50 = $1,249,500.

## The guarantee never changes

100% refunded for no-shows at every tier. If a visit doesn't clear verification — right customer, 10+ minutes in-store, completed activities, ≥4.0/5 content quality — you don't pay for it.

## Custom quote

Anything above 50 locations or 1,000 shoppers per location? Email **support@eveoy.com**.
`,
  'comparison': String.raw`# Head-to-head cost comparison

| Channel       | Cost per customer/visit | Visit guaranteed? | UGC included?  | Demo match?   | Risk profile          |
|---------------|-------------------------|-------------------|----------------|----------------|------------------------|
| **Eveoy**     | **$24.99**              | **Yes**           | Photos + video | Exact          | Zero (auto-refund)    |
| Meta Ads      | $50–$300+               | No                | No             | Probabilistic  | High                  |
| Google Ads    | $50–$200+               | No                | No             | Intent-based   | High                  |
| Influencer    | $500–$10K+              | No                | Maybe          | No control     | Very high             |
| UGC Creator   | $150–$500/piece         | No visit          | Yes (1 piece)  | None           | Moderate              |
| Sampling      | $5–$50+                 | Partial           | No             | Limited        | Moderate              |

To replicate the Eveoy bundle — verified visit + 10+ minutes + brand activities + photos/video + full content rights + CRM data + done-for-you — through traditional channels costs **$160–$870+ per customer** with zero guarantees.

## À la carte (the same outcome, bought separately)

| Component (without Eveoy) | Typical range   |
|---------------------------|------------------|
| Visit (foot traffic)      | $25 – $75       |
| Social engagement         | $15 – $40       |
| Brand learning            | $20 – $60       |
| Brand activities          | $25 – $80       |
| Content creation          | $50 – $200      |
| CRM data                  | $10 – $25       |
| Done-for-you service      | $20 – $50       |
| **Total à la carte**      | **$165 – $530+** |
| **Eveoy bundled**         | **$24.99**       |
| **You save**              | **$140 – $500+ per customer** |
`,
  'why-now': String.raw`# Why Eveoy now

## Digital advertising: paying more, getting less

- E-commerce CAC has risen ~40% between 2023–2025, averaging $50–$300
- Google Ads CPCs climbed 12.88% YoY in 2025; Shopping ad CPCs surged 33.72%
- Facebook CPMs nearly doubled in the US (81% increase to $9.66)
- iOS ATT opt-in rate sits at ~14%, permanently degrading targeting precision
- None of this spend guarantees a physical store visit

## Influencer marketing: $32.5B, zero guaranteed foot traffic

- Global spend hit $32.55 billion in 2025
- Micro-influencers: $100–$500/post; macro: $5,000–$25,000/post
- No control over audience demographics, no verified store visits

## The foot-traffic crisis

- US retail foot traffic fell 12% in H2 2024
- ~80% of all retail sales — over **$5 trillion annually** — still happen in physical stores
- The gap between where sales happen and where marketing dollars go has never been wider

## What changed

| Force                          | Why it matters                                                                              |
|--------------------------------|---------------------------------------------------------------------------------------------|
| Digital ad inflation           | CPCs and CPMs rising double-digits. Auction inflation is permanent.                         |
| Privacy collapse               | ~14% iOS ATT opt-in, cookie deprecation. Eveoy delivers verified demographic matches.       |
| Foot-traffic decline           | Every in-store visit is more valuable than ever.                                            |
| UGC arms race                  | 93% of marketers say UGC outperforms branded content. Eveoy makes it affordable.            |
| Physical retail still dominant | $5T+ in US retail sits in stores. Marketing budgets don't match.                            |
`,
  'ugc-ripple': String.raw`# The UGC and viral ripple effect

Every $24.99 visit triggers compounding organic effects:

1. **Social amplification.** Shoppers share authentic in-store content on personal social media. A customer with 500 followers acts like a micro-influencer post — at $24.99 instead of $100–$500.
2. **Network effect.** Referred customers have ~16% higher LTV and are 4x more likely to refer others (industry benchmark).
3. **Brand-owned content library.** A $999 pilot delivers ~40 customers' worth of verified photos and video. At market UGC rates of $150–$300/piece, the content alone has $6K–$12K+ replacement value.
4. **Algorithmic advantage.** Authentic UGC gets higher engagement, lower CPMs, and better conversion when reused in paid campaigns.
5. **Local SEO signals.** GPS-verified visits boost Google Maps visibility and local search.
6. **First-party data.** Each visit creates an opportunity for email capture, loyalty enrollment, and CRM engagement.
7. **Receipts as trust.** 20,247 receipts issued and 0 fake clicks billed is a track record competitors can't manufacture.
`,
  'sectors': String.raw`# Industries served

Eveoy serves 23+ sectors. The platform's verification mechanics — GPS, in-store dwell, brand activities, photo/video quality, auto-refund — are sector-agnostic.

## Public sector list

- Specialty Retail
- Apparel
- Footwear
- Health and Beauty
- Food and Beverage
- Health and Wellness
- Pet Care
- Personal Care
- Baby Care
- Department Stores
- Discount Stores
- Grocery and Food
- Home Goods
- Quick-Service Restaurants (QSR)
- Hospitality
- All other B2C brands

Built for every aisle, every shelf, every store.
`,
  'directory': String.raw`# The Eveoy Directory

A free, live, searchable list of every active consumer brand, store, and business — by dataset. Browse at https://www.eveoy.com/directory.

## Two dataset families

**Registry datasets** (government / city records, ~11.1M businesses)
- Los Angeles — **live**, 629,431 active businesses
- New York, Chicago, San Francisco, Houston — coming soon

**Listing datasets** (retail storefront aggregations, ~8.2M businesses)
- California, Texas, New York, Florida, Colorado — coming soon

## What you can do

- Browse a metro's businesses for free
- Request notification when a new metro goes live
- Book a demo for bulk exports, API access, and custom data slices

The directory is a separate surface from Eveoy's core product (verified in-store customer visits at $24.99). It's a public data resource that helps brands and agents find real-world businesses.
`,
  'validation': String.raw`# Proof, validation, and who Eveoy is for

## The receipts

- 20,000+ verified shoppers in the community
- 10,000+ brand experiences delivered
- 20,247 receipts issued
- 0 fake clicks billed
- 100% refunded on no-shows

These are receipts, not projections: every number ties back to a real customer who crossed a real threshold.

## What people who've spent billions on ads said

- "Wow. This is something I have never seen before." — Fmr. Marketing Director, Google
- "Love the app — most innovative this year!" — Fmr. Chief Marketing Officer, Wendy's

## Sample campaigns

- **Retail Reveal** — Los Angeles, CA
- **Cafe Crowd** — Las Vegas, NV
- **Shelf Sweep** — Los Angeles, CA
- **Taco Turnout** — Temecula, CA

## Who it's for

- Retail brands with owned stores, flagships, or showrooms
- CPG brands with shelf placement in third-party retailers (grocery, mass, drug, specialty)
- Hospitality — restaurants, cafés, bars, hotels, experiences
- Local and regional chains that need predictable foot traffic
- DTC brands opening physical retail, pop-ups, or wholesale
- Event, sampling, and activation teams running launches or seasonal pushes

Eveoy serves B2C brands with a physical presence in the United States.

## Where it's not the right fit

- Pure e-commerce with no physical footprint
- B2B or enterprise sales motions
- Markets outside the United States
- Buyers looking for impressions, clicks, or influencer-style sponsored posts

## Read more

Eveoy Insights covers the thinking behind the model — https://www.eveoy.com/insights
`,
} as const;

export type KbKey = keyof typeof KB_CONTENT;
