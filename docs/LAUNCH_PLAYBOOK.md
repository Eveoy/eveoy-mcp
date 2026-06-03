# Eveoy MCP — 30-day launch playbook

> Source: synthesis of (a) X.com posts on MCP best practices and growth-hacking, Dec 2025–Jun 2026, and (b) the eveoy.com brand system. Voice: short, declarative, "you" pronoun, triple-parallelism, present tense — copy the eveoy.com cadence.
> Honest framing: most "viral MCP launches" do 5–50K impressions, not 500K. Win the registry placements + the editor one-click buttons; the threads are for distribution velocity, not for going viral.

---

## Week 1 — Quality gates (zero public posts)

| Day | Task | Outcome |
|---|---|---|
| 1 | Anti-slop audit of every tool description against Glama's banlist (`excited`, `game-changer`, `unlock`, `empower`, `AI-powered`, emojis, hashtags). | Already passing — see `npm run lint:descriptors` and the bash audit in this repo. |
| 1 | Measure total tool-description tokens. Target: stay under 10% of a 200K context window (~20K tokens). | At 3 tools this is trivial; matters once we add Phase 2 write tools. |
| 2 | Publish to the Official MCP Registry. DNS-verify `com.eveoy/*` via TXT record at apex `eveoy.com`. | Canonical namespace claimed; PulseMCP auto-mirrors within ~1 week. |
| 3 | Claim Glama listing (auto-scan via GitHub). Verify Tool Definition Quality score in A-tier (≥3.5). | Glama scoring is 70% TDQ — the canonical-template descriptions should land here. |
| 4 | Submit to Smithery via `smithery.yaml`. Apply for official-vendor verification (needs `@eveoy.com` email). | Smithery's Toolbox router needs you in the graph. |
| 5 | Submit to mcp.so, mcpservers.org (free tier first), awesome-mcp-servers (PR to `📊 Marketing` section). | Long-tail SEO. |
| 6 | Record three sub-60s demo videos. Format: silent screen recording, single task, visible end-artifact. (See `docs/DEMO_RECIPE.md`.) | Demo assets ready for launch week. |
| 7 | Wire Sentry MCP observability (Phase 2 prerequisite — see `docs/LAUNCH_PLAYBOOK.md#observability`). | Per-tool call traces in production. |

---

## Week 2 — Co-launch (Tuesday 9am PT)

Why Tuesday 9am PT: Cursor, Anthropic, and Vercel post Tuesday mornings — ride the algorithmic tide.

### Pre-launch (Mon evening)

- Email Henry Mao (@Calclavia, Smithery founder) offering Eveoy MCP free-for-Smithery-users as a launch exclusive (Exa precedent: `https://x.com/ExaAILabs/status/1912223340812738845`).
- Line up co-posts from Smithery, Glama, Composio.
- Pre-stage the X thread (Tweetdeck or X Pro), HN submission text, Product Hunt assets.

### X launch thread template (paste verbatim, brand voice)

```
Eveoy MCP is live.

Real customers · in real stores · from any AI.

You don't pay for tokens. You don't pay for clicks. You don't pay for hope.
You pay $24.99 per real customer who walked into your store.

[47-second silent demo video — agent picks 5 brands, drafts the CMO email, returns receipt]

—

How to add it (60 seconds):

• Cursor → cursor://… [deeplink]
• Windsurf → windsurf://… [deeplink]
• Claude Desktop → claude_desktop_config.json snippet
• Lovable → Chat connectors → paste mcp.eveoy.com/api/mcp

—

Free for Smithery users this week: [link]

—

Reply with your brand and an agent will scan it live.

—

Built with @vercel Fluid Compute + @modelcontextprotocol Streamable HTTP.
Repo: github.com/eveoy/eveoy-mcp
```

### Tuesday daypart

- 9:00 PT — X thread (above)
- 9:05 PT — co-posts from @smitheryai, @glama_ai (pre-coordinated)
- 9:30 PT — Show HN submission: title `Show HN: Eveoy MCP — book guaranteed in-store customer pilots from any AI`
- 10:00 PT — Product Hunt launch
- 14:00 PT — Reddit r/LocalLLaMA and r/AI_Agents (different framings)
- 17:00 PT — LinkedIn post under Brad's profile (B2B audience)

---

## Week 3 — Use-case content drip (daily)

| Day | Asset | Channel |
|---|---|---|
| Mon | "Agent picked 5 QSR brands in <60s — here's the prompt" | X + LinkedIn |
| Tue | "Cursor automation: weekly brand-fit scan to Slack" (template + GitHub gist) | X + dev.to |
| Wed | Customer/POV quote-tweet — "I ran the Eveoy MCP on [Brand]. Here's what it found." | X |
| Thu | LangGraph integration snippet + GitHub example repo | X + GitHub |
| Fri | "What killed our first MCP launch" reflection post (high-engagement format) | X |

