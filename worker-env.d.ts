/**
 * Cloudflare Worker bindings + vars. Mirrors wrangler.jsonc.
 * Regenerate canonically with `npm run cf-typegen` once authed.
 */
import type { DurableObjectNamespace, KVNamespace, Fetcher } from '@cloudflare/workers-types';

export interface Env {
  // Bindings
  MCP_OBJECT: DurableObjectNamespace;
  ASSETS: Fetcher;
  CACHE: KVNamespace;
  MCP_LIMIT: RateLimit;

  // Vars (wrangler.jsonc)
  MCP_CANONICAL_HOST: string;
  EVEOY_ORIGIN: string;
  MCP_CLASSIFIER_STRICT: string;

  // Secrets (wrangler secret put)
  IP_HASH_SALT?: string;
}

/** Cloudflare Rate Limiting binding (GA). */
export interface RateLimit {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}
