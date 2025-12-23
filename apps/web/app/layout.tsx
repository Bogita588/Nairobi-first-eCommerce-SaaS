import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nairobi Commerce OS',
  description: 'Nairobi-first eCommerce SaaS with MPesa, WhatsApp, and insight-driven dashboard.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
