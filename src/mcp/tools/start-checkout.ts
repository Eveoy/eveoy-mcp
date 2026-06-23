import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StartCheckoutInput } from '@/mcp/schemas';
import { priceFor } from '@/lib/pricing';
import { callEdge, edgeErrorMessage, EdgeError } from '@/integrations/edge';
import { buildSignInUrl } from '@/auth/link';

/**
 * Authenticated checkout. The Supabase create-checkout-session edge fn requires a
 * signed-in user's JWT. We read it from this session's Durable Object state (set
 * out-of-band by the /link sign-in handoff). No JWT → return a sign-in URL.
 */
export interface AuthAgent {
  state: { jwt?: string; jwtExp?: number } | undefined;
  getSessionId(): string;
  setState(s: { jwt?: string; jwtExp?: number }): void;
}

const DESCRIPTION = `Create an authenticated Eveoy checkout. Pricing mirrors eveoy.com/order ($24.99/customer; Starter/Proof/Rollout). Requires the user to be signed in.

Use this when the user has decided to buy and confirmed the size:
- They picked a customer count (and optionally locations) and want to pay
- Trigger phrases: "book a pilot", "start checkout", "buy the Starter pilot", "let's order 100 customers"

Returns: if signed in → { checkout_url, session_id, total, customers } (pay on Stripe's hosted page; no charge until then). If NOT signed in → { requires_signin: true, sign_in_url } — give the user that link, they sign in, then call this again.

Do NOT use this for: price-only questions (use get_pricing) or order status (use check_order_status). Confirm the customer count and total with the user first.

Cost: free to call. Latency: 2–5s when signed in. Creates a real checkout session (no charge until the user pays). Confirm first.`;

export function registerStartCheckout(server: McpServer, agent: AuthAgent) {
  server.registerTool(
    'start_checkout',
    {
      title: 'Start an Eveoy checkout',
      description: DESCRIPTION,
      inputSchema: StartCheckoutInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: false },
    },
    async ({ customers_per_location, locations, advancedTargeting }) => {
      const p = priceFor({ customersPerLocation: customers_per_location, locations });
      const st = agent.state ?? {};
      const signedIn = Boolean(st.jwt) && (!st.jwtExp || st.jwtExp * 1000 > Date.now() + 30_000);

      if (!signedIn) {
        const url = buildSignInUrl(agent.getSessionId());
        return {
          content: [{
            type: 'text',
            text: `Checkout for ${p.total_customers} customers (${p.total_usd}) needs you signed in. ` +
              `Sign in here: ${url} — then ask me to start checkout again.`,
          }],
          structuredContent: { requires_signin: true, sign_in_url: url, total: p.total_usd, customers: p.total_customers },
        };
      }

      try {
        const data = await callEdge<{ url: string; sessionId: string }>(
          '/create-checkout-session',
          { locations, customers_per_location, advancedTargeting: advancedTargeting ?? null },
          st.jwt,
        );
        if (typeof data?.url !== 'string') {
          return { content: [{ type: 'text', text: 'Checkout could not be created. Please try again.' }], isError: true };
        }
        return {
          content: [{
            type: 'text',
            text: `Checkout ready for ${p.total_customers} customers (${p.total_usd}). Complete payment: ${data.url}`,
          }],
          structuredContent: { checkout_url: data.url, session_id: data.sessionId, total: p.total_usd, customers: p.total_customers },
        };
      } catch (err) {
        if (err instanceof EdgeError && err.status === 401) {
          agent.setState({ jwt: undefined, jwtExp: undefined }); // stored token rejected/expired
          const url = buildSignInUrl(agent.getSessionId());
          return {
            content: [{ type: 'text', text: `Your sign-in expired. Sign in again: ${url} — then retry checkout.` }],
            structuredContent: { requires_signin: true, sign_in_url: url },
          };
        }
        return { content: [{ type: 'text', text: edgeErrorMessage(err) }], isError: true };
      }
    },
  );
}
