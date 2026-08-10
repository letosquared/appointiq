import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AppointIQ — AI clinic automation for Mercy Medical Centre',
  description:
    'Lead scoring, AI replies, intelligent booking and n8n automation for a Nairobi OB/GYN clinic — powered by GoHighLevel.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Rubik:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
