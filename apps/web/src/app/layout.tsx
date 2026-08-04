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
      <body className="min-h-screen bg-zinc-900 text-zinc-100 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
