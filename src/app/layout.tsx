import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f43f75',
}

export const metadata: Metadata = {
  title: 'LUDIA — AI Health Chaperone',
  description: 'AI 기반 여성 건강 관리 서비스',
  // icon.png / apple-icon.png in src/app/ are auto-detected by Next.js App Router
  // manifest.ts in src/app/ generates manifest.webmanifest; the href below is set
  // explicitly because Next's auto-injected <link> doesn't respect basePath (static export)
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LUDIA',
  },
  openGraph: {
    title: 'LUDIA — AI Health Chaperone',
    description: 'AI 기반 여성 건강 관리 서비스',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
