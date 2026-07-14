import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StartCheckoutInput } from '@/mcp/schemas';
import { quoteFor } from '@/lib/pricing';
import { callEdge, edgeErrorMessage, EdgeError } from '@/integrations/edge';
import { logEvent, type CompanyProfile } from '@/integrations/crm';
import { resolveAgentCheckout } from './checkout-plan';
import { log } from '@/lib/log';

/**
 * Agent-native checkout. Primary path needs NO sign-in: the agent supplies contact
 * fields (or we reuse the profile saved by capture_profile), we generate an idempotency
 * key, and the Supabase create-checkout-session edge fn's no-JWT agent path returns a
 * Stripe payment link + creates a Zoho Deal. If the user happens to be signed in (a JWT
 * is in session state from the /link handoff), we use the authenticated path instead.
 * On the agent path we logEvent('checkout_started') → crm-log (Activity + Cliq).
 */
export interface AuthAgent {
  state: { jwt?: string; jwtExp?: number; profile?: CompanyProfile } | undefined;
  getSessionId(): string;
  setState(s: { jwt?: string; jwtExp?: number; profile?: CompanyProfile }): void;
}

const DESCRIPTION = `Create an Eveoy checkout and return a payment link. Pricing mirrors the order page: $24.99 per verified customer base, plus two options — a guaranteed purchase (guarantee_type "visit_purchase": every shopper buys your chosen SKU at your register; you add the SKU price in cents, tax included, $5–$100, at cost — no item fee) and a shopper bonus ($20–$200 per shopper, 33% platform fee on the bonus only — the only platform fee; every $20 = +1 photo and +1 social set per shopper, max +3 each). Omit guarantee_type for a visit-only order. The server recomputes the total — what get_pricing quotes is exactly what Stripe charges. Works for agents directly — no sign-in required.

Use this when the user has decided to buy and confirmed the size:
- They picked a customers-per-location count (and optionally locations, guarantee, SKU price, bonus) and want to pay
- Trigger phrases: "buy a pilot", "start checkout", "place an order", "let's order 100 customers with a guaranteed purchase"

Provide your_name, work_email, brand_website, and campaign_start_date (at least 14 days out) — or call capture_profile first and I will reuse your saved details, then I only need campaign_start_date. For a guaranteed purchase also provide top_sku_price_cents.

Returns: { checkout_url, session_id, total, customers, guarantee_type, fee_breakdown } — pay on Stripe's hosted page; no charge until then.

Do NOT use this for: price-only questions (use get_pricing), saving your company (use capture_profile), or order status (use check_order_status). Confirm the customer count, guarantee choice, and total with the user first.

Cost: free to call. Latency: 2-5s. Creates a real checkout session and a CRM deal (no charge until the user pays). Confirm first.`;

function validJwt(st: { jwt?: string; jwtExp?: number }): boolean {
  return Boolean(st.jwt) && (!st.jwtExp || st.jwtExp * 1000 > Date.now() + 30_000);
}

