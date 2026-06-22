import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAskEveoy } from './tools/ask-eveoy';
import { registerGetPricing } from './tools/get-pricing';
import { registerListIndustries } from './tools/list-industries';
import { registerListMetros } from './tools/list-metros';
import { registerGetAppLink } from './tools/get-app-link';
import { registerBookDemo } from './tools/book-demo';
import { registerSearchDirectory } from './tools/search-directory';
import { registerGetBusiness } from './tools/get-business';
import { registerCheckOrderStatus } from './tools/check-order-status';
import { registerSubscribeNewsletter } from './tools/subscribe-newsletter';
import { registerClaimBusiness } from './tools/claim-business';
import { registerStartCheckout } from './tools/start-checkout';
import { registerKbResources } from './resources/kb';
import { registerPitchForRolePrompt } from './prompts/pitch-for-role';
import { registerPilotScopeIntakePrompt } from './prompts/pilot-scope-intake';
import { registerEveoyPriceQuotePrompt } from './prompts/eveoy-price-quote';
import { registerEveoyObjectionHandlePrompt } from './prompts/eveoy-objection-handle';
import { config } from '@/config';
import { log } from '@/lib/log';

type Registration = { name: string; register: (s: McpServer) => void };

const TOOLS: Registration[] = [
  // Read — static / local
  { name: 'ask_eveoy',            register: registerAskEveoy },        // proxies /ask-eveoy, local KB fallback
  { name: 'get_pricing',          register: registerGetPricing },
  { name: 'list_industries',      register: registerListIndustries },
  { name: 'list_metros',          register: registerListMetros },
  { name: 'get_app_link',         register: registerGetAppLink },
  { name: 'book_demo',            register: registerBookDemo },
  // Read — Supabase edge fns
  { name: 'search_directory',     register: registerSearchDirectory }, // /directory-query
  { name: 'get_business',         register: registerGetBusiness },     // /directory-business
  { name: 'check_order_status',   register: registerCheckOrderStatus },// /get-order-summary
  // Write — Supabase edge fns (anon + rate-limited; confirm-hint annotations)
  { name: 'subscribe_newsletter', register: registerSubscribeNewsletter }, // /subscribe-beehiiv
  { name: 'claim_business',       register: registerClaimBusiness },       // /unlock-business
  { name: 'start_checkout',       register: registerStartCheckout },       // /create-checkout-session
  // Pending Lovable: get_case_studies (source TBD)
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
  const disabled = config().disabledTools;
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
