export const metadata = {
  title: 'Hemsaga — Where Family Stories Live Forever',
  description: 'Turn your family memories into a living storybook',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}