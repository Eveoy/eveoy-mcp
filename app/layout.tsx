import type { ReactNode } from 'react';
import type { Metadata } from 'next';

const SITE_URL = 'https://mcp.eveoy.com';
const TITLE = 'Eveoy MCP — verified in-store foot traffic from any AI';
const DESCRIPTION =
  'Public Model Context Protocol server for Eveoy. Ask about Eveoy and book pilots from Claude, ChatGPT, Lovable, Cursor, or Windsurf. $24.99 per verified in-store customer. $999 pilot. Auto-refund on no-shows.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Eveoy MCP',
  keywords: [
    'MCP', 'Model Context Protocol', 'Eveoy', 'EyCrowd', 'in-store foot traffic',
    'guaranteed customers', 'retail marketing', 'CMO tools', 'AI marketing',
    'Claude MCP', 'ChatGPT MCP', 'Lovable MCP', 'Cursor MCP', 'Windsurf MCP',
    'verified UGC', 'pilot', '$24.99', 'auto-refund',
  ],
  authors: [{ name: 'EyCrowd, Inc.', url: 'https://eveoy.com' }],
  creator: 'EyCrowd, Inc.',
  publisher: 'EyCrowd, Inc.',
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    siteName: 'Eveoy MCP',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'Eveoy MCP' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.svg'],
    site: '@eveoyapp',
    creator: '@eveoyapp',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-512.png',
  },
  other: {
    // MCP-specific discovery hint for crawlers
    'mcp-endpoint': `${SITE_URL}/api/mcp`,
    'mcp-server-name': 'com.eveoy/mcp',
    'mcp-transport': 'streamable-http',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Eveoy MCP',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Model Context Protocol server',
  operatingSystem: 'Cross-platform (MCP)',
  url: SITE_URL,
  description: DESCRIPTION,
  offers: {
    '@type': 'Offer',
    price: '24.99',
    priceCurrency: 'USD',
    description: 'Per verified in-store customer (Eveoy pricing)',
  },
  publisher: {
    '@type': 'Organization',
    name: 'EyCrowd, Inc.',
    url: 'https://eveoy.com',
    email: 'brad@eycrowd.com',
  },
  potentialAction: {
    '@type': 'UseAction',
    target: `${SITE_URL}/api/mcp`,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="alternate" type="application/json" title="MCP server-card" href="/.well-known/mcp/server-card.json" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
          background: '#0a0a0a',
          color: '#f5f5f5',
        }}
      >
        {children}
      </body>
    </html>
  );
}
