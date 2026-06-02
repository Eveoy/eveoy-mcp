export const dynamic = 'force-static';

const ENDPOINT = 'https://mcp.eveoy.com/api/mcp';

// Cursor "Add to Cursor" deeplink:
// cursor://anysphere.cursor-deeplink/mcp/install?name=<name>&config=<base64-json>
const cursorConfigB64 = Buffer.from(JSON.stringify({ url: ENDPOINT })).toString('base64url');
const CURSOR_DEEPLINK = `cursor://anysphere.cursor-deeplink/mcp/install?name=Eveoy&config=${cursorConfigB64}`;

const WINDSURF_DEEPLINK = 'windsurf://windsurf-mcp-registry?serverName=eveoy';

const CLIENTS = [
  {
    name: 'Lovable',
    chip: 'Add as Chat connector',
    instructions:
      'Connectors → Chat connectors → New MCP server. Server name: Eveoy. URL: ' + ENDPOINT + '. Add & authorize.',
  },
  {
    name: 'Claude Desktop',
    chip: 'Edit claude_desktop_config.json',
    instructions:
      'Add to mcpServers: { "eveoy": { "url": "' + ENDPOINT + '" } }, then restart Claude Desktop.',
  },
  {
    name: 'Claude.ai',
    chip: 'Add custom connector',
    instructions: 'Settings → Connectors → Add custom connector → URL: ' + ENDPOINT + '.',
  },
  {
    name: 'ChatGPT',
    chip: 'Add MCP server',
    instructions: 'Settings → Connectors → Add MCP server → URL: ' + ENDPOINT + '.',
  },
  {
    name: 'Cursor',
    chip: 'One-click install',
    instructions: 'Click the "Add to Cursor" button above, or Settings → MCP → Add server (HTTP). URL: ' + ENDPOINT + '.',
  },
  {
    name: 'Windsurf',
    chip: 'Registry inclusion',
    instructions: 'Click the "Open in Windsurf" button above, or Settings → MCP Servers → Add server. URL: ' + ENDPOINT + '.',
  },
];

const TOOLS = [
  { name: 'ask_eveoy', desc: 'Answer any question about Eveoy, grounded in the public KB.' },
  { name: 'get_pricing', desc: 'Exact USD price for N verified customers at $24.99 each.' },
  { name: 'list_industries', desc: 'The 23+ B2C sectors Eveoy serves.' },
];

const PROMPTS = [
  { name: '/eveoy_price_quote', desc: 'One-line price quote for a pilot.' },
  { name: '/eveoy_objection_handle', desc: 'Tight response to a common buyer objection.' },
  { name: '/pitch_for_role', desc: 'Role-tuned Eveoy pitch (CMO, CFO, VP Retail, CEO).' },
  { name: '/pilot_scope_intake', desc: 'Guided pilot scoping conversation.' },
];

export default function Home() {
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '64px 24px', lineHeight: 1.6 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <img src="/icon.svg" alt="Eveoy" width={64} height={64} style={{ borderRadius: 12 }} />
        <div>
          <h1 style={{ fontSize: 36, margin: 0, letterSpacing: -1 }}>Eveoy MCP</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: 16 }}>
            Ask about Eveoy and book the $999 pilot — from any MCP-capable AI.
          </p>
        </div>
      </header>

      <section style={{ marginTop: 40 }}>
        <h2 style={S.h2}>Endpoint</h2>
        <pre style={S.code}>{ENDPOINT}</pre>
        <p style={{ opacity: 0.8 }}>
          Streamable HTTP (MCP spec <code>2025-06-18</code>). Read tools anonymous + rate-limited.
          Write tools (Phase 2) will require OAuth 2.1 + RFC 8707 audience binding.
        </p>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={S.h2}>One-click install</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <a href={CURSOR_DEEPLINK} style={S.button}>Add to Cursor</a>
          <a href={WINDSURF_DEEPLINK} style={S.button}>Open in Windsurf</a>
          <a href="https://lovable.dev" target="_blank" rel="noreferrer" style={S.buttonGhost}>
            Add as Lovable Chat connector
          </a>
        </div>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={S.h2}>Tools</h2>
        <ul style={{ paddingLeft: 18 }}>
          {TOOLS.map((t) => (
            <li key={t.name}>
              <code style={S.codeInline}>{t.name}</code> — {t.desc}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={S.h2}>Slash commands (Prompts)</h2>
        <ul style={{ paddingLeft: 18 }}>
          {PROMPTS.map((p) => (
            <li key={p.name}>
              <code style={S.codeInline}>{p.name}</code> — {p.desc}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={S.h2}>Install per client</h2>
        {CLIENTS.map((c) => (
          <details key={c.name} style={{ marginTop: 12, borderTop: '1px solid #222', paddingTop: 12 }}>
            <summary style={{ cursor: 'pointer' }}>
              <strong>{c.name}</strong> &middot;{' '}
              <span style={{ opacity: 0.6, fontSize: 14 }}>{c.chip}</span>
            </summary>
            <p style={{ marginTop: 8, opacity: 0.85 }}>{c.instructions}</p>
          </details>
        ))}
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={S.h2}>About Eveoy</h2>
        <p>
          Eveoy is the authentic marketing channel powered by real people. Brands pay $24.99 per
          verified in-store customer who walks in, spends 15+ minutes, completes brand activities,
          and delivers verified photos and video. Auto-refund on any no-show. $999 entry pilot for
          40+ customers.
        </p>
        <p style={{ opacity: 0.75 }}>
          <a style={S.link} href="https://eveoy.com">eveoy.com</a> &middot;{' '}
          <a style={S.link} href="mailto:brad@eycrowd.com">brad@eycrowd.com</a> &middot;{' '}
          <a style={S.link} href="/.well-known/mcp/server-card.json">server-card.json</a>
        </p>
      </section>

      <footer style={{ marginTop: 64, paddingTop: 24, borderTop: '1px solid #222', opacity: 0.5, fontSize: 13 }}>
        © {new Date().getFullYear()} The Eveoy™ App by EyCrowd, Inc. · The authentic marketing channel powered by real people.
      </footer>
    </main>
  );
}

const S = {
  h2:        { fontSize: 22, borderBottom: '1px solid #333', paddingBottom: 8 } as const,
  code:      { background: '#111', color: '#7fd1ff', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 14 } as const,
  codeInline:{ background: '#111', color: '#7fd1ff', padding: '2px 6px', borderRadius: 4, fontSize: 13 } as const,
  button:    { background: '#fff', color: '#0a0a0a', padding: '10px 16px', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 14 } as const,
  buttonGhost:{ background: 'transparent', color: '#fff', padding: '10px 16px', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: 14, border: '1px solid #444' } as const,
  link:      { color: '#7fd1ff' } as const,
};
