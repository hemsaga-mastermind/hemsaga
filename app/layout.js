// app/layout.js
import { LanguageProvider } from '../lib/i18n/LanguageContext';
import { getSiteUrl } from '../lib/site-url';

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Hemsaga — familjens berättelse',
    template: '%s | Hemsaga',
  },
  description:
    'Bevara familjens minnen för alltid. Samla stunder, bjud in nära och låt berättelsen växa — med stöd av AI när du vill.',
  keywords: [
    'familj',
    'minnen',
    'berättelse',
    'family memories',
    'Sweden',
    'Sverige',
    'private beta',
  ],
  openGraph: {
    type: 'website',
    locale: 'sv_SE',
    alternateLocale: ['en_US'],
    url: siteUrl,
    siteName: 'Hemsaga',
    title: 'Hemsaga — Bevara dina familjeminnen för alltid',
    description:
      'En trygg plats för familjens stunder. Väv minnen till en levande saga du kan återvända till i åratal.',
  },
  twitter: {
    card: 'summary',
    title: 'Hemsaga — familjens berättelse',
    description:
      'Bevara familjens minnen och låt berättelsen växa. Private beta.',
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: { icon: '/favicon.ico' },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="sv">
      <body style={{ margin: 0, background: '#FAF7F2' }}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
