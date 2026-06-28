import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAskEveoy } from './tools/ask-eveoy';
import { registerGetPricing } from './tools/get-pricing';
import { registerListIndustries } from './tools/list-industries';
import { registerListMetros } from './tools/list-metros';
import { registerGetAppLink } from './tools/get-app-link';
import { registerSearchDirectory } from './tools/search-directory';
import { registerGetBusiness } from './tools/get-business';
import { registerGetCaseStudies } from './tools/get-case-studies';
import { registerCheckOrderStatus } from './tools/check-order-status';
import { registerSubscribeNewsletter } from './tools/subscribe-newsletter';
import { registerClaimBusiness } from './tools/claim-business';
import { registerKbResources } from './resources/kb';
import { registerPitchForRolePrompt } from './prompts/pitch-for-role';
import { registerPilotScopeIntakePrompt } from './prompts/pilot-scope-intake';
import { registerEveoyPriceQuotePrompt } from './prompts/eveoy-price-quote';
import { registerEveoyObjectionHandlePrompt } from './prompts/eveoy-objection-handle';
import { registerRecommendPilotPrompt } from './prompts/recommend-pilot';
import { config } from '@/config';
import { log } from '@/lib/log';
import type { ToolAgent } from './tool-agent';

// Every register fn receives the session agent so any tool can log activity; tools
// that don't log simply ignore it (a (server)-only fn is assignable to this type).
type Registration = { name: string; register: (s: McpServer, agent: ToolAgent) => void };

const TOOLS: Registration[] = [
  // Read — static / local
  { name: 'ask_eveoy',            register: registerAskEveoy },        // proxies /ask-eveoy, local KB fallback
  { name: 'get_pricing',          register: registerGetPricing },
  { name: 'list_industries',      register: registerListIndustries },
  { name: 'list_metros',          register: registerListMetros },
  { name: 'get_app_link',         register: registerGetAppLink },
  { name: 'get_case_studies',     register: registerGetCaseStudies },  // eveoy.com/newsletter sitemap (links only)
  // Read — Supabase edge fns
  { name: 'search_directory',     register: registerSearchDirectory }, // /directory-query
  { name: 'get_business',         register: registerGetBusiness },     // /directory-business
  { name: 'check_order_status',   register: registerCheckOrderStatus },// /get-order-summary
  // Write — Supabase edge fns (anon + rate-limited; confirm-hint annotations)
  { name: 'subscribe_newsletter', register: registerSubscribeNewsletter }, // /subscribe-beehiiv
  { name: 'claim_business',       register: registerClaimBusiness },       // /unlock-business
  // start_checkout, capture_profile, and book_demo are registered separately in
  // EveoyMCP.init() — they need the agent instance (per-session JWT / profile / logging).
];

const RESOURCE_GROUPS: Registration[] = [
  { name: 'kb', register: registerKbResources },
];

const PROMPTS: Registration[] = [
  { name: 'pitch_for_role',         register: registerPitchForRolePrompt },
  { name: 'pilot_scope_intake',     register: registerPilotScopeIntakePrompt },
  { name: 'eveoy_price_quote',      register: registerEveoyPriceQuotePrompt },
  { name: 'eveoy_objection_handle', register: registerEveoyObjectionHandlePrompt },
  { name: 'recommend_pilot',        register: registerRecommendPilotPrompt },
];

export function registerAll(server: McpServer, agent: ToolAgent): void {
  const disabled = config().disabledTools;
  for (const t of TOOLS) {
    if (disabled.has(t.name)) {
      log.warn('tool.disabled', { tool: t.name });
      continue;
    }
    t.register(server, agent);
  }
  for (const r of RESOURCE_GROUPS) r.register(server, agent);
  for (const p of PROMPTS) p.register(server, agent);
  log.info('mcp.registered', {
    tools: TOOLS.filter((t) => !disabled.has(t.name)).map((t) => t.name).join(','),
    prompts: PROMPTS.map((p) => p.name).join(','),
  });
}
