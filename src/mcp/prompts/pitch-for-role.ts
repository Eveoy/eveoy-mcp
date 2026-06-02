import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const ROLE_LENS: Record<string, string> = {
  CMO:
    'Lead with content economics. $24.99 per customer is a verified store visit plus photos and video — content budgets stretch 10x further than influencer or studio shoots. The visit is a differentiator, not the headline.',
  VP_Retail:
    'Lead with guaranteed foot traffic. $24.99 per verified visit, GPS-confirmed, 15+ minutes in-store. The photos are a bonus.',
  CFO:
    'Lead with guaranteed sales math. $24.99 per confirmed customer. At a $35 average ticket × 40 guaranteed sales = $1,400 revenue on a $999 pilot = 2.4x return same reporting period. Predictable line item, clean attribution.',
  CEO:
    'Lead with predictable growth. $999 pilot → 40+ customers → ~$1,400 revenue → 2.4x. Scales linearly. Turns customer acquisition from a bet into a line item.',
};

export function registerPitchForRolePrompt(server: McpServer) {
  server.registerPrompt(
    'pitch_for_role',
    {
      title: 'Pitch Eveoy for a specific buyer role',
      description: 'Produces a short, role-appropriate Eveoy pitch for one of CMO / VP_Retail / CFO / CEO.',
      argsSchema: {
        role: z.enum(['CMO', 'VP_Retail', 'CFO', 'CEO']).describe('Buyer role'),
        company_name: z.string().min(1).max(100).optional().describe('Optional company name to personalize'),
      },
    },
    ({ role, company_name }) => {
      const lens = ROLE_LENS[role] ?? ROLE_LENS.CMO;
      const text = [
        `Pitch Eveoy to a ${role.replace('_', ' ')}${company_name ? ` at ${company_name}` : ''}.`,
        '',
        'Guidance for this audience:',
        lens,
        '',
        'Keep it under 120 words. Mention the $999 pilot for 40+ customers as the lowest-friction close.',
        'Anchor on auto-refund. Do not invent metrics outside the public Eveoy knowledge base.',
      ].join('\n');
      return {
        messages: [{ role: 'user', content: { type: 'text', text } }],
      };
    },
  );
}
