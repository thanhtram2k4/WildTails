import type { Metadata } from 'next';
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
      <body>{children}</body>
    </html>
  );
}
