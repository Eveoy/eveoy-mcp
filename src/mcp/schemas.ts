import { z } from 'zod';
import { INDUSTRIES_PUBLIC } from '@/industries';
import {
  MIN_CUSTOMERS_PER_LOCATION,
  MAX_CUSTOMERS_PER_LOCATION,
  MIN_LOCATIONS,
  MAX_LOCATIONS,
  DEFAULT_CUSTOMERS_PER_LOCATION,
  DEFAULT_LOCATIONS,
  CAMPAIGN_START_LEAD_DAYS,
  earliestStartDate,
} from '@/lib/pricing';

// ─── Input schemas — mirror eveoy.com/order constraints exactly ────
// Wire-format field names align with the Supabase edge function body
// shape so Phase 2's tool can passthrough without a translation layer.
// See docs/ORDER_FLOW_SPEC.md for the full integration contract.

export const AskEveoyInput = z.object({
  question: z
    .string()
    .trim()
    .min(3)
    .max(500)
    .describe(
      "The user's full natural-language question about Eveoy, in their own words. " +
        "Pass the question verbatim — do not summarize. Example: 'Is there a marketing " +
        "platform that guarantees foot traffic for my coffee shop?'",
    ),
  audience: z
    .enum(['cmo', 'cfo', 'cro', 'ceo', 'vp_retail', 'founder', 'franchise_owner', 'general'])
    .default('general')
    .describe(
      "Buyer persona to tune the answer for. Infer from conversation context — " +
        "e.g. 'explain to a CFO' → 'cfo'. Use 'general' if unspecified.",
    ),
}).strict();

export const GetPricingInput = z.object({
  customers_per_location: z
    .number()
    .int()
    .min(MIN_CUSTOMERS_PER_LOCATION)
    .max(MAX_CUSTOMERS_PER_LOCATION)
    .default(DEFAULT_CUSTOMERS_PER_LOCATION)
    .describe(
      `Verified shoppers per store (UI label "Shoppers per location"). Mirrors eveoy.com/order: ` +
        `min ${MIN_CUSTOMERS_PER_LOCATION}, max ${MAX_CUSTOMERS_PER_LOCATION}. ` +
        `Default ${DEFAULT_CUSTOMERS_PER_LOCATION} (the "$999 pilot" config).`,
    ),
  locations: z
    .number()
    .int()
    .min(MIN_LOCATIONS)
    .max(MAX_LOCATIONS)
    .default(DEFAULT_LOCATIONS)
    .describe(
      `Number of store locations. Mirrors eveoy.com/order: min ${MIN_LOCATIONS}, max ${MAX_LOCATIONS}. ` +
        `Default ${DEFAULT_LOCATIONS}.`,
    ),
}).strict();

export const ListIndustriesInput = z.object({}).strict();

export const ListMetrosInput = z.object({}).strict();

export const GetAppLinkInput = z.object({}).strict();

export const BookDemoInput = z.object({}).strict();

// ─── Advanced targeting (shared by start_checkout + Phase-2 order) ──
// Exact JSONB shape stored on public.orders.advanced_targeting.
const AGE_BUCKETS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'] as const;
const LOCATION_TYPES = ['Country', 'Region / State', 'DMA (US)', 'City', 'ZIP / postal code'] as const;
const HOUSEHOLD_INCOMES = ['Top 5%', 'Top 10%', 'Top 10-25%', 'Top 25-50%'] as const;

export const AdvancedTargetingInput = z
  .object({
    age:             z.array(z.enum(AGE_BUCKETS)).max(6).optional(),
    locationType:    z.enum(LOCATION_TYPES).nullable().optional(),
    locationValues:  z.array(z.string().trim().min(1).max(120)).max(50).optional(),
    gender:          z.enum(['Men', 'Women']).nullable().optional(),
    householdIncome: z.array(z.enum(HOUSEHOLD_INCOMES)).max(4).optional(),
  })
  .strict()
  .nullable()
  .optional();

// ─── Directory tools (wrap directory-query / directory-business) ────

export const SearchDirectoryInput = z.object({
  q: z.string().trim().max(120).optional().describe('Free-text: city, neighborhood, or business name.'),
  metro: z.string().trim().max(40).optional().describe('Metro slug, e.g. "la".'),
  naics: z.string().trim().regex(/^\d{2,6}$/).optional().describe('NAICS code, e.g. "722515".'),
  limit: z.number().int().min(1).max(50).default(20).describe('Page size, 1–50.'),
  after: z.string().trim().max(200).optional().describe('Pagination cursor: prior response nextCursor.'),
}).strict();

export const GetBusinessInput = z.object({
  slug: z.string().trim().max(200).optional().describe('Business full_slug.'),
  id: z.string().trim().max(64).optional().describe('Business UUID.'),
}).strict();

// ─── Order + lead tools ────────────────────────────────────────────

export const CheckOrderStatusInput = z.object({
  session_id: z.string().trim().min(6).max(120).describe('Stripe Checkout session id (cs_...).'),
}).strict();