---

## Week 4 — Influencer + long-tail

- Personalized loom + free pilot credits to: @swyx (Latent Space), @amasad (Replit), @leerob, @Calclavia, @dani_avila7.
- Publish guest piece to Smithery blog: "What 30 days of MCP distribution data taught us."
- Set up an automated cross-post cron (X + Bluesky + dev.to + Hashnode + LinkedIn) using the same content.

---

## Top 3 tactics by expected impact

1. **Co-launch with Smithery + "free for Smithery users" week.** Verified precedent (Exa). Smithery actively boosts featured partners.
2. **Sub-60s artifact-first demo: agent books a pilot end-to-end.** The Alex Albert/Anthropic format. Show the CFO-ready output, not the JSON.
3. **Cursor automation template + LangGraph snippet as a shareable asset.** Per @leerob's "Cursor automations triggered by any MCP server" signal.

---

## Observability (must ship before launch)

Production MCPs without per-tool call traces cannot answer the dominant bug report ("why isn't Claude picking my tool?"). Add Sentry MCP wrapper:

```ts
// app/api/[transport]/route.ts (Phase 2)
import { wrapMcpServerWithSentry } from '@sentry/node';
const handler = createMcpHandler((server) => {
  const wrapped = wrapMcpServerWithSentry(server);
  registerAll(wrapped);
}, …);
```

Reference: https://x.com/getsentry/status/1955989547205926987

---

## What to AVOID

- Don't post "look, an MCP" launch threads. The X audience has fatigue (see @levelsio with 500K+ impressions on the skeptic dunk: https://x.com/levelsio/status/2031943074151104634).
- Don't add marketing copy to tool descriptions. Glama scoring weight: 70% on Tool Definition Quality.
- Don't bet single-vendor on registry/hosting. Smithery dropped stdio overnight (Sep 2025) — keep Eveoy hostable on Vercel, Cloudflare, and runnable locally.
- Don't ship without an OAuth-free read-only path. Distribution friction = OAuth friction (per @virattt with >12K engagements).

---

## Source posts

- [@Calclavia · Smithery Toolbox router](https://x.com/Calclavia/status/1911638656345153559)
- [@ExaAILabs · Smithery co-launch precedent](https://x.com/ExaAILabs/status/1912223340812738845)
- [@ryolu_ · Cursor "Add to Cursor" button](https://x.com/ryolu_/status/1930365600339243504)
- [@paypaldev · PayPal MCP Cursor one-click launch](https://x.com/paypaldev/status/1932106220338614347)
- [@alexalbert__ · canonical Claude+MCP demo (sub-60s, artifact-first)](https://x.com/alexalbert__/status/1861079874385203522)
- [@AnthropicAI · .dxt one-click install](https://x.com/AnthropicAI/status/1938272883618312670)
- [@nickbaumann_ · "5 free → $20/mo" funnel](https://x.com/nickbaumann_/status/1897825055092162775)
- [@leerob · Cursor automations + MCP](https://x.com/leerob/status/2029605390942454257)
- [@AnthropicAI · Code execution with MCP (98.7% token reduction)](https://x.com/AnthropicAI/status/1985846791842250860)
- [Anthropic Engineering · code-execution-with-mcp](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [@WesRothMoney · Tool Search 10% context threshold](https://x.com/WesRothMoney/status/2011785440140149034)
- [@MaryamMiradi · 8 production tips](https://x.com/MaryamMiradi/status/1941850866564149277)
- [@jescalan · MCP auth pain across 7 clients](https://x.com/jescalan/status/1948786903035097415)
- [@christianposta · MCP OAuth spec analysis](https://x.com/christianposta/status/1944854988049506425)
- [@simonw · MCP moving away from DCR](https://x.com/simonw/status/1987343880510185578)
- [@simonw · Supabase lethal trifecta PoC](https://x.com/simonw/status/1941674715720057258)
- [@simonw · OpenAI's read-only MCP posture](https://x.com/simonw/status/1930693148445233508)
- [@cramforce · Streamable HTTP on Vercel](https://x.com/cramforce/status/1914685297100558626)
- [@getsentry · MCP server observability](https://x.com/getsentry/status/1955989547205926987)
- [@virattt · OAuth as distribution friction](https://x.com/virattt/status/1933589357182726379)
- [Apify · Smithery dropped stdio](https://x.com/apify/status/1965444838964281703)
- [Bloomberry analysis of 1,400 MCP servers](https://bloomberry.com/blog/we-analyzed-1400-mcp-servers-heres-what-we-learned/)
- [Glama scoring page](https://glama.ai/)
- [dev.to · why MCPs die in obscurity](https://dev.to/palo_alto_ai/why-mcp-servers-die-in-obscurity-and-a-fix-that-runs-itself-28ip)
