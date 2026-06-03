export const dynamic = 'force-static';

const ENDPOINT = 'https://mcp.eveoy.com/api/mcp';

const cursorConfigB64 = Buffer.from(JSON.stringify({ url: ENDPOINT })).toString('base64url');
const CURSOR_DEEPLINK = `cursor://anysphere.cursor-deeplink/mcp/install?name=Eveoy&config=${cursorConfigB64}`;
const WINDSURF_DEEPLINK = 'windsurf://windsurf-mcp-registry?serverName=eveoy';

const TOOLS = [
  { name: 'ask_eveoy',       desc: 'Any question about Eveoy. Grounded in the public knowledge base.' },
  { name: 'get_pricing',     desc: 'Exact price for N real customers. $24.99 each. $999 pilot floor.' },
  { name: 'list_industries', desc: 'The 23+ sectors Eveoy serves. Built for every aisle, every shelf, every store.' },
];

const PROMPTS = [
  { name: '/eveoy_price_quote',      desc: 'One-line price for a pilot.' },
  { name: '/eveoy_objection_handle', desc: 'Tight responses to common buyer objections.' },
  { name: '/pitch_for_role',         desc: 'Role-tuned pitch — CMO · CFO · VP Retail · CEO.' },
  { name: '/pilot_scope_intake',     desc: 'Guided pilot-scoping conversation.' },
];

const CLIENTS = [
  { name: 'Lovable',         steps: 'Connectors → Chat connectors → New MCP server. Paste the URL. Add & authorize.' },
  { name: 'Claude Desktop',  steps: 'Add to claude_desktop_config.json under mcpServers: { "eveoy": { "url": "' + ENDPOINT + '" } }. Restart.' },
  { name: 'Claude.ai',       steps: 'Settings → Connectors → Add custom connector. Paste the URL.' },
  { name: 'ChatGPT',         steps: 'Settings → Connectors → Add MCP server. Paste the URL.' },
  { name: 'Cursor',          steps: 'Click "Add to Cursor", or Settings → MCP → Add server (HTTP). Paste the URL.' },
  { name: 'Windsurf',        steps: 'Click "Open in Windsurf", or Settings → MCP Servers → Add server. Paste the URL.' },
];

