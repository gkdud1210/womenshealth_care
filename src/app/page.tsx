'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import DashboardPage from './(app)/dashboard/page'
import { useAuth } from '@/hooks/useAuth'

export default function RootPage() {
  const router = useRouter()
  const { user, ready, hasSession, isOnboarded } = useAuth()

  useEffect(() => {
    if (!ready) return
    if (!hasSession) {
      // 새 브라우저 세션 — 항상 로그인 화면으로
      router.replace('/signup')
    } else if (!user) {
      router.replace('/signup')
    } else if (!isOnboarded) {
      router.replace('/onboarding')
    }
  }, [ready, hasSession, user, isOnboarded, router])

  if (!ready || !hasSession || !user || !isOnboarded) return (
    <div className="min-h-[100dvh] flex items-center justify-center"
      style={{ background: 'linear-gradient(145deg, #fdf6f9 0%, #fce9f0 35%, #f8eeff 70%, #fdf0f8 100%)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-rose-300 border-t-rose-500 animate-spin" />
    </div>
  )

  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  )
}
