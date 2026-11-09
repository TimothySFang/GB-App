import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'GB App',
  description: 'Private home climbing wall route manager'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
