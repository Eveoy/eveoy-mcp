import { DENY_RULES, type DenyRule } from './denylist';
import { classifierStrict } from '@/lib/env';
import { log } from '@/lib/log';

export interface ClassifierResult {
  ok: boolean;
  hits: { id: string; reason: string }[];
}

const PUBLIC_FALLBACK =
  "That detail isn't publicly available. For specifics, please email brad@eycrowd.com.";

/**
 * Inspect a payload for denylisted patterns. Pure check — no side effects.
 */
export function classify(value: unknown): ClassifierResult {
  const text = stringify(value);
  const hits: ClassifierResult['hits'] = [];
  for (const rule of DENY_RULES) {
    if (rule.pattern.test(text)) {
      hits.push({ id: rule.id, reason: rule.reason });
    }
  }
  return { ok: hits.length === 0, hits };
}

/**
 * Fail-closed guard. Use at every tool boundary BEFORE returning to client.
 *
 * Default mode: redact the offending payload, return a generic message,
 * and emit a SIEM event.
 *
 * Strict mode (MCP_CLASSIFIER_STRICT=1): throw — the request fails entirely.
 */
export function assertPublic<T>(value: T, context: { tool?: string; resource?: string } = {}): T {
  const result = classify(value);
  if (result.ok) return value;

  for (const hit of result.hits) {
    log.warn('classifier.redaction', {
      rule_id: hit.id,
      reason: hit.reason,
      tool: context.tool ?? null,
      resource: context.resource ?? null,
    });
  }

  if (classifierStrict()) {
    throw new ClassifierViolation(result.hits.map((h) => h.id).join(','));
  }

  // Soft-fail: replace the payload entirely. We DO NOT attempt partial redaction
  // because surrounding context could still leak signal.
  return PUBLIC_FALLBACK as unknown as T;
}

export class ClassifierViolation extends Error {
  constructor(public readonly ruleIds: string) {
    super(`Response failed public-only classification: ${ruleIds}`);
    this.name = 'ClassifierViolation';
  }
}

function stringify(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export { PUBLIC_FALLBACK, DENY_RULES };
export type { DenyRule };
