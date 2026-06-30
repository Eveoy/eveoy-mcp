# MCP Directory Submission Packets

Ready-to-paste packets to list **Eveoy MCP** on the major discovery directories. Verified
against each directory's current process (June 2026). The official registry
(`com.eveoy/mcp` v1.1.0) is already published — several directories ingest from it, so for
some you'll **claim an existing crawl** rather than submit fresh.

> Describes the **current enabled surface only** (11 tools — the directory tools are hidden
> via `MCP_DISABLE_TOOL`). If you reactivate the directory later, refresh these listings.

---

## Shared listing assets (reuse everywhere)

| Field | Value |
|---|---|
| Name | **Eveoy** (registry id `com.eveoy/mcp`) |
| Endpoint | `https://mcp.eveoy.com/mcp` (Streamable HTTP) · legacy SSE `https://mcp.eveoy.com/sse` |
| Repository | `https://github.com/Eveoy/eveoy-mcp` |
| Homepage / docs | `https://mcp.eveoy.com` |
| Icon | `https://mcp.eveoy.com/icon-512.png` |
| Auth | **None** (anonymous — read + buy without sign-in) |
| Transport | `streamable-http` |
| Surface | **11 tools · 5 prompts · 10 resources** |
| Vendor / contact | Eveoy, Inc. · `support@eveoy.com` |
| Categories | `marketing, sales, retail, advertising, ecommerce` |
| Tags | `eveoy, foot-traffic, in-store, retail, marketing, ugc, customer-acquisition, guaranteed-visits, brand-experiences, expert-associate` |

**One-liner (≤100 chars):**
> Your Eveoy expert in any AI — learn how it works, get a price, and order real in-store visits.

**One-sentence capability:**
> A helpful Eveoy expert inside any AI: learn about Eveoy, get an exact quote, save your company,
> and — when ready — order verified in-store customer visits (each = ~2 on-brand UGC photos), no sign-in.

**Paragraph (for listings that want a description body):**
> Eveoy MCP is a knowledgeable Eveoy expert associate inside any AI — here to help and educate, not
> to sell. Eveoy is pay-per-visit experience marketing: $24.99 per real customer who walks into your
> store, spends 10+ minutes, makes a purchase, and brings back ~2 on-brand in-store UGC photos — not
> clicks, not impressions, not a contract, and no-shows are 100% refunded. Through this server an agent
> can ask questions (`ask_eveoy`), get an exact quote (`get_pricing` / `recommend_pilot`), save the
> brand it represents (`capture_profile`), and — when ready — place an order with a Stripe link
> (`start_checkout`), book a demo (`book_demo`), or reach a person (`request_human`) — all anonymously,
> with every interaction logged to the team's CRM.

---

## Priority order (highest leverage first)

1. **mcp.so** — largest directory (~20k servers), top Google hit for "MCP servers". GitHub issue.
2. **awesome-mcp-servers** — high developer reach; has an agent **fast-track**. GitHub PR.
3. **Glama** — auto-crawls; `glama.json` claim file is **already committed** (just authenticate).
4. **PulseMCP** — likely **already auto-ingested** from the official registry; claim or submit.
5. **Smithery** — CLI publish; `smithery.yaml` is in the repo and refreshed.

---

## 1. mcp.so — **GitHub issue (web)**

**Process:** click **Submit** in the nav at <https://mcp.so> (opens a GitHub issue on their repo), or open the issue directly. Paste this body:

```
Name: Eveoy
Endpoint: https://mcp.eveoy.com/mcp  (Streamable HTTP; legacy SSE at /sse)
Repository: https://github.com/Eveoy/eveoy-mcp
Homepage: https://mcp.eveoy.com
Icon: https://mcp.eveoy.com/icon-512.png
Transport: streamable-http
Auth: none
Tools: 11  |  Prompts: 5  |  Resources: 10
Registry: com.eveoy/mcp (v1.1.0, official MCP registry)
Categories: marketing, sales, retail, advertising, ecommerce

One-liner: A helpful Eveoy expert inside any AI — learn how Eveoy works, get a quote, and (when
ready) order $24.99 verified in-store customer visits. Anonymous (no sign-in). Each visit includes
~2 on-brand in-store UGC photos; no-shows 100% refunded. Here to help and educate, not sell.
```

---

## 2. awesome-mcp-servers — **GitHub PR (with agent fast-track)**

**Repo:** <https://github.com/punkpeye/awesome-mcp-servers> (~90k★, the canonical list — note the
official `modelcontextprotocol/servers` list **retired its third-party section**; the registry is
the path there, which we already did). **Section: `### 🎯 Marketing`** (no "Sales" category exists;
Marketing is where GTM/sales-signal servers live). Fork → add the line in **alphabetical position
by `owner/repo`** under `🎯 Marketing` → PR.

