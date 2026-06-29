export interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Soft rate limiting on the edge-native Rate Limit binding (atomic).
 *  - Per-IP backstop, keyed by the hashed client IP (covers the initialize request,
 *    which has no session id yet).
 *  - Per-session limit, keyed by Mcp-Session-Id once a session is established — caps a
 *    single agent session's request rate independently of its IP.
 *
 * NOTE: this deliberately uses the Rate Limit binding, not KV. KV throttles writes to the
 * same key to ~1/sec, so a KV per-request counter cannot count burst traffic (the increments
 * fail and the count never rises) — it would be a rate limiter that doesn't limit.
 *
 * Returns false to reject (429). Fails OPEN (returns true) when the binding is absent
 * (local dev) or the limiter errors, matching the prior behavior.
 */
export async function checkRateLimits(
  limiter: RateLimiter | undefined,
  ipHash: string,
  sessionId: string | null,
): Promise<boolean> {
  if (!limiter) return true;
  try {
    if (!(await limiter.limit({ key: `ip:${ipHash}` })).success) return false;
    if (sessionId && !(await limiter.limit({ key: `sess:${sessionId}` })).success) return false;
    return true;
  } catch {
    return true; // fail-open on limiter error
  }
}
