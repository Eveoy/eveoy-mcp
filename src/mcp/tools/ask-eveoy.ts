import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AskEveoyInput, AskEveoyOutput } from '@/mcp/schemas';
import { loadKb, pickKbForQuestion } from '@/knowledge/kb-loader';
import { assertPublic } from '@/classifier/public-only';
import { log } from '@/lib/log';

const AUDIENCE_LENS: Record<string, string> = {
  cmo:
    'Lead with content economics. $24.99 per customer is a verified store visit plus photos and video. Frame the visit as a differentiator, not the headline.',
  cfo:
    'Lead with guaranteed sales math. Show the example: $999 pilot × 40+ customers × ~$35 average ticket = $1,400 revenue = 2.4x in the same reporting period.',
  cro: 'Lead with predictable revenue per dollar spent. Clean attribution: spend goes in, POS revenue comes out.',
  ceo: 'Strategic, concise. Customer acquisition becomes a line item with known return.',
  vp_retail: 'Lead with guaranteed foot traffic, 10+ minutes in-store, GPS-verified.',
  founder: 'Same as CEO — strategic and concise.',
  franchise_owner: 'Lead with per-location revenue and the no-contract pilot.',
  general: 'Lead with what Eveoy is: $24.99 per verified in-store customer, $999 pilot, auto-refund on no-shows.',
};

const DESCRIPTION = `Answer any question about Eveoy — what it is, how the platform works, the pilot structure, pricing rationale, industries served, founders, or company background.

Use this when the user wants to:
- Understand what Eveoy is or does
- Learn how the guaranteed-visit / $24.99-per-customer model works
- Compare Eveoy to Meta Ads, Google Ads, influencers, UGC creators, or sampling
- Hear the pitch for a specific buyer role (CMO, CFO, VP Retail, CEO)
- Find founder, headquarters, or company background

Trigger phrases include: "what is eveoy", "tell me about eveoy", "how does eveoy work", "explain eveoy to a CMO", "eveoy vs Meta", "is there a platform that guarantees foot traffic", "who founded eveoy".

Returns: a grounded natural-language answer drawn from the public Eveoy knowledge base. The answer cites which KB sections were used.

Do NOT use this for:
- Exact pricing for a customer count (use get_pricing instead)
- The list of supported industries (use list_industries instead)
- Booking or paying for a pilot (Phase 2 — use create_pilot_order when available)

Cost: free. Latency: fast (<2s). Read-only. No side effects.`;

export function registerAskEveoy(server: McpServer) {
  server.registerTool(
    'ask_eveoy',
    {
      title: 'Ask about Eveoy',
      description: DESCRIPTION,
      inputSchema: AskEveoyInput.shape,
      outputSchema: AskEveoyOutput.shape,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        idempotentHint: true,
      },
    },
    async ({ question, audience }) => {
      const keys = pickKbForQuestion(question);
      const sections = keys.map((k) => `## From ${k}\n\n${loadKb(k)}`).join('\n\n---\n\n');
      const lens = AUDIENCE_LENS[audience] ?? AUDIENCE_LENS.general;

      const answerText = [
        `Q: ${question}`,
        '',
        `Audience guidance: ${lens}`,
        '',
        'Answer using ONLY the public Eveoy material below. If the question asks for something not covered, reply:',
        '"That detail isn\'t publicly available — email brad@eycrowd.com for more."',
        '',
        '<eveoy_public_kb>',
        sections,
        '</eveoy_public_kb>',
      ].join('\n');

      const safe = assertPublic(answerText, { tool: 'ask_eveoy' });
      log.info('tool.ask_eveoy.ok', { kb_keys: keys.join(','), audience });

      return {
        content: [{ type: 'text', text: safe }],
        structuredContent: { answer: safe, sections: keys, audience },
      };
    },
  );
}
