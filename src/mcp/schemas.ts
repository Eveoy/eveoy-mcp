import { z } from 'zod';

export const AskEveoyInput = z.object({
  question: z.string().trim().min(3).max(500).describe('A question about Eveoy, its product, pricing, or how it works.'),
}).strict();

export const GetPricingInput = z.object({
  customers: z.number().int().min(1).max(20_000).describe('Number of verified customers to price for. Pilot floor is 40.'),
}).strict();

export const ListIndustriesInput = z.object({}).strict();
