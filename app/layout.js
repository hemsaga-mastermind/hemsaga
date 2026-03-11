// app/layout.js
import { LanguageProvider } from '../lib/i18n/LanguageContext';

export const metadata = {
  title: 'Hemsaga — Family Stories Forever',
  description: 'An AI-powered family memory storybook.',
  icons: { icon: '/favicon.ico' },
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
    <html lang="en">
      <body style={{ margin: 0, background: '#FAF7F2' }}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}