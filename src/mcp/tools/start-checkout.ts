import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StartCheckoutInput } from '@/mcp/schemas';
import { priceFor } from '@/lib/pricing';
import { config } from '@/config';

// As of 2026-06-23 the Supabase `create-checkout-session` edge fn requires
// Authorization: Bearer <Supabase JWT> (401 without). The MCP can't obtain a
// user JWT until the OAuth handoff (eveoy.com /auth → /mcp-link → callback) is
// wired into the Worker (Phase 2b). Until then, start_checkout does NOT call the
// edge fn anonymously (that always 401s); it returns the computed price and
// routes the user to eveoy.com/order to sign in and complete checkout in-browser
// — the safe, working path (the human pays on Stripe's hosted page).

const DESCRIPTION = `Start an Eveoy checkout. Computes the price ($24.99/customer; mirrors eveoy.com/order) and returns the secure checkout link where the user signs in and pays.

Use this when the user has decided to buy and confirmed the size:
- They picked a customer count (and optionally locations) and want to check out
- Trigger phrases: "book a pilot", "start checkout", "buy the Starter pilot", "let's order 100 customers", "how do I pay"

Returns: { customers, locations, total, order_url }. Send the user to order_url to sign in and complete payment (no charge until they pay on Stripe's hosted page).

Do NOT use this for: price-only questions (use get_pricing) or order status (use check_order_status). Confirm the customer count and total with the user first.

Cost: free. Latency: <100ms. Read-only (returns a link; payment happens in the browser).`;

export function registerStartCheckout(server: McpServer) {
  server.registerTool(
    'start_checkout',
    {
      title: 'Start an Eveoy checkout',
      description: DESCRIPTION,
      inputSchema: StartCheckoutInput.shape,
      annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
    },
    async ({ customers_per_location, locations }) => {
      const p = priceFor({ customersPerLocation: customers_per_location, locations });
      const orderUrl = `${config().siteUrl}/order`;
      return {
        content: [{
          type: 'text',
          text: `${p.total_customers} customers across ${p.locations} location${p.locations === 1 ? '' : 's'} = ${p.total_usd} ($24.99 each). ` +
            `Complete checkout (sign in + pay securely) at ${orderUrl}. No charge until you pay on Stripe's hosted page.`,
        }],
        structuredContent: {
          customers: p.total_customers,
          locations: p.locations,
          total: p.total_usd,
          order_url: orderUrl,
        },
      };
    },
  );
}
