import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'LUDIA — AI Health Chaperone',
  description: 'AI 기반 여성 건강 관리 서비스',
  // icon.png / apple-icon.png in src/app/ are auto-detected by Next.js App Router
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
