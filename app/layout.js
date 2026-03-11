// app/layout.js
import { Lora, Plus_Jakarta_Sans } from 'next/font/google';

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata = {
  title: 'Hemsaga — Family Stories Forever',
  description: 'An AI-powered family memory storybook. Contribute memories, generate chapters, deliver to your child at 18.',
  icons: { icon: '/favicon.ico' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // needed for safe-area-inset on iPhone notch/home bar
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${lora.variable} ${jakarta.variable}`}>
      <body style={{ margin: 0, background: '#FAF7F2' }}>
        {children}
      </body>
    </html>
  );
}