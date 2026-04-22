'use client'

import { AppShell } from '@/components/layout/AppShell'
import DashboardPage from './(app)/dashboard/page'

export default function RootPage() {
  return (
    <AppShell>
      <DashboardPage />
    </AppShell>
  )
}
