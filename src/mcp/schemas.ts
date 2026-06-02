import { z } from 'zod';
import { INDUSTRIES_PUBLIC } from '@/industries';

// ─── Input schemas ─────────────────────────────────────────────────

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
  customers: z
    .number()
    .int()
    .min(1)
    .max(20_000)
    .describe(
      'Number of verified in-store customer visits to price. Parse from natural language: ' +
        "'200 customers', '500 people', 'a pilot for 100 visits' all → integer. " +
        'Sub-pilot counts (<40) snap to the $999 pilot floor.',
    ),
}).strict();

export const ListIndustriesInput = z.object({}).strict();

// ─── Output schemas (advertise via tool.outputSchema) ──────────────

export const GetPricingOutput = z.object({
  customers: z.number().int().describe('Effective customer count after pilot-floor snap.'),
  unit_price_usd: z.number().describe('Per-customer price in USD ($24.99).'),
  total_usd: z.number().describe('Total price in USD.'),
  formatted_total: z.string().describe('Pre-formatted USD string for display.'),
  tier: z
    .enum(['pilot_999', 'pilot_2500', 'pilot_10000', 'pilot_25000', 'custom_quote'])
    .describe('Nearest published tier; custom_quote routes to brad@eycrowd.com.'),
  pilot_floor_honored: z.boolean().describe('True when the request was snapped up to the pilot floor.'),
});

export const ListIndustriesOutput = z.object({
  industries: z.array(z.enum(INDUSTRIES_PUBLIC)).describe('All public Eveoy industry sectors (23+).'),
  count: z.number().int(),
  notes: z.string(),
});

export const AskEveoyOutput = z.object({
  answer: z.string(),
  sections: z.array(z.string()).describe('KB section keys used to ground the answer.'),
  audience: z.string(),
});
