import type { Metadata } from 'next'
import './dashboard.css'

export const metadata: Metadata = {
  title: 'Website dashboard | Footscray Dental Studio',
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  )
}