export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 96px' }}>
      {/* ────────── Header ────────── */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
        <img src="/wordmark.png" alt="Eveoy" height={36} style={{ height: 36, width: 'auto' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--brand-coral)' }}>
          MCP
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 14, opacity: 0.7 }}>
          <a href="https://eveoy.com">eveoy.com</a>
        </span>
      </header>

      {/* ────────── Hero ────────── */}
      <section>
        <span className="eyebrow">Real customers · in real stores · from any AI</span>
        <h1 style={{ fontSize: 'clamp(40px, 7vw, 72px)', marginTop: 20, marginBottom: 16 }}>
          Marketing was always a bet.<br />
          We made it a sure thing.
        </h1>
        <p style={{ fontSize: 'clamp(18px, 2.4vw, 22px)', maxWidth: 720, marginTop: 0, fontWeight: 600 }}>
          You don&rsquo;t pay for tokens. You don&rsquo;t pay for clicks. You don&rsquo;t pay for hope.
        </p>
        <p style={{ fontSize: 18, maxWidth: 720, marginTop: 16 }}>
          You pay <strong>$24.99</strong> per real customer who walked into your store, spent 15 minutes, and brought back the photos to prove it.
        </p>

        {/* Install CTAs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 36 }}>
          <a href={CURSOR_DEEPLINK} className="cta">Add to Cursor</a>
          <a href={WINDSURF_DEEPLINK} className="cta">Open in Windsurf</a>
          <a href="https://lovable.dev" target="_blank" rel="noreferrer" className="cta cta-ghost">Add to Lovable</a>
          <a href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer" className="cta cta-ghost">Add to Claude</a>
        </div>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 12 }}>
          5-minute setup <span className="dot" /> No contracts <span className="dot" /> 100% refunded for no-shows
        </p>
      </section>

      <hr className="divider" />

      {/* ────────── Tools ────────── */}
      <section>
        <span className="eyebrow">Eight things happen. You see three.</span>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 48px)', marginTop: 20 }}>
          Three tools. One endpoint. Just receipts.
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 24 }}>
          {TOOLS.map((t) => (
            <div key={t.name} className="card">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brand-coral)', marginBottom: 6, letterSpacing: '-0.04em' }}>
                {t.name}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.5 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* ────────── Prompts ────────── */}
      <section>
        <span className="eyebrow">Slash commands</span>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginTop: 20 }}>
          Four prompts. No ramp-up. No guesswork.
        </h2>
        <ul style={{ marginTop: 16, paddingLeft: 0, listStyle: 'none' }}>
          {PROMPTS.map((p) => (
            <li key={p.name} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid rgba(33,33,33,0.1)' }}>
              <code style={{ fontWeight: 700, color: 'var(--brand-coral)', minWidth: 220, letterSpacing: '-0.02em' }}>{p.name}</code>
              <span style={{ fontSize: 15 }}>{p.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <hr className="divider" />

      {/* ────────── Install per client ────────── */}
      <section>
        <span className="eyebrow">Add to your AI</span>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginTop: 20 }}>
          Three steps. No hassle. No guesswork.
        </h2>
        <div style={{ marginTop: 16 }}>
          {CLIENTS.map((c) => (
            <details key={c.name} style={{ padding: '14px 0', borderBottom: '1px solid rgba(33,33,33,0.1)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 17 }}>
                {c.name}
              </summary>
              <p style={{ marginTop: 10, fontSize: 15, opacity: 0.85 }}>{c.steps}</p>
            </details>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* ────────── Receipts ────────── */}
      <section>
        <span className="eyebrow">These are the receipts</span>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', marginTop: 20 }}>
          20K verified shoppers. 10K brand experiences. Zero fake clicks billed.
        </h2>
        <p style={{ fontSize: 17, maxWidth: 760 }}>
          A real customer walks in. Spends 15 minutes. Brings back the photos.
          $999 entry pilot for 40+ customers. 100% refunded for no-shows.
        </p>
        <p style={{ fontSize: 17, marginTop: 24 }}>
          <a href="https://eveoy.com" className="cta cta-ghost" style={{ marginRight: 8 }}>See pricing on eveoy.com</a>
          <a href="mailto:brad@eycrowd.com" className="cta">Book a demo</a>
        </p>
      </section>

      {/* ────────── For developers (technical detail, collapsed) ────────── */}
      <section style={{ marginTop: 56 }}>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: 0.7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            For developers
          </summary>
          <div style={{ marginTop: 16, fontSize: 14, opacity: 0.85 }}>
            <p>Endpoint: <code className="endpoint" style={{ display: 'inline-block', padding: '6px 10px' }}>{ENDPOINT}</code></p>
            <p>Streamable HTTP transport, MCP spec <code>2025-06-18</code>. Read tools are anonymous and rate-limited. Write tools (Phase 2) will require OAuth 2.1 + PKCE with RFC 8707 audience binding.</p>
            <p>Server-card metadata at <a href="/.well-known/mcp/server-card.json"><code>/.well-known/mcp/server-card.json</code></a>. Repo: <a href="https://github.com/eveoy/eveoy-mcp">github.com/eveoy/eveoy-mcp</a>.</p>
          </div>
        </details>
      </section>

      {/* ────────── Footer ────────── */}
      <footer style={{ marginTop: 96, paddingTop: 24, borderTop: '2px solid var(--brand-navy)', fontSize: 13, opacity: 0.65 }}>
        © {new Date().getFullYear()} The Eveoy™ MCP by EyCrowd, Inc. <span className="dot" /> The authentic marketing channel powered by real people.
        <br />
        <a href="/privacy">privacy</a> <span className="dot" />{' '}
        <a href="/.well-known/mcp/server-card.json">server-card.json</a> <span className="dot" />{' '}
        <a href="/sitemap.xml">sitemap</a> <span className="dot" />{' '}
        <a href="mailto:brad@eycrowd.com">brad@eycrowd.com</a>
      </footer>
    </main>
  );
}
