import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StartCheckoutInput } from '@/mcp/schemas';
import { priceFor } from '@/lib/pricing';
import { callEdge, edgeErrorMessage, EdgeError } from '@/integrations/edge';
import { logEvent, type CompanyProfile } from '@/integrations/crm';
import { resolveAgentCheckout } from './checkout-plan';

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

const DESCRIPTION = `Create an Eveoy checkout and return a payment link. Pricing mirrors the order page ($24.99 per verified customer; Starter/Proof/Rollout). Works for agents directly — no sign-in required.

Use this when the user has decided to buy and confirmed the size:
- They picked a customers-per-location count (and optionally locations) and want to pay
- Trigger phrases: "buy a pilot", "start checkout", "place an order", "let's order 100 customers"

Provide your_name, work_email, brand_website, and campaign_start_date (at least 14 days out) — or call capture_profile first and I will reuse your saved details, then I only need campaign_start_date.

Returns: { checkout_url, session_id, total, customers } — pay on Stripe's hosted page; no charge until then.

Do NOT use this for: price-only questions (use get_pricing), saving your company (use capture_profile), or order status (use check_order_status). Confirm the customer count and total with the user first.

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
      const { customers_per_location, locations, advancedTargeting } = input;
      const p = priceFor({ customersPerLocation: customers_per_location, locations });
      const st = agent.state ?? {};
      const session = agent.getSessionId();

      let data: { url?: string; sessionId?: string } | undefined;

      if (validJwt(st)) {
        // Signed-in user → authenticated path (the edge fn derives contact from the JWT).
        try {
          data = await callEdge(
            '/create-checkout-session',
            { locations, customers_per_location, advancedTargeting: advancedTargeting ?? null },
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
          });
        } catch (err) {
          return { content: [{ type: 'text', text: edgeErrorMessage(err) }], isError: true };
        }
        await logEvent({
          event_type: 'checkout_started',
          session_id: session,
          tool: 'start_checkout',
          summary: `Checkout started: ${p.total_customers} customers (${p.total_usd}) — ${r.work_email}`,
          event_id: r.idempotencyKey,
          metadata: { customers: p.total_customers, total_usd: p.total_usd, locations },
        });
      }

      if (!data || typeof data.url !== 'string') {
        return { content: [{ type: 'text', text: 'Checkout could not be created. Please try again.' }], isError: true };
      }
      return {
        content: [{
          type: 'text',
          text: `Checkout ready for ${p.total_customers} customers (${p.total_usd}). Complete payment: ${data.url}`,
        }],
        structuredContent: {
          checkout_url: data.url,
          session_id: data.sessionId,
          total: p.total_usd,
          customers: p.total_customers,
        },
      };
    },
  );
}
