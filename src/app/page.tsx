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

  if (!ready || !hasSession || !user || !isOnboarded) return null

  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  )
}
