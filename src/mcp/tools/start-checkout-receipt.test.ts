// RR-1 conformance for the OPT-IN Receipt Required gate on start_checkout.
//
//   1. missing receipt  -> refused (Receipt Required)
//   2. valid receipt    -> the checkout runs
//   3. replayed receipt -> refused (one-time consumption)
//   4. forged receipt    -> refused (signature / action-binding fails)
//
// Plus: cross-order binding (a receipt for one order can't drive another) and
// the non-breaking guarantee (gate OFF -> behavior identical to no gate).
//
// Receipts are minted locally with node:crypto (Ed25519 over EP-RECEIPT-v1
// canonical JSON) so the test needs no EMILIA backend, mirroring the upstream
// reference kit. In production these are real Face ID / passkey signoffs.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

vi.mock('@/integrations/edge', () => ({
  callEdge: vi.fn(async () => ({ url: 'https://stripe.test/pay/cs_test_1', sessionId: 'cs_test_1' })),
  edgeErrorMessage: (e: unknown) => `edge error: ${String(e)}`,
  EdgeError: class EdgeError extends Error {
    constructor(public readonly status: number, public readonly path = '', public readonly detail = '') {
      super('edge');
    }
  },
}));
vi.mock('@/integrations/crm', () => ({ logEvent: vi.fn(async () => 'accepted') }));

import { registerStartCheckout, type AuthAgent } from './start-checkout';
import { __setConfigForTest } from '@/config';

type ToolResult = {
  isError?: boolean;
  content: { type: string; text: string }[];
  structuredContent?: Record<string, unknown>;
};

function handlerFor(agent: AuthAgent) {
  const server = new McpServer({ name: 't', version: '1' });
  registerStartCheckout(server, agent);
  const internal = server as unknown as {
    _registeredTools: Record<string, { handler: (args: unknown, extra: unknown) => Promise<ToolResult> }>;
  };
  return internal._registeredTools['start_checkout'].handler;
}

const profileAgent = (): AuthAgent => ({
  state: { profile: { company_name: 'Acme', contact_name: 'Ada', work_email: 'ada@acme.com', brand_website: 'https://acme.com' } },
  getSessionId: () => 'sess',
  setState: () => {},
});

// Byte-identical to @emilia-protocol/require-receipt's EP-RECEIPT-v1 canonicalization.
const canonicalize = (v: unknown): string => (v === null || v === undefined ? JSON.stringify(v)
  : Array.isArray(v) ? `[${v.map(canonicalize).join(',')}]`
    : typeof v === 'object' ? `{${Object.keys(v as object).sort().map((k) => JSON.stringify(k) + ':' + canonicalize((v as Record<string, unknown>)[k])).join(',')}}`
      : JSON.stringify(v));

// Mint a fresh valid EP-RECEIPT-v1 bound to `action`, signed by a device key.
function issueReceipt(action: string): unknown {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
  const payload = {
    receipt_id: 'rcpt_' + crypto.randomBytes(6).toString('hex'),
    subject: 'agent:autonomous',
    created_at: new Date().toISOString(),
    claim: { action_type: action, outcome: 'allow_with_signoff', approver: 'ada@acme.com' },
  };
  const value = crypto.sign(null, Buffer.from(canonicalize(payload), 'utf8'), privateKey).toString('base64url');
  return { '@version': 'EP-RECEIPT-v1', payload, signature: { algorithm: 'Ed25519', value }, public_key: pub };
}

// The order target the gate binds to (see start-checkout.ts): `${customers}c@${locations}loc:${email}`.
// For profileAgent + { customers_per_location: 40, locations: 1 } that is "40c@1loc:ada@acme.com".
const ACTION = 'eveoy.checkout.create:40c@1loc:ada@acme.com';
const ORDER = { customers_per_location: 40, locations: 1, campaign_start_date: '2026-12-01' };

describe('start_checkout — gate OFF (default, non-breaking)', () => {
  beforeEach(() => __setConfigForTest({ receiptRequired: false, receiptTrustedKeys: [] }));

  it('runs with no receipt and no authorization in the output (byte-identical to no gate)', async () => {
    const res = await handlerFor(profileAgent())(ORDER, {});
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.checkout_url).toBe('https://stripe.test/pay/cs_test_1');
    expect(res.structuredContent?.authorization).toBeUndefined();
  });
});

describe('start_checkout — gate ON: RR-1 conformance', () => {
  beforeEach(() => __setConfigForTest({ receiptRequired: true, receiptTrustedKeys: [] }));

  it('1. missing receipt -> refused (Receipt Required)', async () => {
    const res = await handlerFor(profileAgent())(ORDER, {});
    expect(res.isError).toBe(true);
    expect(res.structuredContent?.receipt_required).toBe(true);
  });

  it('2. valid receipt -> the checkout runs (and records the authorization)', async () => {
    const res = await handlerFor(profileAgent())({ ...ORDER, authorization_receipt: issueReceipt(ACTION) }, {});
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.checkout_url).toBe('https://stripe.test/pay/cs_test_1');
    expect((res.structuredContent?.authorization as { outcome?: string })?.outcome).toBe('allow_with_signoff');
  });

  it('3. replayed receipt -> refused (one-time consumption)', async () => {
    const receipt = issueReceipt(ACTION);
    const first = await handlerFor(profileAgent())({ ...ORDER, authorization_receipt: receipt }, {});
    expect(first.isError).toBeFalsy();
    const replay = await handlerFor(profileAgent())({ ...ORDER, authorization_receipt: receipt }, {});
    expect(replay.isError).toBe(true);
    expect(replay.structuredContent?.receipt_required).toBe(true);
  });

  it('4. forged receipt -> refused (signature / action-binding fails)', async () => {
    const receipt = issueReceipt(ACTION) as { signature: { value: string } };
    receipt.signature.value = receipt.signature.value.slice(0, -4) + 'AAAA'; // tamper
    const res = await handlerFor(profileAgent())({ ...ORDER, authorization_receipt: receipt }, {});
    expect(res.isError).toBe(true);
    expect(res.structuredContent?.receipt_required).toBe(true);
  });

  it('cross-order binding: a receipt for one order cannot drive a different one', async () => {
    // Receipt approves a 40-customer order; agent tries to run a 100-customer order.
    const receiptFor40 = issueReceipt(ACTION);
    const res = await handlerFor(profileAgent())(
      { customers_per_location: 100, locations: 1, campaign_start_date: '2026-12-01', authorization_receipt: receiptFor40 },
      {},
    );
    expect(res.isError).toBe(true);
    expect(res.structuredContent?.receipt_required).toBe(true);
  });
});
