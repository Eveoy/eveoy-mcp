import type { ReactNode } from 'react';

export const metadata = {
  title: 'Eveoy MCP — Ask & order Eveoy from any AI',
  description:
    'Public Model Context Protocol server for Eveoy by EyCrowd. Pay $24.99 per verified in-store customer. Auto-refund on any no-show.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
