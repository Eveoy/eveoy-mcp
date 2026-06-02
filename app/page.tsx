export const dynamic = 'force-static';

const ENDPOINT = 'https://mcp.eveoy.com/api/mcp';

const CLIENTS: Array<{ name: string; instructions: string }> = [
  {
    name: 'Lovable',
    instructions:
      'In Lovable: Connectors → Chat connectors → New MCP server. Server name: Eveoy. Server URL: ' +
      ENDPOINT +
      '. Add & authorize.',
  },
  {
    name: 'Claude Desktop',
    instructions:
      'Add to ~/Library/Application Support/Claude/claude_desktop_config.json under mcpServers: { "eveoy": { "url": "' +
      ENDPOINT +
      '" } }. Restart Claude Desktop.',
  },
  {
    name: 'Claude.ai',
    instructions:
      'Settings → Connectors → Add custom connector → URL: ' + ENDPOINT + '.',
  },
  {
    name: 'ChatGPT',
    instructions:
      'Settings → Connectors → Add MCP server → URL: ' + ENDPOINT + '.',
  },
  {
    name: 'Cursor',
    instructions:
      'Settings → MCP → Add MCP Server. Type: HTTP. URL: ' + ENDPOINT + '.',
  },
];

export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px', lineHeight: 1.6 }}>
      <h1 style={{ fontSize: 40, marginBottom: 8 }}>Eveoy MCP</h1>
      <p style={{ fontSize: 18, opacity: 0.8, marginTop: 0 }}>
        Ask about Eveoy and book the $999 pilot — from any MCP-capable AI.
      </p>

      <section style={{ marginTop: 48 }}>
        <h2 style={{ fontSize: 22, borderBottom: '1px solid #333', paddingBottom: 8 }}>Endpoint</h2>
        <pre
          style={{
            background: '#111',
            color: '#7fd1ff',
            padding: 16,
            borderRadius: 8,
            overflow: 'auto',
            fontSize: 14,
          }}
        >
          {ENDPOINT}
        </pre>
        <p>
          Speaks the MCP Streamable HTTP transport (spec 2025-06-18). Read tools are
          anonymous and rate-limited. Write tools (Phase 2) require OAuth 2.1.
        </p>
      </section>

      <section style={{ marginTop: 48 }}>
        <h2 style={{ fontSize: 22, borderBottom: '1px solid #333', paddingBottom: 8 }}>
          Tools available today
        </h2>
        <ul>
          <li>
            <code>ask_eveoy</code> — answer a question about Eveoy from the public knowledge base
          </li>
          <li>
            <code>get_pricing</code> — compute the price for N verified customers at $24.99 each
          </li>
          <li>
            <code>list_industries</code> — list the 23+ industries Eveoy serves
          </li>
        </ul>
      </section>

      <section style={{ marginTop: 48 }}>
        <h2 style={{ fontSize: 22, borderBottom: '1px solid #333', paddingBottom: 8 }}>
          Install per client
        </h2>
        {CLIENTS.map((c) => (
          <details key={c.name} style={{ marginTop: 16 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{c.name}</summary>
            <p style={{ marginTop: 8, opacity: 0.85 }}>{c.instructions}</p>
          </details>
        ))}
      </section>

      <section style={{ marginTop: 48 }}>
        <h2 style={{ fontSize: 22, borderBottom: '1px solid #333', paddingBottom: 8 }}>About</h2>
        <p>
          Eveoy is the authentic marketing channel powered by real people. Brands pay $24.99 per
          verified in-store customer who walks in, spends 15+ minutes, completes brand activities,
          and delivers verified photos and video. No-shows auto-refund.
        </p>
        <p>
          More: <a style={{ color: '#7fd1ff' }} href="https://eveoy.com">eveoy.com</a> ·{' '}
          <a style={{ color: '#7fd1ff' }} href="mailto:brad@eycrowd.com">brad@eycrowd.com</a>
        </p>
      </section>

      <footer style={{ marginTop: 64, opacity: 0.5, fontSize: 13 }}>
        © {new Date().getFullYear()} The Eveoy™ App by EyCrowd, Inc.
      </footer>
    </main>
  );
}
