export const dynamic = 'force-static';

export const metadata = {
  title: 'Privacy — Eveoy MCP',
  description: 'How the Eveoy MCP server handles data.',
};

export default function Privacy() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px' }}>
      <span className="eyebrow">No fake clicks. No fake data.</span>
      <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', marginTop: 20 }}>Privacy</h1>

      <p style={{ fontSize: 18 }}>
        The Eveoy MCP server speaks public Eveoy only. The canonical Eveoy privacy policy
        lives at <a href="https://eveoy.com/privacy">eveoy.com/privacy</a>. Anything below
        is the MCP server&rsquo;s own data handling.
      </p>

      <h2 style={{ marginTop: 40, fontSize: 28 }}>What we log</h2>
      <ul>
        <li>Request id, hashed IP (HMAC with rotating salt), tool name, scope, latency, status.</li>
        <li>Classifier and rate-limit events for security monitoring.</li>
      </ul>

      <h2 style={{ marginTop: 32, fontSize: 28 }}>What we never log</h2>
      <ul>
        <li>Tool argument values (your free-text inputs).</li>
        <li>Tool response bodies.</li>
        <li>OAuth tokens, Stripe object bodies, full IP addresses, full emails.</li>
      </ul>

      <h2 style={{ marginTop: 32, fontSize: 28 }}>What we never say</h2>
      <p>
        A fail-closed classifier in{' '}
        <a href="https://github.com/bc101101/eveoy-mcp/blob/main/src/classifier/denylist.ts">
          <code>src/classifier/denylist.ts</code>
        </a>{' '}
        blocks internal Eveoy data (financials, partner names, roadmap, sales playbook, secrets)
        before it can leave the server. If a question can&rsquo;t be answered from the public set,
        the response is <em>&ldquo;That detail isn&rsquo;t publicly available — email
        brad@eycrowd.com for more.&rdquo;</em>
      </p>

      <h2 style={{ marginTop: 32, fontSize: 28 }}>Contact</h2>
      <p>
        <a href="mailto:brad@eycrowd.com">brad@eycrowd.com</a>
      </p>

      <p style={{ marginTop: 48, opacity: 0.6, fontSize: 13 }}>
        © {new Date().getFullYear()} The Eveoy™ MCP by EyCrowd, Inc.
      </p>
    </main>
  );
}
