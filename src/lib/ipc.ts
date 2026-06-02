import { createHmac } from 'node:crypto';
import { env } from './env';

/**
 * Hash an IP address with a rotating salt before logging or rate-limit keying.
 * The raw IP never leaves this function.
 */
export function hashIp(ip: string | null | undefined): string {
  const salt = env().IP_HASH_SALT ?? 'dev-only-salt-rotate-in-prod';
  if (!ip) return 'unknown';
  return createHmac('sha256', salt).update(ip).digest('base64url').slice(0, 16);
}

export function extractIp(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return headers.get('x-real-ip');
}
