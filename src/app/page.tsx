'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import DashboardPage from './(app)/dashboard/page'
import { useAuth } from '@/hooks/useAuth'

export default function RootPage() {
  const router = useRouter()
  const { user, ready, isOnboarded } = useAuth()

  useEffect(() => {
    if (!ready) return
    if (!user) {
      router.replace('/signup')
    } else if (!isOnboarded) {
      router.replace('/onboarding')
    }
  }, [ready, user, isOnboarded, router])

  if (!ready || !user || !isOnboarded) return null

  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  )
}
