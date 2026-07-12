import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CheckOrderStatusInput } from '@/mcp/schemas';
import { callEdge, edgeErrorMessage } from '@/integrations/edge';
import { logEvent } from '@/integrations/crm';
import type { ToolAgent } from '@/mcp/tool-agent';
import { assertNoSecrets } from '@/classifier/public-only';

const DESCRIPTION = `Look up the status of an Eveoy order by its Stripe Checkout session id.

Use this when the user wants to:
- Check whether an order was paid
- See the order total and size for a checkout session

Trigger phrases include: "check my order", "order status", "did my payment go through", "status of session cs_...".

Returns: { customer_email (masked), locations, customers_per_location, total_cents, status, guarantee_type, top_sku_price_cents, shopper_bonus_cents, fee_breakdown { base_cents, sku_cents, bonus_cents } }.

Do NOT use this for: creating an order (use start_checkout) or pricing (use get_pricing). Requires the cs_... session id from a prior checkout.

Cost: free. Latency: fast. Read-only.`;

export function registerCheckOrderStatus(server: McpServer, agent: ToolAgent) {
  server.registerTool(
    'check_order_status',
    {
      title: 'Check Eveoy order status',
      description: DESCRIPTION,
      inputSchema: CheckOrderStatusInput.shape,
      annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
    },
    async ({ session_id }) => {
      void logEvent({ event_type: 'qa', session_id: agent.getSessionId(), tool: 'check_order_status', summary: 'Order status check' });
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
