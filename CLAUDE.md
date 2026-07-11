# Eveoy MCP Worker ↔ eveoy.com reconciliation assistant

This repo is the **Eveoy MCP Worker** (`mcp.eveoy.com`). It integrates with the
eveoy.com repo (Lovable — `www.eveoy.com` + the Supabase backend). The two repos
share an integration surface; each side runs a reconciliation assistant (this file
is the Worker side; eveoy.com's `CLAUDE_CODE_INSTRUCTIONS.md` is theirs). Changing
the shared surface on one side without flagging it silently breaks the other.

Your job: whenever you edit anything under the protected list below, do the edit,
then immediately produce a reconciliation summary so a human can relay a matching
eveoy.com update in the same release.

## Ownership boundary — source of truth is SPLIT, not one-repo

Neither repo owns everything. Data flows in **both directions**, by file type:

| Surface | Source of truth | Mirror |
|---|---|---|
| **Backend contracts**: `supabase/functions/**` request/response shapes (`crm-log`, `create-checkout-session`, `get-order-summary`, `subscribe-beehiiv`, `ask-eveoy`, …), the `/order` checkout payload, `/book-demo`, `/get-app`, `/auth` route contracts, `openapi.json` | **eveoy.com repo** (Lovable owns the backend) | This Worker consumes them (`src/integrations/edge.ts`, `src/integrations/crm.ts`, `src/mcp/schemas.ts`). Never invent or rename a field the edge fn doesn't define. |
| **The MCP server's own identity**: tool/prompt/resource names + counts, MCP version, server descriptions/positioning, `public/.well-known/mcp/server-card.json`, the MCP content of `public/llms.txt`, `mcp/server.json`, `dxt/manifest.json`, SERVER_INSTRUCTIONS | **This repo** (it IS the running server) | eveoy.com's parallel copies (their llms.txt MCP section, their `.well-known/mcp/server-card.json`) mirror the Worker. eveoy.com must never push its copies of these files back onto the Worker. |
| **Marketing facts** (pricing, tiers, industries, guarantees, brand copy) | **www.eveoy.com — the live site** | The Worker's KB (`src/knowledge/public/*.md`) and tool copy reconcile TO the site. If the site and Worker disagree, the site wins; flag the discrepancy, don't guess. |

Positioning (canonical): the MCP is a helpful **Eveoy expert associate** — it
educates first and can take an order when the user is ready. Never "sales rep".

## Protected — do NOT change without flagging

- `src/mcp/capabilities.ts` — tool/prompt names, counts, summaries (the canonical surface)
- `src/mcp/schemas.ts` + per-tool input schemas — field names/shapes sent to edge fns
- `src/integrations/edge.ts`, `src/integrations/crm.ts` — edge-fn paths, payload shapes, auth headers
- `public/llms.txt`, `public/.well-known/**` (server-card, ai-plugin.json, acp.json, ucp, oauth-protected-resource)
- `mcp/server.json`, `dxt/manifest.json` (registry identity; version bumps auto-publish via `.github/workflows/publish-mcp.yml`)
- `docs/API_CONTRACTS.md`
- `wrangler.jsonc` routes/bindings and `MCP_DISABLE_TOOL` (changes the live tool surface)

## Rules

1. Never silently rename a tool, field, endpoint, route, resource URI, or prompt.
2. Version stays in lockstep: `mcp/server.json` = `dxt/manifest.json` =
   `server-card.json` = `src/info.ts` `MCP_VERSION` = the `McpServer` version in
   `src/index.ts` (pinned by `tests/positioning.test.ts`). Bumping `mcp/server.json`
   and pushing to main IS the registry republish — never run `mcp-publisher` manually.
3. Positioning is pinned by `tests/positioning.test.ts` — no "inbound sales rep",
   no advertising disabled tools, no sign-in claims for checkout.
4. If unsure whether a change touches the shared surface, err on the side of flagging.
5. Gate before any deploy: `npx tsc --noEmit && npx vitest run && npm run lint:descriptors`.

## Output format

- Start with a one-line summary of what you did.
- If protected files were touched: add an **"eveoy.com reconciliation required"**
  section listing the exact deltas eveoy.com must mirror (their llms.txt MCP
  section, their `.well-known/mcp/server-card.json`, any copy referencing tool
  names/counts/version), and which Worker files changed.
- If not: add — "I did not touch the tool surface, edge-fn call shapes,
  llms.txt, .well-known/*, server.json, dxt/manifest.json, or API_CONTRACTS.md,
  so no eveoy.com reconciliation is needed for this change."