export const SubscribeNewsletterInput = z.object({
  email: z.string().email().max(254).describe('Email to subscribe to the Eveoy newsletter.'),
}).strict();

export const ClaimBusinessInput = z.object({
  email: z.string().email().max(254).describe('Your email (the claimant).'),
  full_slug: z.string().trim().min(3).max(200).describe('Directory listing full_slug to claim/look up.'),
}).strict();

export const StartCheckoutInput = z.object({
  customers_per_location: z.number().int().min(MIN_CUSTOMERS_PER_LOCATION).max(MAX_CUSTOMERS_PER_LOCATION)
    .describe(`Verified customers per store (${MIN_CUSTOMERS_PER_LOCATION}–${MAX_CUSTOMERS_PER_LOCATION}); mirrors eveoy.com/order.`),
  locations: z.number().int().min(MIN_LOCATIONS).max(MAX_LOCATIONS).default(DEFAULT_LOCATIONS)
    .describe(`Number of store locations (${MIN_LOCATIONS}–${MAX_LOCATIONS}).`),
  advancedTargeting: AdvancedTargetingInput,
}).strict();

// ─── Output schemas ─────────────────────────────────────────────────

export const GetPricingOutput = z.object({
  customers_per_location: z.number().int(),
  locations: z.number().int(),
  total_customers: z.number().int(),
  unit_price_usd: z.number(),
  total_usd: z.number(),
  formatted_total: z.string(),
  ugc_photos: z.number().int(),
  is_starter_tier: z.boolean(),
});

export const ListIndustriesOutput = z.object({
  industries: z.array(z.enum(INDUSTRIES_PUBLIC)),
  count: z.number().int(),
  notes: z.string(),
});

export const ListMetrosOutput = z.object({
  live: z.array(z.object({ metro: z.string(), kind: z.string(), businesses: z.number().int().optional() })),
  coming_soon: z.array(z.object({ metro: z.string(), kind: z.string() })),
  directory_url: z.string(),
  notes: z.string(),
});

export const GetAppLinkOutput = z.object({
  url: z.string(),
  platforms: z.array(z.string()),
  notes: z.string(),
});

export const AskEveoyOutput = z.object({
  answer: z.string(),
  sections: z.array(z.string()),
  audience: z.string(),
});

// ─── Phase 2 — locked spec, not yet wired ──────────────────────────
// Mirrors the Supabase edge function `create-checkout-session` body
// shape exactly, plus the contact fields eveoy.com/order currently
// discards (which Phase 2 should plumb through — see ORDER_FLOW_SPEC
// "Known gaps to flag").

/**
 * The body the Supabase `create-checkout-session` edge function expects
 * TODAY. Phase 2 MCP tool will pass this through unchanged.
 */
export const CreateCheckoutSessionBody = z.object({
  customers_per_location: z.number().int().min(MIN_CUSTOMERS_PER_LOCATION).max(MAX_CUSTOMERS_PER_LOCATION),
  locations:              z.number().int().min(MIN_LOCATIONS).max(MAX_LOCATIONS),
  advancedTargeting:      AdvancedTargetingInput,
}).strict();

/**
 * The user-facing tool input for create_pilot_order. Includes the
 * contact fields the eveoy.com/order page currently collects but
 * discards (see ORDER_FLOW_SPEC #1) — when Phase 2 ships, we propose
 * extending the edge fn to accept these too and persist them on the
 * orders table. Until then, they're collected by the MCP and passed
 * as Stripe Checkout metadata (capped at 500 chars per value).
 */
export const CreatePilotOrderInput = z.object({
  // contact (matches eveoy.com/order form fields)
  your_name:     z.string().trim().min(2).max(80).describe('"Your name" on eveoy.com/order'),
  work_email:    z.string().email().max(254).describe('"Work email" on eveoy.com/order'),
  brand_website: z.string().url().max(255).describe('"Brand Website" on eveoy.com/order'),
  phone:         z.string().trim().min(7).max(30).regex(/^[+\d][\d\s().-]*$/).describe('"Phone" on eveoy.com/order'),

  // pricing inputs (wire-format names, same as the edge fn body)
  customers_per_location: z.number().int().min(MIN_CUSTOMERS_PER_LOCATION).max(MAX_CUSTOMERS_PER_LOCATION),
  locations:              z.number().int().min(MIN_LOCATIONS).max(MAX_LOCATIONS),

  // scheduling
  campaign_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
    .refine((s) => s >= earliestStartDate(), {
      message: `Campaign start must be at least ${CAMPAIGN_START_LEAD_DAYS} days from today.`,
    })
    .describe(
      `"Campaign experience start date" on eveoy.com/order. ISO date YYYY-MM-DD. ` +
        `Must be ≥ ${CAMPAIGN_START_LEAD_DAYS} days from today.`,
    ),

  // optional advanced targeting
  advancedTargeting: AdvancedTargetingInput,
}).strict();
