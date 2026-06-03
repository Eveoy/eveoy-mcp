# Registry submission checklist — Eveoy MCP

Submit in this order. Each step backlinks the next.

---

## 0. Prerequisites (one-time)

- [ ] `mcp.eveoy.com` resolves to Vercel deployment
- [ ] `mcp/server.json` validates against `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`
- [ ] `public/icon-512.png` exists (the SVG placeholders ship but most registries display PNG in card grids)
- [ ] `eveoy.com` DNS reachable for TXT-record verification
- [ ] GitHub repo public at `github.com/eveoy/eveoy-mcp` (or whichever namespace you use — update `mcp/server.json` accordingly)
- [ ] `https://mcp.eveoy.com/.well-known/mcp/server-card.json` returns the same JSON as `mcp/server.json`

---

## 1. Official MCP Registry — canonical source ([registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io))

**Why first:** PulseMCP and several other directories auto-mirror from here. Establishes the verified `com.eveoy/*` namespace.

```bash
# Build the publisher CLI from source (no Homebrew release yet)
git clone https://github.com/modelcontextprotocol/registry /tmp/mcp-registry
cd /tmp/mcp-registry && make publisher
sudo cp bin/mcp-publisher /usr/local/bin/

# Generate the verification key + DNS TXT record
cd ~/Desktop/github/MCP
openssl genpkey -algorithm Ed25519 -out .keys/eveoy-mcp.pem
PUB=$(openssl pkey -in .keys/eveoy-mcp.pem -pubout -outform DER | tail -c 32 | base64)
echo "Add TXT record at eveoy.com (apex):"
echo "  v=MCPv1; k=ed25519; p=${PUB}"
# Wait for DNS propagation (5–60 min). Verify with:  dig +short TXT eveoy.com

# Login + publish
PRIV=$(openssl pkey -in .keys/eveoy-mcp.pem -noout -text | grep -A3 priv: | tail -n +2 | tr -d ' :\n')
mcp-publisher login dns --domain eveoy.com --private-key "$PRIV"
mcp-publisher publish ./mcp/server.json
```

**Alternative login:** `mcp-publisher login github-oidc` from within the GitHub Actions workflow (`.github/workflows/publish-mcp.yml`) — no keys needed.

- [ ] DNS TXT record added at apex `eveoy.com`
- [ ] `mcp-publisher publish` succeeds (returns server URL)
- [ ] Listing visible at `https://registry.modelcontextprotocol.io/v0/servers?search=eveoy`
- [ ] `isLatest: true` on the published version

---

## 2. Glama.ai — quality-scored ([glama.ai/mcp](https://glama.ai/mcp))

**Why now:** auto-scans the GitHub repo; produces a public Quality Score page that is a long-tail SEO magnet. Quality Score is 70% Tool Definition Quality + 30% Server Coherence — every tool we wrote follows the canonical template, so we should score high.

- [ ] Visit https://glama.ai/mcp and submit `github.com/eveoy/eveoy-mcp`
- [ ] Within 24h, claim the listing as the maintainer (uses GitHub OAuth)
- [ ] Verify all 3 tools surface with descriptions intact

---

## 3. Smithery.ai ([smithery.ai/new](https://smithery.ai/new))

**Why now:** install metrics from Smithery become a ranking signal across multiple registries. `smithery.yaml` is checked into the repo root.

- [ ] Visit `smithery.ai/new`, paste GitHub repo URL
- [ ] Smithery auto-detects `smithery.yaml`
- [ ] Apply for official-vendor verification (Settings → Verification) — needs eveoy.com email
- [ ] Drop the install snippet on the README and landing page

---

## 4. mcp.so ([mcp.so/submit](https://mcp.so/submit))

**Why now:** largest aggregator (~20k servers). The Featured tab is editorial — email `hello@mcp.so` after submission with the demo video + Lovable/Claude install screenshots.

- [ ] Submit via the web form: GitHub repo URL, 1-line description, `Marketing` category
- [ ] Paste icon URL: `https://mcp.eveoy.com/icon-512.png`
- [ ] Confirm transport = Streamable HTTP

