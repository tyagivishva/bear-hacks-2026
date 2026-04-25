import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Break the Norm',
  description: 'A biometrics-reactive Spotify player for Bear Hacks.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

