import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AskEveoyInput, AskEveoyOutput } from '@/mcp/schemas';
import { loadKb, pickKbForQuestion } from '@/knowledge/kb-loader';
import { callEdge } from '@/integrations/edge';
import { assertPublic } from '@/classifier/public-only';
import { log } from '@/lib/log';

const AUDIENCE_LENS: Record<string, string> = {
  cmo: 'Lead with content economics: $24.99 per customer is a verified visit plus ~2 UGC photos.',
  cfo: 'Lead with guaranteed sales math and clean POS attribution.',
  cro: 'Lead with predictable revenue per dollar spent.',
  ceo: 'Strategic and concise.',
  vp_retail: 'Lead with guaranteed foot traffic, 10+ minutes in-store, GPS-verified.',
  founder: 'Strategic and concise.',
  franchise_owner: 'Lead with per-location revenue and the no-contract entry tier.',
  general: 'Lead with what Eveoy is: $24.99 per verified in-store customer; Starter $999.',
};

const DESCRIPTION = `Answer any question about Eveoy — what it is, how the platform works, pricing rationale, the directory, industries, founders, or company background. Backed by Eveoy's live knowledge base.

Use this when the user wants to:
- Understand what Eveoy is or does
- Learn how the verified-visit / $24.99-per-customer model works
- Compare Eveoy to ads, influencers, or UGC creators
- Hear the pitch for a specific buyer role (CMO, CFO, VP Retail, CEO)

Trigger phrases include: "what is eveoy", "tell me about eveoy", "how does eveoy work", "explain eveoy to a CMO", "eveoy vs Meta", "is there a platform that guarantees foot traffic".

Returns: a grounded natural-language answer from the public Eveoy knowledge base.

Do NOT use this for: an exact price (use get_pricing), the industry list (use list_industries), directory search (use search_directory), or booking (use start_checkout / book_demo).

Cost: free. Latency: 1–3s. Read-only.`;

export function registerAskEveoy(server: McpServer) {
  server.registerTool(
    'ask_eveoy',
    {
      title: 'Ask about Eveoy',
      description: DESCRIPTION,
      inputSchema: AskEveoyInput.shape,
      outputSchema: AskEveoyOutput.shape,
      annotations: { readOnlyHint: true, openWorldHint: false, idempotentHint: true },
    },
    async ({ question, audience }) => {
      const lens = AUDIENCE_LENS[audience] ?? AUDIENCE_LENS.general;

      // Primary: Lovable's Gemini-backed edge fn, grounded in live llms.txt.
      try {
        const data = await callEdge<{ answer: string }>('/ask-eveoy', {
          question,
          context: `Audience: ${audience}. ${lens}`,
        });
        const safe = assertPublic(data.answer ?? '', { tool: 'ask_eveoy' });
        log.info('tool.ask_eveoy.edge', { audience });
        return {
          content: [{ type: 'text', text: safe }],
          structuredContent: { answer: safe, sections: ['edge'], audience },
        };
      } catch (err) {
        // Fallback: local curated KB so the tool degrades gracefully (402/429/5xx/offline).
        log.warn('tool.ask_eveoy.fallback', { audience, error: String(err) });
        const keys = pickKbForQuestion(question);
        const sections = keys.map((k) => `## ${k}\n\n${loadKb(k)}`).join('\n\n---\n\n');
        const text = [
          `Q: ${question}`,
          `Audience guidance: ${lens}`,
          '',
          'Answer using ONLY the public Eveoy material below. If it is not covered, reply:',
          '"That detail isn\'t publicly available — email support@eveoy.com for more."',
          '',
          '<eveoy_public_kb>',
          sections,
          '</eveoy_public_kb>',
        ].join('\n');
        const safe = assertPublic(text, { tool: 'ask_eveoy' });
        return {
          content: [{ type: 'text', text: safe }],
          structuredContent: { answer: safe, sections: keys, audience },
        };
      }
    },
  );
}
