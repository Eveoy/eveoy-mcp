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
  /** Shared secret for crm-log (X-MCP-Secret header). Empty = not armed. */
  mcpWebhookSecret: string;
  siteUrl: string;
}

let current: RuntimeConfig = {
  classifierStrict: false,
  ipHashSalt: 'dev-only-salt-rotate-in-prod',
  disabledTools: new Set(),
  canonicalHost: 'mcp.eveoy.com',
  eveoyOrigin: 'https://www.eveoy.com',
  supabaseUrl: '',
  supabaseAnonKey: '',
  mcpWebhookSecret: '',
  siteUrl: 'https://www.eveoy.com',
};

export function setRuntimeConfig(env: {
  MCP_CLASSIFIER_STRICT?: string;
  IP_HASH_SALT?: string;
  MCP_DISABLE_TOOL?: string;
  MCP_CANONICAL_HOST?: string;
  EVEOY_ORIGIN?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  MCP_WEBHOOK_SECRET?: string;
  SITE_URL?: string;
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
    mcpWebhookSecret: env.MCP_WEBHOOK_SECRET ?? current.mcpWebhookSecret,
    siteUrl: env.SITE_URL ?? current.siteUrl,
  };
}

export function config(): RuntimeConfig {
  return current;
}

/** Test helper — override config directly. */
export function __setConfigForTest(patch: Partial<RuntimeConfig>): void {
  current = { ...current, ...patch };
}
