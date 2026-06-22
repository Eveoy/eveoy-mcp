import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CheckOrderStatusInput } from '@/mcp/schemas';
import { callEdge, edgeErrorMessage } from '@/integrations/edge';
import { assertNoSecrets } from '@/classifier/public-only';

const DESCRIPTION = `Look up the status of an Eveoy order by its Stripe Checkout session id.

Use this when the user wants to:
- Check whether an order was paid
- See the order total and size for a checkout session

Trigger phrases include: "check my order", "order status", "did my payment go through", "status of session cs_...".

Returns: { customer_email (masked), locations, customers_per_location, total_cents, status }.

Do NOT use this for: creating an order (use start_checkout) or pricing (use get_pricing). Requires the cs_... session id from a prior checkout.

Cost: free. Latency: fast. Read-only.`;

export function registerCheckOrderStatus(server: McpServer) {
  server.registerTool(
    'check_order_status',
    {
      title: 'Check Eveoy order status',
      description: DESCRIPTION,
      inputSchema: CheckOrderStatusInput.shape,
      annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
    },
    async ({ session_id }) => {
      try {
        const data = await callEdge('/get-order-summary', { session_id });
        const safe = assertNoSecrets(data, { tool: 'check_order_status' });
        return {
          content: [{ type: 'text', text: 'Order found.' }],
          structuredContent: safe as Record<string, unknown>,
        };
      } catch (err) {
        return { content: [{ type: 'text', text: edgeErrorMessage(err) }], isError: true };
      }
    },
  );
}