---

## 5. awesome-mcp-servers — GitHub PR

Repo: [github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers).

Target section: **📊 Marketing** (create the category if missing — PRs that add a needed category are usually accepted).

Single-line entry:

```markdown
- [eveoy/eveoy-mcp](https://github.com/eveoy/eveoy-mcp) 📇 ☁️ — Eveoy MCP: ask about Eveoy and book pilots at $24.99/verified in-store customer. Streamable HTTP. Auto-refund on no-shows.
```

Legend: 📇 = remote/cloud-hosted, ☁️ = Streamable HTTP.

- [ ] PR opened, CI green
- [ ] Reviewer feedback addressed

---

## 6. mcpservers.org ([mcpservers.org/submit](https://mcpservers.org/submit))

**Why now:** Lovable's docs explicitly point users here as the discovery surface. $39 Premium = dofollow backlink + badge — cheapest backlink in the stack.

- [ ] Free submission first; pay Premium after the listing shows up
- [ ] Category: `Marketing`
- [ ] Premium fields: tagline, screenshot, install commands

---

## 7. PulseMCP ([pulsemcp.com](https://www.pulsemcp.com))

**Auto-ingests from the Official Registry** within ~1 week of publish. No active submission needed.

- [ ] After 7 days, search `pulsemcp.com` for "Eveoy". If absent, use `pulsemcp.com/submit`
- [ ] Apply for Spotlight: email `hello@pulsemcp.com` with a one-paragraph pitch + Lovable demo GIF

---

## 8. ChatGPT Apps Directory (OpenAI)

**Slow review (weeks).** Submit only after directory listings prove utility metrics.

- [ ] Add OAuth 2.1 (Phase 2 prerequisite — not yet shipped)
- [ ] Tools must carry annotations: `readOnlyHint` / `destructiveHint` / `openWorldHint` (done)
- [ ] App icon, screenshots, demo video
- [ ] Privacy policy live at `eveoy.com/privacy`
- [ ] Submit via OpenAI Developer Platform: developers.openai.com → Apps → Submit

---

## 9. Claude Connector Directory (Anthropic)

URL: [clau.de/mcp-directory-submission](https://clau.de/mcp-directory-submission)

**Slow curation (~2 weeks).** Most common rejection reasons (per Anthropic): missing privacy policy, incomplete tool annotations, no test account, beta-status tooling.

- [ ] Privacy policy live at `eveoy.com/privacy`
- [ ] Test account credentials documented (Phase 2 — OAuth)
- [ ] All tool annotations populated (done in Phase 1)
- [ ] Submit form fields: Name, URL, Tagline, Description, Transport, Auth, Capabilities, Allowed redirect URIs

---

## 10. Cursor + Windsurf — deeplinks only

Cursor and Windsurf don't run a "submit" surface; distribution = ship the deeplink everywhere.

- [ ] "Add to Cursor" button on the landing page (done) and in the README
- [ ] PR to `github.com/pontusab/cursor.directory` with our entry
- [ ] "Open in Windsurf" button on the landing page (done)
- [ ] Cold-email Devin DevRel with the deeplink + customer story

---

## Single highest-leverage lever per registry

| Registry | Lever |
|---|---|
| Official Registry | DNS-verified namespace `com.eveoy/*` |
| Glama | Tool descriptions following the canonical template (already done) |
| Smithery | Official-vendor verification badge |
| mcp.so | Email maintainer for Featured placement w/ demo |
| awesome-mcp-servers | Pick the right category section + tight one-line summary |
| mcpservers.org | $39 Premium dofollow badge |
| PulseMCP | Being in the Official Registry (only path) |
| ChatGPT Apps | Tool-call analytics + user satisfaction post-launch |
| Claude Directory | Complete annotations + privacy policy + test account |
| Cursor | Inbound deeplink clicks |
| Windsurf | Devin admin curation; cold outreach |
