import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AXIOM — Universal AI Search',
  description: 'Universal AI search across web, research, code, and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#06060f' }}>{children}</body>
    </html>
  );
}
