import type { CompanyProfile } from '@/integrations/crm';

/** The checkout inputs relevant to resolving the no-JWT agent path. */
export interface AgentCheckoutInput {
  customers_per_location: number;
  locations: number;
  your_name?: string;
  work_email?: string;
  brand_website?: string;
  campaign_start_date?: string;
}

export interface ResolvedAgentCheckout {
  your_name?: string;
  work_email?: string;
  brand_website?: string;
  campaign_start_date?: string;
  /** Required agent-path fields still absent after the profile fallback. */
  missing: string[];
  /** Deterministic per (session × checkout config) so retries dedup the order + the CRM event. */
  idempotencyKey: string;
}

/**
 * Resolve the contact fields for the no-JWT agent checkout path: take them from the
 * tool input, falling back to the company profile saved by capture_profile. Reports
 * which required fields are still missing and builds a content-stable idempotency key.
 * Pure (no I/O) so it is fully unit-tested.
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

  const idempotencyKey = `${sessionId}:checkout:${input.customers_per_location}x${input.locations}:${campaign_start_date ?? 'na'}`;

  return { your_name, work_email, brand_website, campaign_start_date, missing, idempotencyKey };
}
