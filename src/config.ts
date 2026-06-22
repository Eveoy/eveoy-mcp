/**
 * Runtime config — Workers pass bindings/vars to the fetch handler, not via
 * process.env. We snapshot the values the pure-logic layer needs into a
 * module-global at the top of every request (idempotent within an isolate),
 * so classifier/ipc/register can stay platform-agnostic and unit-testable.
 */
export interface RuntimeConfig {
  classifierStrict: boolean;
  ipHashSalt: string;
  disabledTools: Set<string>;
  canonicalHost: string;
  eveoyOrigin: string;
}

let current: RuntimeConfig = {
  classifierStrict: false,
  ipHashSalt: 'dev-only-salt-rotate-in-prod',
  disabledTools: new Set(),
  canonicalHost: 'mcp.eveoy.com',
  eveoyOrigin: 'https://eveoy.com',
};

/** Call once per request, before dispatching to the MCP agent. */
export function setRuntimeConfig(env: {
  MCP_CLASSIFIER_STRICT?: string;
  IP_HASH_SALT?: string;
  MCP_DISABLE_TOOL?: string;
  MCP_CANONICAL_HOST?: string;
  EVEOY_ORIGIN?: string;
}): void {
  current = {
    classifierStrict: env.MCP_CLASSIFIER_STRICT === '1',
    ipHashSalt: env.IP_HASH_SALT ?? current.ipHashSalt,
    disabledTools: new Set(
      (env.MCP_DISABLE_TOOL ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    ),
    canonicalHost: env.MCP_CANONICAL_HOST ?? current.canonicalHost,
    eveoyOrigin: env.EVEOY_ORIGIN ?? current.eveoyOrigin,
  };
}

export function config(): RuntimeConfig {
  return current;
}

/** Test helper — override config directly. */
export function __setConfigForTest(patch: Partial<RuntimeConfig>): void {
  current = { ...current, ...patch };
}
