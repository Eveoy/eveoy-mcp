import { config } from '@/config';
import { classifyForCrm } from '@/classifier/public-only';
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
 *  - Never silent: every terminal failure is logged so a broken CRM pipeline is
 *    detectable (404 = crm-log not deployed yet → warn; a real high-intent drop → error).
 *  - Sanitized with classifyForCrm: blocks real secrets (sk_/rk_/whsec_/JWT/bearer) but
 *    allows the agent's first-party contact info AND ordinary business words in free text.
 *  - Idempotent: each event carries an `event_id`; `crm-log` dedups on it. Callers may
 *    pass a deterministic/content-derived id for high-intent events; else a uuid is used.
 *  - At-least-once for high-intent: one retry on timeout/failure (dedup-safe).
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
  /** Bounded to primitives — keeps the schema-as-defense discipline on this surface. */
  metadata?: Record<string, string | number | boolean>;
  /** Optional deterministic/content-derived dedup key; falls back to a uuid. */
  event_id?: string;
}

/** Coarse outcome of a logEvent call. NEVER thrown — returned so callers can be honest. */
export type CrmResult = 'accepted' | 'skipped' | 'failed';

const TIMEOUT_MS = 1500;

async function post(
  url: string,
  key: string,
  payload: unknown,
): Promise<{ ok: boolean; status: number | null; error?: string }> {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { ok: r.ok, status: r.status };
  } catch (err) {
    return { ok: false, status: null, error: String(err) };
  }
}

/**
 * Log a CRM event. Resolves fast; NEVER throws. Returns a coarse status so callers
 * (e.g. capture_profile) can word their confirmation honestly instead of promising
 * follow-up that didn't happen.
 */
export async function logEvent(event: CrmEvent): Promise<CrmResult> {
  const { supabaseUrl, supabaseAnonKey } = config();
  if (!supabaseUrl || !supabaseAnonKey) {
    log.info('crm.skipped_unwired', { event_type: event.event_type });
    return 'skipped'; // backend not wired yet
  }

  const verdict = classifyForCrm(event);
  if (!verdict.ok) {
    // Observable so an over-broad denylist eating real leads is detectable, not silent.
    log.warn('crm.blocked_event', {
      event_type: event.event_type,
      tool: event.tool,
      rule_ids: verdict.hits.map((h) => h.id).join(','),
    });
    return 'skipped';
  }

  const payload = { ...event, event_id: event.event_id ?? crypto.randomUUID() };
  const url = `${supabaseUrl}/functions/v1/crm-log`;

  let res = await post(url, supabaseAnonKey, payload);
  if (res.ok) return 'accepted';

  if (HIGH_INTENT.has(event.event_type)) {
    res = await post(url, supabaseAnonKey, payload); // at-least-once; crm-log dedups on event_id
    if (res.ok) return 'accepted';
  }

  // Terminal failure — always logged. 404 = crm-log not deployed yet (expected pre-launch).
  const ctx = {
    event_type: event.event_type,
    tool: event.tool,
    status: res.status,
    error: res.error,
    event_id: payload.event_id,
  };
  if (res.status === 404) log.warn('crm.endpoint_absent', ctx);
  else if (HIGH_INTENT.has(event.event_type)) log.error('crm.high_intent_dropped', ctx);
  else log.warn('crm.event_dropped', ctx);
  return 'failed';
}
