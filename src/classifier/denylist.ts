/**
 * Denylist of patterns and exact strings that MUST NOT appear in any MCP
 * response. Anything sourced from §10–15 of the internal about-eveoy KB
 * lives here.
 *
 * To add a new pattern: append below, add a unit test in
 * src/classifier/tests/classifier.test.ts, then deploy.
 *
 * NOTE: keep this list versioned in git so changes are auditable.
 */

export interface DenyRule {
  id: string;
  pattern: RegExp;
  reason: string;
}

const word = (s: string) => new RegExp(`\\b${s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i');

export const DENY_RULES: DenyRule[] = [
  // ─── Internal project / product names ───────────────────────────
  { id: 'internal.project_y',         pattern: word('Project Y'),                reason: 'internal data initiative' },
  { id: 'internal.project_coach',     pattern: word('Project Coach'),            reason: 'internal AI roadmap' },
  { id: 'internal.eyla_builder',      pattern: /\bEyLa\b/i,                       reason: 'internal codename for campaign builder' },
  { id: 'internal.coach_loop',        pattern: word('Coach Loop'),               reason: 'internal AI workflow' },
  { id: 'internal.42_touchpoints',    pattern: /\b42\s+(advocate\s+)?touchpoints\b/i, reason: 'internal AI metric' },

  // ─── Financial internals ────────────────────────────────────────
  { id: 'financial.burn',             pattern: word('burn rate'),                reason: 'company financial' },
  { id: 'financial.preseries',        pattern: /\bpre[- ]?series\s*a\b/i,         reason: 'fundraising stage' },
  { id: 'financial.runway',           pattern: word('runway'),                   reason: 'financial metric' },
  { id: 'financial.85k_burn',         pattern: /\$\s*85[,.]?000\s*\/?\s*(month|mo)/i, reason: 'monthly burn figure' },
  { id: 'financial.1_2m',             pattern: /\$\s*1[\.,]2m/i,                  reason: 'raise size' },
  { id: 'financial.margin_internal',  pattern: /35[-–]40\s*%\s*margin/i,          reason: 'internal margin band' },
  { id: 'financial.355m',             pattern: /\$\s*355\s*[mM]/,                 reason: 'internal investment figure' },
  { id: 'financial.355k_hours',       pattern: /355[,.]?000\+?\s*man[- ]hours/i,  reason: 'internal investment figure' },

  // ─── Partner / investor / channel names (internal) ──────────────
  { id: 'partner.nob',                pattern: word('NOB Marketing'),            reason: 'KSA partner under NDA' },
  { id: 'partner.foaj',               pattern: word('Foaj Group'),               reason: 'KSA prospect' },
  { id: 'partner.sol',                pattern: /\bSOL consultancy\b/i,            reason: 'KSA advisor' },
  { id: 'partner.barq',               pattern: /\bBarq\b/i,                       reason: 'payment infra eval' },
  { id: 'partner.tiqmo',              pattern: /\bTiqmo\b/i,                      reason: 'payment infra eval' },
  { id: 'partner.family_offices',     pattern: word('family offices'),           reason: 'investor source' },
  { id: 'partner.ksa_entity',         pattern: word('Eveoy Technology Company'),  reason: 'KSA legal entity name' },
  { id: 'partner.aws_ula',            pattern: /AWS Marketplace\s+(?:.*\s+)?ULA/i, reason: 'partnership contract detail' },

  // ─── Operational internals (sales activity) ─────────────────────
  { id: 'ops.4_per_week',             pattern: /\b4\s+campaign\s+inquir(?:ies|y)\s+per\s+week\b/i, reason: 'internal pipeline metric' },
  { id: 'ops.710_agencies',           pattern: /\b710\+?\s+LA\s+marketing\s+agencies\b/i, reason: 'internal outreach metric' },
  { id: 'ops.103_executives',         pattern: /\b103\+?\s+executives\s+responded\b/i, reason: 'internal outreach metric' },
  { id: 'ops.meetings_per_week',      pattern: /\b30[-–]40\s+meetings\s+per\s+week\b/i, reason: 'internal pipeline' },

  // ─── Internal CAC figures ───────────────────────────────────────
  { id: 'cac.shopper',                pattern: /shopper\s+(?:acquisition\s+)?cost.{0,30}\$\s*1\.50/i, reason: 'internal CAC' },
  { id: 'cac.client',                 pattern: /client\s+(?:acquisition\s+)?cost.{0,30}\$\s*150/i,    reason: 'internal CAC' },

  // ─── Roadmap / phasing (internal) ───────────────────────────────
  { id: 'roadmap.q2_2026',            pattern: /Phase\s*2\s*\(Q2\s*2026\)/i,      reason: 'internal roadmap' },
  { id: 'roadmap.q3_2026',            pattern: /Q3\s*2026.*automation/i,          reason: 'internal roadmap' },
  { id: 'roadmap.q4_rollout',         pattern: /Q4\s*2026.*rollout/i,             reason: 'internal roadmap' },

  // ─── Internal sales playbook language (§13–14) ──────────────────
  { id: 'playbook.dont_lead',         pattern: /(?:do\s*n[o']t|don't|never)\s+lead\s+with/i, reason: 'internal sales guidance' },
  { id: 'playbook.121_roundtables',   pattern: /\b121\s+B2C\s+(?:retail\s+and\s+CPG\s+)?brand\s+roundtables\b/i, reason: 'internal research source' },
  { id: 'playbook.icp_messaging',     pattern: /ICP[- ]specific\s+messaging\s+guide/i, reason: 'internal playbook' },

  // ─── Secret prefixes ────────────────────────────────────────────
  { id: 'secret.stripe_secret',       pattern: /\bsk_[A-Za-z0-9_-]{8,}/,          reason: 'stripe secret key' },
  { id: 'secret.stripe_restricted',   pattern: /\brk_[A-Za-z0-9_-]{8,}/,          reason: 'stripe restricted key' },
  { id: 'secret.stripe_webhook',      pattern: /\bwhsec_[A-Za-z0-9_-]{8,}/,       reason: 'stripe webhook secret' },
  { id: 'secret.stripe_publishable_live', pattern: /\bpk_live_[A-Za-z0-9_-]{8,}/, reason: 'stripe publishable live key' },
  { id: 'secret.jwt',                 pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, reason: 'JWT token' },
  { id: 'secret.bearer',              pattern: /\bBearer\s+[A-Za-z0-9._-]{16,}/,  reason: 'bearer token' },

  // ─── Internal network shapes ────────────────────────────────────
  { id: 'net.rfc1918_10',             pattern: /\b10(?:\.\d{1,3}){3}\b/,           reason: 'internal IP' },
  { id: 'net.rfc1918_192',            pattern: /\b192\.168(?:\.\d{1,3}){2}\b/,    reason: 'internal IP' },
  { id: 'net.rfc1918_172',            pattern: /\b172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}\b/, reason: 'internal IP' },
  { id: 'net.metadata',               pattern: /169\.254\.169\.254/,              reason: 'cloud metadata service' },
  { id: 'net.loopback',               pattern: /\b127(?:\.\d{1,3}){3}\b/,         reason: 'loopback' },

  // ─── PII shape (non-Eveoy emails) ───────────────────────────────
  // Flag any non-eveoy.com/eycrowd.com email — guards against leaking
  // contact data captured in lead forms.
  { id: 'pii.foreign_email',          pattern: /[A-Za-z0-9._%+-]+@(?!(?:eveoy|eycrowd)\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i, reason: 'non-public email' },
];
