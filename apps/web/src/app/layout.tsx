import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'WildTails',
  description: 'Gamified social journaling platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="min-h-screen antialiased"
        style={{ backgroundColor: 'var(--wt-bg)', color: 'var(--wt-text)' }}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
