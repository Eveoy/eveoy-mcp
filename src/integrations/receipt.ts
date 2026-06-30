/**
 * OPT-IN "Receipt Required" gate for irreversible agent actions.
 *
 * Built on @emilia-protocol/require-receipt (Apache-2.0): offline Ed25519
 * verification over canonical JSON — no backend, no API key, no EMILIA server
 * trusted. The gate (makeReceiptGate) encodes the easy-to-get-wrong parts in one
 * reviewed place: target binding (a receipt for one order can't drive another),
 * consume-after-success (a failed action never burns a valid approval), and
 * sanitized {reason}-only rejections.
 *
 * NON-BREAKING / OPT-IN: nothing changes unless the maintainer turns it on (set
 * RECEIPT_REQUIRED=1, see src/config.ts). With it off, gateCheckout() reports
 * `required: false` and start_checkout runs exactly as before — byte-identical.
 *
 * Spec: draft-schrock-ep-authorization-receipts (IETF Internet-Draft).
 */
import {
  makeReceiptGate,
  findActionRequirement,
  RECEIPT_REQUIRED_STATUS,
} from '@emilia-protocol/require-receipt';
import { RECEIPT_MANIFEST } from './receipt-manifest';
import { config } from '@/config';

export { RECEIPT_REQUIRED_STATUS };

const MANIFEST_URL = RECEIPT_MANIFEST.service.manifest_url;

/** One gate per action type; keeps its own one-time-consumption store. */
const gates = new Map<string, ReturnType<typeof makeReceiptGate>>();
function gateFor(req: {
  action_type: string;
  max_age_sec?: number;
  assurance_class?: string;
}): ReturnType<typeof makeReceiptGate> {
  let g = gates.get(req.action_type);
  if (!g) {
    const { receiptTrustedKeys, receiptAllowInlineKey } = config();
    g = makeReceiptGate({
      action: req.action_type,
      maxAgeSec: req.max_age_sec,
      statusCode: RECEIPT_REQUIRED_STATUS,
      manifestUrl: MANIFEST_URL,
      assuranceClass: req.assurance_class,
      // Secure by default: pin issuer SPKI key(s) via RECEIPT_TRUSTED_KEYS. Inline
      // (self-signed) keys are accepted ONLY with an explicit non-prod opt-in
      // (RECEIPT_ALLOW_INLINE_KEY); gateCheckout fails closed before reaching here
      // if neither is configured.
      trustedKeys: receiptTrustedKeys,
      allowInlineKey: receiptTrustedKeys.length === 0 && receiptAllowInlineKey,
    });
    gates.set(req.action_type, g);
  }
  return g;
}

export type GateResult =
  /** Gate is off, or this action isn't receipt-gated — run the action normally. */
  | { required: false }
  /** Receipt verified and reserved — run the action, then commit/release. */
  | { required: true; ok: true; receiptId: string; outcome: string; signer?: string; commit(): void; release(): void }
  /** Receipt missing / invalid / replayed — refuse with this challenge payload. */
  | { required: true; ok: false; status: number; body: unknown };

/**
 * Gate one start_checkout call. The receipt is bound to the SPECIFIC order via
 * `target` (e.g. customer count + work email), so an approval for one order can't
 * drive a different one.
 *
 * On a verified receipt this RESERVES it and returns commit()/release(): the
 * caller commits one-time consumption only after the side effect succeeds, and
 * releases (keeping the approval retryable) if it throws.
 */
export function gateCheckout(receipt: unknown, target: string): GateResult {
  if (!config().receiptRequired) return { required: false };

  const req = findActionRequirement(RECEIPT_MANIFEST, { protocol: 'mcp', tool: 'start_checkout' });
  if (!req || !req.receipt_required) return { required: false };

  // FAIL CLOSED: enforcement is on but no issuer key is trusted and inline keys
  // are not explicitly enabled. Refuse the checkout rather than accept a
  // self-signed receipt for a payment-creating action.
  const { receiptTrustedKeys, receiptAllowInlineKey } = config();
  if (receiptTrustedKeys.length === 0 && !receiptAllowInlineKey) {
    return {
      required: true,
      ok: false,
      status: 500,
      body: {
        rejected: { reason: 'receipt_enforcement_misconfigured' },
        detail: 'Set RECEIPT_TRUSTED_KEYS to the issuer key(s) you trust '
          + '(or RECEIPT_ALLOW_INLINE_KEY=1 for non-production demos); refusing to '
          + 'accept a self-signed receipt for checkout.',
      },
    };
  }

  const c = gateFor(req).check(receipt, { target });
  if (!c.ok) return { required: true, ok: false, status: c.status, body: c.body };
  return {
    required: true,
    ok: true,
    receiptId: c.receiptId,
    outcome: c.outcome,
    signer: c.signer,
    commit: () => gateFor(req).commit(c.receiptId),
    release: () => gateFor(req).release(c.receiptId),
  };
}
