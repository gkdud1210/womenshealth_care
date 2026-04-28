'use client'

import { useState, useCallback } from 'react'
import { CalendarHeart, Sparkles } from 'lucide-react'
import { HealthCalendar } from '@/components/calendar/HealthCalendar'
import { useAuth } from '@/hooks/useAuth'
import type { DailyLogFormData } from '@/types/health'

const MOCK_LAST_PERIOD = new Date(2026, 3, 8)
const CYCLE_LENGTH     = 28
const PERIOD_LENGTH    = 5

const MOCK_LOGS: Record<string, DailyLogFormData> = {
  '2026-04-08': { date: '2026-04-08', isPeriod: true,  periodFlow: 'medium',   painIntensity: 6, painLocations: ['lower_abdomen'], mood: 'tired',     bodyScore: 45, cyclePhase: 'menstrual' },
  '2026-04-09': { date: '2026-04-09', isPeriod: true,  periodFlow: 'heavy',    painIntensity: 7, painLocations: ['lower_abdomen','back'], mood: 'sad', sleepHours: 7, bodyScore: 40, cyclePhase: 'menstrual' },
  '2026-04-10': { date: '2026-04-10', isPeriod: true,  periodFlow: 'medium',   painIntensity: 4, mood: 'tired',     sleepHours: 8,   bodyScore: 52, cyclePhase: 'menstrual' },
  '2026-04-11': { date: '2026-04-11', isPeriod: true,  periodFlow: 'light',    painIntensity: 2, mood: 'calm',      sleepHours: 7.5, bodyScore: 63, cyclePhase: 'menstrual' },
  '2026-04-12': { date: '2026-04-12', isPeriod: true,  periodFlow: 'spotting',                   mood: 'calm',      sleepHours: 8,   bodyScore: 68, cyclePhase: 'menstrual' },
  '2026-04-14': { date: '2026-04-14', isPeriod: false,                                            mood: 'happy',     sleepHours: 7,   heartRate: 68, bodyScore: 78, cyclePhase: 'follicular' },
  '2026-04-16': { date: '2026-04-16', isPeriod: false,                                            mood: 'energetic', sleepHours: 7.5, heartRate: 65, bodyScore: 85, cyclePhase: 'follicular' },
  '2026-04-18': { date: '2026-04-18', isPeriod: false,                          dischargeType: 'egg_white', mood: 'happy', sleepHours: 8, bodyScore: 82, cyclePhase: 'ovulation' },
  '2026-04-21': { date: '2026-04-21', isPeriod: false,                                            mood: 'calm',      sleepHours: 7,   heartRate: 70, bodyScore: 75, cyclePhase: 'luteal' },
}

export default function CalendarPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<Record<string, DailyLogFormData>>(MOCK_LOGS)

  const handleLogSave = useCallback((data: DailyLogFormData) => {
    setLogs(prev => ({ ...prev, [data.date]: data }))
  }, [])

  return (
    <div className="min-h-screen p-4 sm:p-5 lg:p-6">

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
        lastPeriodStart={MOCK_LAST_PERIOD}
        cycleLength={CYCLE_LENGTH}
        periodLength={PERIOD_LENGTH}
        onLogSave={handleLogSave}
        userName={user?.name ?? '님'}
      />
    </div>
  )
}
