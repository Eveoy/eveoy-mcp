# Eveoy `.dxt` package (Claude Desktop one-click install)

Claude Desktop's `.dxt` (Desktop Extensions) format lets a user double-click a single file to install an MCP server. For **remote MCPs**, the `.dxt` is just a thin manifest pointing at the remote URL.

## How to build

```bash
# 1. Copy the brand icon into this folder (PNG required by Claude Desktop)
cp ../public/icon-512.png ./icon.png

# 2. Zip and rename to .dxt
( cd dxt && zip -r ../eveoy.dxt manifest.json icon.png )

# Verify
file eveoy.dxt   # → Zip archive data
```

## Distribute

- Upload `eveoy.dxt` to the GitHub Releases page on every version bump
- Host a permalink at `https://mcp.eveoy.com/eveoy.dxt` (add a Next.js Route Handler or upload to Vercel Blob)
- Include the download link in the landing-page hero CTA row: "Install for Claude Desktop"
- Submit to Anthropic's directory at `clau.de/mcp-directory-submission` (see `docs/REGISTRY_SUBMISSION_CHECKLIST.md`)

## Why this matters

Per @AnthropicAI (https://x.com/AnthropicAI/status/1938272883618312670): `.dxt` is the canonical Claude Desktop install path. Without it, every Claude Desktop user has to hand-edit `claude_desktop_config.json` — that's a hard filter on adoption.
