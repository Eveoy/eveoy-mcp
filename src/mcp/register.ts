import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAskEveoy } from './tools/ask-eveoy';
import { registerGetPricing } from './tools/get-pricing';
import { registerListIndustries } from './tools/list-industries';
import { registerKbResources } from './resources/kb';
import { registerPitchForRolePrompt } from './prompts/pitch-for-role';
import { registerPilotScopeIntakePrompt } from './prompts/pilot-scope-intake';
import { registerEveoyPriceQuotePrompt } from './prompts/eveoy-price-quote';
import { registerEveoyObjectionHandlePrompt } from './prompts/eveoy-objection-handle';
import { disabledTools } from '@/lib/env';
import { log } from '@/lib/log';

type Registration = { name: string; register: (s: McpServer) => void };

const TOOLS: Registration[] = [
  { name: 'ask_eveoy',      register: registerAskEveoy },
  { name: 'get_pricing',    register: registerGetPricing },
  { name: 'list_industries',register: registerListIndustries },
  // Phase 2: { name: 'create_pilot_order', register: registerCreatePilotOrder },
  // Phase 2: { name: 'check_order_status', register: registerCheckOrderStatus },
];

const RESOURCE_GROUPS: Registration[] = [
  { name: 'kb', register: registerKbResources },
];

const PROMPTS: Registration[] = [
  { name: 'pitch_for_role',         register: registerPitchForRolePrompt },
  { name: 'pilot_scope_intake',     register: registerPilotScopeIntakePrompt },
  { name: 'eveoy_price_quote',      register: registerEveoyPriceQuotePrompt },
  { name: 'eveoy_objection_handle', register: registerEveoyObjectionHandlePrompt },
];

export function registerAll(server: McpServer): void {
  const disabled = disabledTools();
  for (const t of TOOLS) {
    if (disabled.has(t.name)) {
      log.warn('tool.disabled', { tool: t.name });
      continue;
    }
    t.register(server);
  }
  for (const r of RESOURCE_GROUPS) r.register(server);
  for (const p of PROMPTS) p.register(server);
  log.info('mcp.registered', {
    tools: TOOLS.filter((t) => !disabled.has(t.name)).map((t) => t.name).join(','),
    prompts: PROMPTS.map((p) => p.name).join(','),
  });
}
