import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';

let cached: Redis | null = null;
let warned = false;

/**
 * Returns an Upstash Redis client when configured, else null.
 * Callers must handle null (e.g., rate limiter degrades to allow-all in dev).
 */
export function redis(): Redis | null {
  if (cached) return cached;
  const e = env();
  if (!e.UPSTASH_REDIS_REST_URL || !e.UPSTASH_REDIS_REST_TOKEN) {
    if (!warned && e.NODE_ENV === 'production') {
      console.warn('[redis] Upstash credentials missing — sessions and rate limits disabled');
      warned = true;
    }
    return null;
  }
  cached = new Redis({ url: e.UPSTASH_REDIS_REST_URL, token: e.UPSTASH_REDIS_REST_TOKEN });
  return cached;
}
