import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ChromaDB Viewer',
  description: 'TechMate ChromaDB Vector Database Viewer',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}