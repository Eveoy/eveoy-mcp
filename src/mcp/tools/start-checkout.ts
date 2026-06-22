import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StartCheckoutInput } from '@/mcp/schemas';
import { priceFor } from '@/lib/pricing';
import { callEdge, edgeErrorMessage } from '@/integrations/edge';
import { assertNoSecrets } from '@/classifier/public-only';

const DESCRIPTION = `Create an Eveoy checkout — returns a Stripe Checkout URL for the user to complete payment. Pricing mirrors eveoy.com/order ($24.99 per customer; Starter/Proof/Rollout).

Use this when the user has decided to buy and confirmed the size:
- They picked a customer count (and optionally locations) and want to pay
- Trigger phrases: "book a pilot", "start checkout", "buy the Starter pilot", "let's order 100 customers", "create the order"

Returns: { checkout_url, session_id, total, customers }. The user completes payment on Stripe's hosted page; no charge happens until they do.

Do NOT use this for: price exploration (use get_pricing first) or order status (use check_order_status). Always confirm the customer count, locations, and total with the user before calling — this creates a real checkout session.

Cost: free to call. Latency: 2–5s. Creates a Stripe Checkout session (no charge until the user pays). Confirm first.`;

export function registerStartCheckout(server: McpServer) {
  server.registerTool(
    'start_checkout',
    {
      title: 'Start an Eveoy checkout',
      description: DESCRIPTION,
      inputSchema: StartCheckoutInput.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true, idempotentHint: false },
    },
    async ({ customers_per_location, locations, advancedTargeting }) => {
      // Local price for the confirmation line; the edge fn recomputes server-side.
      const p = priceFor({ customersPerLocation: customers_per_location, locations });
      try {
        // Guard the raw edge response (semi-trusted) BEFORE we trust its fields.
        const data = assertNoSecrets(
          await callEdge<{ url: string; sessionId: string }>('/create-checkout-session', {
            locations,
            customers_per_location,
            advancedTargeting: advancedTargeting ?? null,
          }),
          { tool: 'start_checkout' },
        );
        if (typeof data !== 'object' || data === null || typeof data.url !== 'string') {
          return { content: [{ type: 'text', text: 'Checkout could not be created. Please try again.' }], isError: true };
        }
        const out = {
          checkout_url: data.url,
          session_id: data.sessionId,
          total: p.total_usd,
          customers: p.total_customers,
        };
        return {
          content: [{
            type: 'text',
            text: `Checkout ready for ${p.total_customers} customers (${p.total_usd}). Complete payment: ${data.url}`,
          }],
          structuredContent: out,
        };
      } catch (err) {
        return { content: [{ type: 'text', text: edgeErrorMessage(err) }], isError: true };
      }
    },
  );
}
