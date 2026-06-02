import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const OBJECTIONS_HINT: Record<string, string> = {
  too_expensive:
    'Compare $24.99 to à la carte ($165–$530+ per equivalent outcome) and to influencer/UGC ($100–$10K with zero guarantee). Lead with the auto-refund.',
  cant_measure:
    'Anchor on the receipt model: GPS-verified visit, 15+ min in-store, AI-quality-rated content, POS-correlated revenue. 10,247 receipts issued YTD, 0 fake clicks billed.',
  not_in_my_industry:
    'Run the list_industries tool. 23+ sectors served including specialty retail, apparel, F&B, beauty, pet, hospitality. Mechanics are sector-agnostic.',
  brand_safety:
    "≥4.0/5 AI quality rating + brand-safety review on every piece. Brand owns content forever. Auto-refund on off-brand photos.",
  no_attribution:
    'Per-customer GPS + dwell + task completion + content quality scoring on every visit. POS reconciliation available. Revenue shows up in the same reporting period as spend.',
  too_small_a_pilot:
    'The $999 pilot is by design — sub-procurement threshold, proves the mechanic on one market. Linear scaling at $24.99/customer to whatever volume the buyer is ready for.',
};

export function registerEveoyObjectionHandlePrompt(server: McpServer) {
  server.registerPrompt(
    'eveoy_objection_handle',
    {
      title: 'Eveoy: handle a sales objection',
      description:
        'Generate a tight, evidence-backed response to a common Eveoy buyer objection. ' +
        'Pass the objection slug and (optionally) the buyer role.',
      argsSchema: {
        objection: z
          .enum([
            'too_expensive',
            'cant_measure',
            'not_in_my_industry',
            'brand_safety',
            'no_attribution',
            'too_small_a_pilot',
          ])
          .describe('Objection category. Use ask_eveoy if the objection is none of these.'),
        role: z.enum(['CMO', 'CFO', 'VP_Retail', 'CEO', 'general']).optional(),
      },
    },
    ({ objection, role }) => {
      const hint = OBJECTIONS_HINT[objection] ?? '';
      const audience = role ?? 'general';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: [
                `Respond to the Eveoy buyer objection "${objection}" for a ${audience} audience.`,
                '',
                'Internal hint (do not quote verbatim):',
                hint,
                '',
                'Write a 2–4 sentence response that:',
                '  • acknowledges the concern in one phrase',
                '  • answers with one concrete proof point from the public Eveoy knowledge base',
                '  • closes with a single CTA — the $999 pilot or an ask_eveoy / get_pricing follow-up',
                '',
                'Do not invent numbers. Use ask_eveoy or get_pricing if you need specifics.',
              ].join('\n'),
            },
          },
        ],
      };
    },
  );
}
