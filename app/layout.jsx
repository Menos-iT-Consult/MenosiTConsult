import './globals.css';

export const metadata = {
  title: {
    default: 'Menos iT Consult — Empowering Your Business Through Technology',
    template: '%s | Menos iT Consult',
  },
  description:
    'Menos iT Consult provides top-notch IT consulting services to small businesses in Ghana. Network design, cybersecurity, cloud solutions and more.',
  metadataBase: new URL('https://menositsolutions.vercel.app'),
  openGraph: {
    type: 'website',
    siteName: 'Menos iT Consult',
    images: [
      {
        url: '/assets/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Menos iT Consult logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/assets/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/assets/favicon.png', type: 'image/png' },
      { url: '/assets/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/assets/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {children}
      </body>
    </html>
  );
}
