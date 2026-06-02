# Eveoy MCP — sub-60s demo recipe

Format proven by Alex Albert / Anthropic (canonical Claude + MCP demo).
Source: https://x.com/alexalbert__/status/1861079874385203522

## Rules

1. **Silent screen recording.** No talking head, no slide intro, no audio.
2. **Single task.** One question, one observable artifact at the end.
3. **Under 60 seconds.** Hard cap. 45–55s is the sweet spot.
4. **Visible end-artifact.** The CMO-ready email, the CFO-ready PDF, the dashboard line item — not JSON. The audience is executives, not developers.
5. **No marketing copy on screen.** No "Eveoy is the…", no logos beyond the editor's chrome.
6. **Burned-in captions** for the model's response (LinkedIn/X play without sound).

## Three demos to ship

### Demo A — "Price 200 customers for a Denver coffee chain"
Length target: **45s**.

1. Open Claude Desktop with Eveoy MCP installed.
2. Prompt: *"I'm a CFO at a Denver-based coffee chain. Price an Eveoy pilot for 200 verified customer visits."*
3. Claude calls `get_pricing`, returns the structured pricing card.
4. Artifact: Cmd-Shift-S a one-pager PDF with the total + the 8-outcome bundle + the refund clause.
5. Title card (1.5s): "200 customers · $4,998 · receipt-grade output in 12 seconds."

### Demo B — "What's the right pilot to prove out our new flagship?"
Length target: **55s**.

1. Open Cursor with the MCP installed.
2. Prompt (CMO persona): *"We just opened a flagship in Soho. We have $10K to prove the location can drive walk-ins. What's the right pilot?"*
3. Cursor calls `pilot_scope_intake` prompt → walks user through 5 questions → calls `get_pricing(400)` → returns plan.
4. Artifact: an outreach email to Brad with the pilot spec inline.
5. Title card: "From question to ready-to-send pilot in <60 seconds."

### Demo C — "What industries does Eveoy serve?"
Length target: **30s**.

1. Open Lovable, click into the agent chat.
2. Prompt: *"Does Eveoy work for fitness studios?"*
3. Agent calls `list_industries` → answers with the canonical sector list, flags the closest match.
4. Artifact: the industry list rendered in Lovable's UI as a structured card.
5. Title card: "23+ sectors. One platform. Zero guesswork."

## Production notes

- **Tool:** ScreenStudio or Loom Studio (smooth cursor + auto-zoom on click).
- **Resolution:** 1920×1080, exported at 30 fps, MP4.
- **Captions:** burned in using ScreenStudio's built-in captions or manually in Descript.
- **File size:** ≤25 MB for X autoplay; ≤4 MB for embed in mcp.eveoy.com landing page.
- **Naming:** `eveoy-mcp-demo-<a|b|c>-<yyyymmdd>.mp4`.
- **Where to post:** X (native upload, not link), LinkedIn, the landing page hero, the GitHub README, the MCP Registry submission.

## What to NOT show

- Tool descriptions / JSON / schemas
- Setup / authentication flows
- Any internal Eveoy data (case study clients, burn rate, partners — see `src/classifier/denylist.ts`)
- More than one tool call per demo (visual noise)
- Stock music (rights + bad for accessibility)
