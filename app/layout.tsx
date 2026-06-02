import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Manrope, Archivo_Black } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const SITE_URL = 'https://mcp.eveoy.com';
const TITLE = 'Eveoy MCP — real customers, in real stores, from any AI';
const DESCRIPTION =
  'The Eveoy MCP server. Ask about Eveoy and book pilots from Claude, ChatGPT, Lovable, Cursor, or Windsurf. $24.99 per real customer. $999 pilot. 100% refunded for no-shows.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Eveoy MCP',
  keywords: [
    'MCP', 'Model Context Protocol', 'Eveoy', 'EyCrowd', 'in-store foot traffic',
    'real customers', 'retail marketing', 'verified shoppers', 'guaranteed visits',
    'Claude MCP', 'ChatGPT MCP', 'Lovable MCP', 'Cursor MCP', 'Windsurf MCP',
    'pilot', '$24.99', 'auto-refund',
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
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-512.png',
  },
  other: {
    'mcp-endpoint': `${SITE_URL}/api/mcp`,
    'mcp-server-name': 'com.eveoy/mcp',
    'mcp-transport': 'streamable-http',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF8F2' },
    { media: '(prefers-color-scheme: dark)',  color: '#0A0E1F' },
  ],
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
    legalName: 'EyCrowd, Inc.',
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
    <html lang="en" className={`${manrope.variable} ${archivoBlack.variable}`}>
      <head>
        <link rel="alternate" type="application/json" title="MCP server-card" href="/.well-known/mcp/server-card.json" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