export function registerStartCheckout(server: McpServer, agent: AuthAgent) {
  server.registerTool(
    'start_checkout',
    {
      title: 'Start an Eveoy checkout',
      description: DESCRIPTION,
      inputSchema: StartCheckoutInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: false },
    },
    async (input) => {
      const { customers_per_location, locations, advancedTargeting, guarantee_type, top_sku_price_cents, shopper_bonus_cents } = input;
      let p;
      try {
        p = quoteFor({
          customersPerLocation: customers_per_location,
          locations,
          guaranteeType: guarantee_type,
          topSkuPriceCents: top_sku_price_cents,
          shopperBonusCents: shopper_bonus_cents,
        });
      } catch (err) {
        return {
          content: [{ type: 'text' as const, text: err instanceof Error ? err.message : 'Invalid checkout inputs.' }],
          isError: true,
        };
      }
      const st = agent.state ?? {};
      const session = agent.getSessionId();
      // The edge fn treats an omitted guarantee_type as the legacy visit-only path
      // and IGNORES sku/bonus there — so send explicit v8 fields only when the
      // agent opted into them, and always together.
      const v8Fields = guarantee_type
        ? {
            guarantee_type,
            top_sku_price_cents: guarantee_type === 'visit_purchase' ? top_sku_price_cents : null,
            shopper_bonus_cents: shopper_bonus_cents ?? 0,
          }
        : shopper_bonus_cents
          ? { guarantee_type: 'visit' as const, top_sku_price_cents: null, shopper_bonus_cents }
          : {};

      let data: { url?: string; sessionId?: string } | undefined;

      if (validJwt(st)) {
        // Signed-in user → authenticated path (the edge fn derives contact from the JWT).
        try {
          data = await callEdge(
            '/create-checkout-session',
            { locations, customers_per_location, advancedTargeting: advancedTargeting ?? null, ...v8Fields },
            st.jwt,
          );
        } catch (err) {
          if (err instanceof EdgeError && err.status === 401) {
            agent.setState({ ...st, jwt: undefined, jwtExp: undefined });
            return {
              content: [{
                type: 'text',
                text: 'Your sign-in expired. Ask me to start checkout again and I can proceed without sign-in — ' +
                  'have your work email and a campaign start date (at least 14 days out) ready, or call capture_profile first.',
              }],
              isError: true,
            };
          }
          return { content: [{ type: 'text', text: edgeErrorMessage(err) }], isError: true };
        }
      } else {
        // Agent path (no JWT). Resolve contact from input, falling back to the captured profile.
        const r = resolveAgentCheckout(input, st.profile, session);
        if (r.missing.length) {
          return {
            content: [{
              type: 'text',
              text: `To start checkout without signing in I need: ${r.missing.join(', ')}. ` +
                'Tip: call capture_profile first to save your name, work email, and website — then I only need a ' +
                'campaign start date (YYYY-MM-DD, at least 14 days out).',
            }],
            isError: true,
          };
        }
        try {
          data = await callEdge('/create-checkout-session', {
            locations,
            customers_per_location,
            your_name: r.your_name,
            work_email: r.work_email,
            brand_website: r.brand_website,
            campaign_start_date: r.campaign_start_date,
            phone: input.phone,
            idempotency_key: r.idempotencyKey,
            session_id: session,
            advancedTargeting: advancedTargeting ?? null,
            ...v8Fields,
          });
        } catch (err) {
          return { content: [{ type: 'text', text: edgeErrorMessage(err) }], isError: true };
        }
        await logEvent({
          event_type: 'checkout_started',
          session_id: session,
          tool: 'start_checkout',
          summary: `Checkout started: ${p.total_customers} customers (${p.total_usd}, ${p.guarantee_type}) — ${r.work_email}`,
          event_id: r.idempotencyKey,
          metadata: {
            customers: p.total_customers,
            total_usd: p.total_usd,
            locations,
            guarantee_type: p.guarantee_type,
            top_sku_price_cents: p.top_sku_price_cents ?? 0,
            shopper_bonus_cents: p.shopper_bonus_cents,
            total_cents: p.total_cents,
          },
        });
      }

      if (!data || typeof data.url !== 'string') {
        // Partial success: a session (and Zoho Deal) exist but the payment link is missing
        // (idempotency hit / Stripe URL retrieval failure). Retrying dedups to the same dead
        // end, so steer the user to recover by reference — and make it observable.
        if (data?.sessionId) {
          log.error('checkout.url_missing_session_exists', { session, sessionId: data.sessionId });
          return {
            content: [{
              type: 'text',
              text: `Your checkout session was created (reference ${data.sessionId}) but the secure payment link ` +
                `could not be retrieved. Do not start over — that would not create a new order. Email ` +
                `support@eveoy.com with that reference to get your payment link.`,
            }],
            structuredContent: { session_id: data.sessionId, url_unavailable: true },
            isError: true,
          };
        }
        log.error('checkout.empty_response', { session });
        return { content: [{ type: 'text', text: 'Checkout could not be created. Please try again.' }], isError: true };
      }
      const guaranteeLine =
        p.guarantee_type === 'visit_purchase'
          ? ` — guaranteed visit + purchase (SKU at cost included, no item fee)`
          : ` — guaranteed visit only`;
      const bonusLine = p.shopper_bonus_cents > 0 ? `, shopper bonus included (+33% fee)` : '';
      return {
        content: [{
          type: 'text',
          text: `Checkout ready for ${p.total_customers} customers (${p.total_usd}${guaranteeLine}${bonusLine}). Complete payment: ${data.url}`,
        }],
        structuredContent: {
          checkout_url: data.url,
          session_id: data.sessionId,
          total: p.total_usd,
          customers: p.total_customers,
          guarantee_type: p.guarantee_type,
          fee_breakdown: {
            base_cents: p.base_cents,
            sku_cents: p.sku_cents,
            bonus_cents: p.bonus_cents,
          },
        },
      };
    },
  );
}
