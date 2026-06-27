import { config } from '@/config';
import { classify, PII_RULE_IDS } from '@/classifier/public-only';
import { log } from '@/lib/log';

/**
 * CRM logging → the Supabase `crm-log` edge fn (which writes Zoho Activities/Leads
 * and fires Zoho Cliq on high-intent events). See docs/PLAN_sales-rep-mcp.md.
 *
 * Design constraints:
 *  - NEVER blocks or fails a tool. We do an awaited POST with a 1.5s timeout and
 *    swallow every error. `crm-log` MUST fast-ack (202) and do the slow Zoho/Cliq
 *    work in its own background — because inside a Durable Object `ctx.waitUntil`
 *    is a no-op and a bare un-awaited fetch can be canceled on eviction.
 *  - Payload is sanitized with the no-secrets classifier: it blocks secrets/internal
 *    data but ALLOWS the first-party contact email/phone the agent supplied
 *    (assertPublic's foreign-email rule would otherwise drop every profile/checkout
 *    event). We DECIDE-then-skip rather than redact, so a hit drops the whole event.
 *  - Idempotent: each event carries an `event_id`; `crm-log` dedups on it. Callers
 *    may pass a deterministic id for high-intent events so agent double-fires dedup;
 *    otherwise a uuid is generated (covers the internal retry).
 *  - At-least-once for high-intent: one retry on timeout/failure.
 */

export type CrmEventType =
  | 'qa'
  | 'pricing'
  | 'directory'
  | 'app_link'
  | 'newsletter'
  | 'profile_captured'
  | 'demo_booked'
  | 'checkout_started'
  | 'order_paid'
  | 'human_requested';

const HIGH_INTENT: ReadonlySet<CrmEventType> = new Set([
  'profile_captured',
  'demo_booked',
  'checkout_started',
  'order_paid',
  'human_requested',
]);

/** First-party business-contact profile the agent supplies (→ Zoho Lead). No consumer PII. */
export interface CompanyProfile {
  company_name: string;
  brand_website?: string;
  sector?: string;
  locations?: number;
  contact_name?: string;
  work_email?: string;
  goals?: string;
}

export interface CrmEvent {
  event_type: CrmEventType;
  session_id: string;
  tool: string;
  summary: string;
  agent_id?: string;
  profile?: CompanyProfile;
  metadata?: Record<string, unknown>;
  /** Optional deterministic dedup key; falls back to a uuid. */
  event_id?: string;
}

const TIMEOUT_MS = 1500;

async function post(url: string, key: string, payload: unknown): Promise<boolean> {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Log a CRM event. Resolves fast; NEVER throws. Any failure (backend not wired,
 * timeout, network) is swallowed so a tool's response is never blocked or broken.
 */
export async function logEvent(event: CrmEvent): Promise<void> {
  const { supabaseUrl, supabaseAnonKey } = config();
  if (!supabaseUrl || !supabaseAnonKey) return; // backend not wired yet → no-op

  // Block secrets/internal data; allow the first-party contact email/phone the agent
  // intentionally provided (PII_RULE_IDS excludes the foreign-email rule).
  if (!classify(event, PII_RULE_IDS).ok) {
    log.warn('crm.blocked_event', { event_type: event.event_type, tool: event.tool });
    return;
  }

  const payload = { ...event, event_id: event.event_id ?? crypto.randomUUID() };
  const url = `${supabaseUrl}/functions/v1/crm-log`;

  const ok = await post(url, supabaseAnonKey, payload);
  // At-least-once for high-intent — crm-log dedups on event_id, so a retry is safe.
  if (!ok && HIGH_INTENT.has(event.event_type)) {
    await post(url, supabaseAnonKey, payload);
  }
}
