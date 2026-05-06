'use client'

import { useCallback } from 'react'
import { CalendarHeart, Sparkles, Trash2 } from 'lucide-react'
import { HealthCalendar } from '@/components/calendar/HealthCalendar'
import { useAuth } from '@/hooks/useAuth'
import { usePersistedLogs } from '@/hooks/usePersistedLogs'
import type { DailyLogFormData } from '@/types/health'

const CYCLE_LENGTH  = 28
const PERIOD_LENGTH = 5

export default function CalendarPage() {
  const { user } = useAuth()
  const { logs, setLogs, clearLogs } = usePersistedLogs()

  const handleLogSave = useCallback((data: DailyLogFormData) => {
    setLogs(prev => ({ ...prev, [data.date]: data }))
  }, [setLogs])

  return (
    <div className="p-3 sm:p-5 lg:p-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="relative">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #0f0810 0%, #2d1129 55%, #1a0a18 100%)',
              boxShadow: '0 3px 14px rgba(244,63,117,0.28)',
            }}>
            <CalendarHeart className="w-4.5 h-4.5 text-rose-300" />
          </div>
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #d4af37, #b8962e)' }}>
            <Sparkles className="w-2 h-2 text-white" />
          </div>
        </div>
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-semibold text-slate-800 leading-tight">건강 캘린더</h1>
          <p className="text-xs text-slate-400">날짜를 탭해서 바로 기록하세요</p>
        </div>
      </div>

      {/* ── Calendar ── */}
      <HealthCalendar
        logs={logs}
        cycleLength={CYCLE_LENGTH}
        periodLength={PERIOD_LENGTH}
        onLogSave={handleLogSave}
        userName={user?.name ?? '님'}
      />

      {/* ── Dev-only: clear logs ── */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => { if (confirm('모든 로그를 초기화할까요?')) clearLogs() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-slate-200 hover:border-rose-300 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            로그 초기화 (dev)
          </button>
        </div>
      )}
    </div>
  )
}
