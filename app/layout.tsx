import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'GB App',
  description: 'Home climbing wall route manager MVP1'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
