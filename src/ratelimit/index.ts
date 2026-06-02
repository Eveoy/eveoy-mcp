import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/integrations/redis';
import { log } from '@/lib/log';

export interface RateLimitVerdict {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const ALLOW_ALL: RateLimitVerdict = { allowed: true, limit: 999, remaining: 999, reset: 0 };

const limiters = new Map<string, Ratelimit>();

function limiterFor(name: string, tokens: number, window: `${number} ${'s' | 'm' | 'h' | 'd'}`): Ratelimit | null {
  const r = redis();
  if (!r) return null;
  const key = `${name}:${tokens}:${window}`;
  let l = limiters.get(key);
  if (!l) {
    l = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(tokens, window),
      analytics: false,
      prefix: `rl:${name}`,
    });
    limiters.set(key, l);
  }
  return l;
}

export async function checkLimit(
  name: string,
  identifier: string,
  tokens: number,
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`,
): Promise<RateLimitVerdict> {
  const l = limiterFor(name, tokens, window);
  if (!l) return ALLOW_ALL;
  try {
    const r = await l.limit(identifier);
    return { allowed: r.success, limit: r.limit, remaining: r.remaining, reset: r.reset };
  } catch (err) {
    log.error('ratelimit.error', { name, error: String(err) });
    return ALLOW_ALL; // fail open on Redis outage — better than denying all traffic
  }
}

export async function checkReadAnonymous(ipHash: string): Promise<RateLimitVerdict> {
  return checkLimit('read-anon', ipHash, 30, '1 m');
}

export async function checkReadAuthed(subjectHash: string): Promise<RateLimitVerdict> {
  return checkLimit('read-auth', subjectHash, 120, '1 m');
}
