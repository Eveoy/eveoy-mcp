import { createHmac } from 'node:crypto';
import { config } from '@/config';

/**
 * Hash an IP with a rotating salt before logging or rate-limit keying.
 * The raw IP never leaves this function. node:crypto is available on
 * Workers via the nodejs_compat flag.
 */
export function hashIp(ip: string | null | undefined): string {
  if (!ip) return 'unknown';
  return createHmac('sha256', config().ipHashSalt).update(ip).digest('base64url').slice(0, 16);
}

/** Extract the client IP from Cloudflare / proxy headers. */
export function extractIp(headers: Headers): string | null {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip')
  );
}
