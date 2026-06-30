/**
 * Runtime config — Workers pass bindings/vars to handlers, not via process.env.
 * We snapshot the values the tool/classifier layer needs into a module-global.
 *
 * IMPORTANT: McpAgent tool handlers run in the Durable Object isolate, NOT the
 * Worker fetch isolate. So setRuntimeConfig() must be called in BOTH:
 *   - the Worker fetch() handler (for the Host/Origin/CORS gate), and
 *   - EveoyMCP.init() (for tools + the edge client, which run in the DO).
 */
export interface RuntimeConfig {
  classifierStrict: boolean;
  ipHashSalt: string;
  disabledTools: Set<string>;
  canonicalHost: string;
  eveoyOrigin: string;
  // Supabase edge-function backend (the "brain"). Worker is a thin adapter.
  supabaseUrl: string;
  supabaseAnonKey: string;
  siteUrl: string;
  // OPT-IN authorization-receipt gate for irreversible actions (start_checkout).
  // Off by default — fully backward-compatible. See src/integrations/receipt.ts.
  receiptRequired: boolean;
  receiptTrustedKeys: string[];
  // Explicit NON-PRODUCTION opt-in to accept self-signed (inline-key) receipts.
  // Off by default: with no trusted keys pinned, the gate fails closed instead.
  receiptAllowInlineKey: boolean;
}

let current: RuntimeConfig = {
  classifierStrict: false,
  ipHashSalt: 'dev-only-salt-rotate-in-prod',
  disabledTools: new Set(),
  canonicalHost: 'mcp.eveoy.com',
  eveoyOrigin: 'https://www.eveoy.com',
  supabaseUrl: '',
  supabaseAnonKey: '',
  siteUrl: 'https://www.eveoy.com',
  receiptRequired: false,
  receiptTrustedKeys: [],
  receiptAllowInlineKey: false,
};

export function setRuntimeConfig(env: {
  MCP_CLASSIFIER_STRICT?: string;
  IP_HASH_SALT?: string;
  MCP_DISABLE_TOOL?: string;
  MCP_CANONICAL_HOST?: string;
  EVEOY_ORIGIN?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SITE_URL?: string;
  RECEIPT_REQUIRED?: string;
  RECEIPT_TRUSTED_KEYS?: string;
  RECEIPT_ALLOW_INLINE_KEY?: string;
}): void {
  current = {
    classifierStrict: env.MCP_CLASSIFIER_STRICT === '1',
    ipHashSalt: env.IP_HASH_SALT ?? current.ipHashSalt,
    disabledTools: new Set(
      (env.MCP_DISABLE_TOOL ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    ),
    canonicalHost: env.MCP_CANONICAL_HOST ?? current.canonicalHost,
    eveoyOrigin: env.EVEOY_ORIGIN ?? current.eveoyOrigin,
    supabaseUrl: env.SUPABASE_URL ?? current.supabaseUrl,
    supabaseAnonKey: env.SUPABASE_ANON_KEY ?? current.supabaseAnonKey,
    siteUrl: env.SITE_URL ?? current.siteUrl,
    receiptRequired: env.RECEIPT_REQUIRED === '1',
    receiptTrustedKeys: (env.RECEIPT_TRUSTED_KEYS ?? '')
      .split(',').map((s) => s.trim()).filter(Boolean),
    receiptAllowInlineKey: env.RECEIPT_ALLOW_INLINE_KEY === '1',
  };
}

export function config(): RuntimeConfig {
  return current;
}

/** Test helper — override config directly. */
export function __setConfigForTest(patch: Partial<RuntimeConfig>): void {
  current = { ...current, ...patch };
}
