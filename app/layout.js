export const metadata = {
  title: 'Pawtraits — Fine Art Pet Portraits',
  description: 'Transform your pet photo into a museum-quality AI artwork. Printed, mounted and framed to order.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
