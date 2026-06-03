import { z } from 'zod';
import { INDUSTRIES_PUBLIC } from '@/industries';
import {
  MIN_SHOPPERS_PER_LOCATION,
  MAX_SHOPPERS_PER_LOCATION,
  MIN_LOCATIONS,
  MAX_LOCATIONS,
  DEFAULT_SHOPPERS_PER_LOCATION,
  DEFAULT_LOCATIONS,
} from '@/lib/pricing';

// ─── Input schemas (mirror eveoy.com/order constraints exactly) ───

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
  shoppers_per_location: z
    .number()
    .int()
    .min(MIN_SHOPPERS_PER_LOCATION)
    .max(MAX_SHOPPERS_PER_LOCATION)
    .default(DEFAULT_SHOPPERS_PER_LOCATION)
    .describe(
      `Verified shoppers per store. Mirrors eveoy.com/order: min ${MIN_SHOPPERS_PER_LOCATION}, ` +
        `max ${MAX_SHOPPERS_PER_LOCATION}. Default ${DEFAULT_SHOPPERS_PER_LOCATION} (the "$999 pilot" config).`,
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

// ─── Output schemas ─────────────────────────────────────────────────

export const GetPricingOutput = z.object({
  shoppers_per_location: z.number().int(),
  locations: z.number().int(),
  total_customers: z.number().int(),
  unit_price_usd: z.number(),
  total_usd: z.number(),
  formatted_total: z.string(),
  matches_marketing_pilot: z.boolean(),
});

export const ListIndustriesOutput = z.object({
  industries: z.array(z.enum(INDUSTRIES_PUBLIC)),
  count: z.number().int(),
  notes: z.string(),
});

export const AskEveoyOutput = z.object({
  answer: z.string(),
  sections: z.array(z.string()),
  audience: z.string(),
});

// ─── Phase 2 — locked spec, not yet wired ───────────────────────────
// CreatePilotOrderInput mirrors eveoy.com/order field-for-field so the
// MCP never accepts a value the form would reject (or vice versa).

export const CreatePilotOrderInput = z.object({
  // contact (matches eveoy.com/order)
  your_name:     z.string().trim().min(2).max(80).describe('"Your name" on eveoy.com/order'),
  work_email:    z.string().email().max(254).describe('"Work email" on eveoy.com/order'),
  brand_website: z.string().url().max(255).describe('"Brand Website" on eveoy.com/order'),
  phone:         z.string().trim().min(7).max(30).regex(/^[+\d][\d\s().-]*$/).describe('"Phone" on eveoy.com/order'),

  // pricing inputs (the same fields the form computes the total from)
  shoppers_per_location: z.number().int().min(MIN_SHOPPERS_PER_LOCATION).max(MAX_SHOPPERS_PER_LOCATION),
  locations:             z.number().int().min(MIN_LOCATIONS).max(MAX_LOCATIONS),

  // scheduling
  campaign_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
    .describe('"Campaign experience start date" on eveoy.com/order. ISO date.'),

  // demographics — optional section on the form
  demographics: z
    .object({
      // The eveoy.com/order page renders this section as optional with no specific
      // fields visible to anonymous fetch. Keep this object loose for now; lock it
      // down field-by-field when the demographic UI is finalized.
      notes: z.string().max(500).optional(),
    })
    .strict()
    .optional(),
}).strict();
