/**
 * Minimal types for @emilia-protocol/require-receipt (Apache-2.0), which ships
 * as untyped ESM. Covers only the surface used by src/integrations/receipt.ts.
 */
declare module '@emilia-protocol/require-receipt' {
  export const RECEIPT_REQUIRED_STATUS: number;

  export interface ActionRequirement {
    action_type: string;
    receipt_required?: boolean;
    assurance_class?: string;
    max_age_sec?: number;
    [k: string]: unknown;
  }

  export function findActionRequirement(
    manifest: unknown,
    selector?: { protocol?: string; tool?: string; action_type?: string },
  ): ActionRequirement | null;

  export interface ReceiptGateOptions {
    action: string | ((target: unknown) => string);
    trustedKeys?: string[];
    allowInlineKey?: boolean;
    maxAgeSec?: number;
    allowedOutcomes?: string[];
    statusCode?: number;
    manifestUrl?: string;
    assuranceClass?: string;
    store?: { has(id: string): boolean; add(id: string): void };
  }

  export type GateCheck =
    | { ok: true; receiptId: string; outcome: string; signer?: string; subject?: string; boundAction: string }
    | { ok: false; status: number; body: unknown };

  export interface ReceiptGate {
    check(receipt: unknown, ctx?: { target?: unknown }): GateCheck;
    commit(receiptId: string): void;
    release(receiptId: string): void;
    run<T>(
      receipt: unknown,
      ctx: { target?: unknown } | ((c: unknown) => Promise<T>),
      fn?: (c: unknown) => Promise<T>,
    ): Promise<{ ok: true; receiptId: string; outcome: string; signer?: string; result: T } | { ok: false; status: number; body: unknown }>;
    boundActionFor(target: unknown): string;
  }

  export function makeReceiptGate(opts: ReceiptGateOptions): ReceiptGate;
}
