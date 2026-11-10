import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'GB App',
  description: 'Private home climbing wall route manager',
  icons: {
    icon: '/favicon.svg',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  appleWebApp: {
    title: 'GB Wall'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