**Entry line** (legend: `📇` TypeScript · `☁️` Cloud/remote · `🎖️` official implementation. Omit a
Glama score badge until Glama indexes us — don't fabricate the badge URL):
```
- [Eveoy/eveoy-mcp](https://github.com/Eveoy/eveoy-mcp) 📇 ☁️ - Eveoy's expert associate inside any AI: learn how Eveoy brings real customers into real stores, get an exact quote, and (when ready) order $24.99 verified in-store visits with on-brand photos.
```

**PR title** (the maintainer's automated-agent fast-track — the literal `🤖🤖🤖` opts in):
```
Add Eveoy/eveoy-mcp under Marketing 🤖🤖🤖
```

> **Before submitting:** open the live README's `🎯 Marketing` block and place the line in correct
> alphabetical order (that's the one check that gets a clean merge). **I can open this PR for you
> via `gh`** (fork + branch + PR with the fast-track title) — say the word.

**Optional secondary lists** (lower reach, easy extra coverage): `appcypher/awesome-mcp-servers`
(has Marketing **and** E-Commerce categories; standard fork-PR) and `wong2/awesome-mcp-servers`
(**no PRs** — submit via the web form at <https://mcpservers.org/submit>).

---

## 3. Glama — **claim file (committed) + authenticate**

Glama auto-crawls public GitHub repos, so Eveoy may already be listed anonymously. Claiming an
**org** repo (`Eveoy/...`) requires a `glama.json` (GitHub-auth claim doesn't work for orgs) —
**this is already committed** at the repo root:
```json
{ "$schema": "https://glama.ai/mcp/schemas/server.json", "maintainers": ["bc101101"] }
```
**Your step:** sign in to <https://glama.ai> with the **`bc101101`** GitHub account → it associates
the listing → then edit name/description/categories to match the assets above. (If `bc101101`
isn't the right maintainer, change the username in `glama.json` and re-push.)

---

## 4. PulseMCP — **check / claim (likely already listed)**

PulseMCP ingests the official MCP registry **and** crawls, so `com.eveoy/mcp` likely already
appears. **Your step:** search <https://www.pulsemcp.com/servers> for "eveoy".
- If present → use the claim/edit flow to take ownership + set the description.
- If absent → submit at <https://www.pulsemcp.com/submit> with the shared assets above.

---

## 5. Smithery — **CLI publish**

`smithery.yaml` (repo root) is configured for the remote URL and refreshed to the current copy.
Publish with the Smithery CLI (needs a Smithery account + `smithery login`):
```bash
npx @smithery/cli mcp publish https://mcp.eveoy.com/mcp -n eveoy/mcp
```
Alternatively: connect the `Eveoy/eveoy-mcp` GitHub repo in the Smithery dashboard and **claim**
the server from its page. Pick the namespace (`eveoy/mcp`) when prompted.

---

## Install snippets (for the listings + the README)

Remote Streamable-HTTP, no auth. `mcp-remote` is **no longer needed** for any of these — all
support remote URLs natively (the one exception: Claude Desktop's JSON file is stdio-only, so use
its Connectors UI, or the `mcp-remote` bridge only if you insist on a file entry).

**Claude Desktop / Claude.ai (UI):** Settings → Connectors → **Add custom connector** → paste
`https://mcp.eveoy.com/mcp` → Add. (No auth step — connects immediately.)

**Claude Code (CLI):**
```bash
claude mcp add --transport http eveoy https://mcp.eveoy.com/mcp
```

**Cursor** (`.cursor/mcp.json`):
```json
{ "mcpServers": { "eveoy": { "url": "https://mcp.eveoy.com/mcp" } } }
```

**VS Code (Copilot, Agent mode)** (`.vscode/mcp.json` — note `servers`, not `mcpServers`):
```json
{ "servers": { "eveoy": { "type": "http", "url": "https://mcp.eveoy.com/mcp" } } }
```

**Windsurf** (`~/.codeium/windsurf/mcp_config.json` — note `serverUrl`):
```json
{ "mcpServers": { "eveoy": { "serverUrl": "https://mcp.eveoy.com/mcp" } } }
```

**Claude Desktop JSON fallback** (only if you need a file entry):
```json
{ "mcpServers": { "eveoy": { "command": "npx", "args": ["-y", "mcp-remote", "https://mcp.eveoy.com/mcp"] } } }
```

---

## Your checklist
- [ ] mcp.so — paste the issue body (#1)
- [ ] awesome-mcp-servers — PR under Marketing with `🤖🤖🤖` title (#2) *(or have me open it)*
- [ ] Glama — sign in with `bc101101` to claim (glama.json already pushed) (#3)
- [ ] PulseMCP — search "eveoy" → claim, else submit (#4)
- [ ] Smithery — `smithery mcp publish … -n eveoy/mcp` (#5)
