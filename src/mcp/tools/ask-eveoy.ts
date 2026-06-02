import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AskEveoyInput } from '@/mcp/schemas';
import { loadKb, pickKbForQuestion } from '@/knowledge/kb-loader';
import { assertPublic } from '@/classifier/public-only';
import { log } from '@/lib/log';

const DESCRIPTION =
  'Answer a question about Eveoy — the platform that delivers verified in-store customers ' +
  'at $24.99 each. Returns answers grounded in the public Eveoy knowledge base.';

export function registerAskEveoy(server: McpServer) {
  server.registerTool(
    'ask_eveoy',
    {
      title: 'Ask Eveoy',
      description: DESCRIPTION,
      inputSchema: AskEveoyInput.shape,
    },
    async ({ question }) => {
      const keys = pickKbForQuestion(question);
      const sections = keys.map((k) => `## From ${k}\n\n${loadKb(k)}`).join('\n\n---\n\n');

      const answer = [
        `Q: ${question}`,
        '',
        'Below is the relevant public Eveoy material — answer using only this content. ',
        'If the question asks for something not covered here, reply: ',
        '"That detail isn\'t publicly available — email brad@eycrowd.com for more."',
        '',
        '<eveoy_public_kb>',
        sections,
        '</eveoy_public_kb>',
      ].join('\n');

      const safe = assertPublic(answer, { tool: 'ask_eveoy' });
      log.info('tool.ask_eveoy.ok', { kb_keys: keys.join(',') });

      return { content: [{ type: 'text', text: safe }] };
    },
  );
}
