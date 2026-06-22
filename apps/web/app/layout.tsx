import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rate Limiter — Live',
  description:
    'Watch a Redis token-bucket rate limiter work: drive traffic and see requests turn red the instant they cross the limit.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
