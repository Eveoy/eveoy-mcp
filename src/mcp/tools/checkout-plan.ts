import type { CompanyProfile } from '@/integrations/crm';
import { stableId } from '@/lib/hash';

/** The checkout inputs relevant to resolving the no-JWT agent path. */
export interface AgentCheckoutInput {
  customers_per_location: number;
  locations: number;
  your_name?: string;
  work_email?: string;
  brand_website?: string;
  campaign_start_date?: string;
  /** v8 guarantee + fee fields — order-shaping, folded into the idempotency identity. */
  guarantee_type?: 'visit_purchase' | 'visit';
  top_sku_price_cents?: number;
  shopper_bonus_cents?: number;
  /** Paid, order-shaping targeting — folded into the idempotency identity. */
  advancedTargeting?: unknown;
}

export interface ResolvedAgentCheckout {
  your_name?: string;
  work_email?: string;
  brand_website?: string;
  campaign_start_date?: string;
  /** Required agent-path fields still absent after the profile fallback. */
  missing: string[];
  /** Deterministic + bounded; varies with every order-shaping input (size, date, targeting, buyer). */
  idempotencyKey: string;
}

/**
 * Resolve the contact fields for the no-JWT agent checkout path: take them from the
 * tool input, falling back to the company profile saved by capture_profile. Reports
 * which required fields are still missing and builds a content-stable idempotency key.
 *
 * The key hashes EVERY order-shaping input — customers/locations/date, the resolved buyer
 * email, and advancedTargeting — so a retry with identical inputs dedups, while a change
 * to targeting or a different buyer in the same session produces a distinct order (no
 * accidental dedup onto someone else's / a stale checkout). Pure (no I/O) → fully tested.
 */
export function resolveAgentCheckout(
  input: AgentCheckoutInput,
  profile: CompanyProfile | undefined,
  sessionId: string,
): ResolvedAgentCheckout {
  const your_name = input.your_name ?? profile?.contact_name;
  const work_email = input.work_email ?? profile?.work_email;
  const brand_website = input.brand_website ?? profile?.brand_website;
  const campaign_start_date = input.campaign_start_date;

  const missing: string[] = [];
  if (!your_name) missing.push('your_name');
  if (!work_email) missing.push('work_email');
  if (!brand_website) missing.push('brand_website');
  if (!campaign_start_date) missing.push('campaign_start_date');
  if (input.guarantee_type === 'visit_purchase' && input.top_sku_price_cents == null) {
    missing.push('top_sku_price_cents (required for guarantee_type "visit_purchase": the in-store SKU price in cents, 500–10000, tax included)');
  }

  const identity = stableId(
    JSON.stringify({
      customers_per_location: input.customers_per_location,
      locations: input.locations,
      campaign_start_date: campaign_start_date ?? null,
      work_email: work_email ?? null,
      guarantee_type: input.guarantee_type ?? null,
      top_sku_price_cents: input.top_sku_price_cents ?? null,
      shopper_bonus_cents: input.shopper_bonus_cents ?? null,
      advancedTargeting: input.advancedTargeting ?? null,
    }),
  );
  const idempotencyKey = `${sessionId}:checkout:${identity}`;

  return { your_name, work_email, brand_website, campaign_start_date, missing, idempotencyKey };
}
