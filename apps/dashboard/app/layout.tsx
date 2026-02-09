import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RIME - Recursive Intelligence Multi-Agent Environment',
  description: 'AI-powered command center for developers',
  keywords: ['AI', 'multi-agent', 'developer tools', 'productivity', 'automation'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
