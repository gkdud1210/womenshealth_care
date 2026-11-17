'use client'

import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { EventReminderHost } from '@/components/calendar/EventReminderHost'
import { WeeklyAutoSaver } from '@/components/profile/WeeklyAutoSaver'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh lg:h-screen">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content — scrolls on mobile */}
      <main className="flex-1 lg:ml-64 overflow-y-auto pb-safe-nav">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* Event reminder toasts */}
      <EventReminderHost />

      {/* 지난주 기록 자동 저장 (프로필 주간 기록) */}
      <WeeklyAutoSaver />
    </div>
  )
}
