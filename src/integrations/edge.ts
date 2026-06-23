import { config } from '@/config';
import { log } from '@/lib/log';

/**
 * Thin client for Eveoy's Supabase edge functions (the "brain").
 * The Worker holds ONLY the publishable anon key — every real secret
 * (Stripe, Beehiiv, service-role, Lovable) stays inside the edge function.
 *
 * Contract: docs/API_CONTRACTS.md.
 */

export class EdgeError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    public readonly detail: string,
  ) {
    super(`${path} ${status}: ${detail}`);
    this.name = 'EdgeError';
  }
}

export async function callEdge<T = unknown>(path: string, body: unknown): Promise<T> {
  const { supabaseUrl, supabaseAnonKey } = config();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new EdgeError(503, path, 'backend not configured (SUPABASE_URL / SUPABASE_ANON_KEY missing)');
  }
  const url = `${supabaseUrl}/functions/v1${path}`;
  let r: Response;
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    log.error('edge.unreachable', { path, error: String(err) });
    throw new EdgeError(502, path, 'backend unreachable');
  }

  const text = await r.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!r.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    log.warn('edge.error', { path, status: r.status });
    throw new EdgeError(r.status, path, detail.slice(0, 200));
  }
  return data as T;
}

/**
 * Map an EdgeError to a user-facing MCP message. Surfaces 402/429 distinctly
 * so the model knows whether to retry or tell the user.
 */
export function edgeErrorMessage(err: unknown): string {
  if (err instanceof EdgeError) {
    if (err.status === 401) return 'Sign-in required for this action. Complete it at https://eveoy.com/order (or eveoy.com sign-in).';
    if (err.status === 402) return 'That capability is temporarily unavailable (service credits). Please try again later or email support@eveoy.com.';
    if (err.status === 429) return 'Rate limited upstream — please retry in a few seconds.';
    if (err.status === 404) return 'Not found.';
    if (err.status === 400) return `Invalid request: ${err.detail}`;
    if (err.status === 503) return 'The Eveoy backend is not configured for this server yet.';
    return 'The Eveoy service had a problem handling that. Please try again, or email support@eveoy.com.';
  }
  return 'Unexpected error. Please try again.';
}
