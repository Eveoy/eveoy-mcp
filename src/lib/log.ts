/**
 * Structured logger with PII guards.
 *
 * NEVER pass: raw user input, tool arg values (notes/email/name), tool result bodies,
 * OAuth tokens, Stripe object bodies, full IPs, full emails.
 * Pass instead: hashes, schema names, status, latency, scopes.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: string | number | boolean | null | undefined;
}

const SECRET_PATTERNS = [
  /sk_[A-Za-z0-9_-]{8,}/g,
  /rk_[A-Za-z0-9_-]{8,}/g,
  /whsec_[A-Za-z0-9_-]{8,}/g,
  /pk_(?:live|test)_[A-Za-z0-9_-]{8,}/g,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
];

function scrub(value: unknown): string {
  let s = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  for (const pat of SECRET_PATTERNS) s = s.replace(pat, '[REDACTED]');
  return s;
}

function emit(level: LogLevel, event: string, ctx?: LogContext) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(ctx ? Object.fromEntries(Object.entries(ctx).map(([k, v]) => [k, scrub(v)])) : {}),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (event: string, ctx?: LogContext) => emit('debug', event, ctx),
  info: (event: string, ctx?: LogContext) => emit('info', event, ctx),
  warn: (event: string, ctx?: LogContext) => emit('warn', event, ctx),
  error: (event: string, ctx?: LogContext) => emit('error', event, ctx),
};
