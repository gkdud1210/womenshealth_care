'use client'

import { useState, useCallback } from 'react'
import { CalendarHeart, Sparkles, TrendingUp, Droplets } from 'lucide-react'
import { HealthCalendar } from '@/components/calendar/HealthCalendar'
import type { DailyLogFormData } from '@/types/health'

const MOCK_LAST_PERIOD = new Date(2026, 3, 8)

const MOCK_LOGS: Record<string, DailyLogFormData> = {
  '2026-04-08': { date: '2026-04-08', isPeriod: true, periodFlow: 'medium', painIntensity: 6, painLocations: ['lower_abdomen'], mood: 'tired', bodyScore: 45, cyclePhase: 'menstrual' },
  '2026-04-09': { date: '2026-04-09', isPeriod: true, periodFlow: 'heavy',  painIntensity: 7, painLocations: ['lower_abdomen', 'back'], mood: 'sad', sleepHours: 7, bodyScore: 40, cyclePhase: 'menstrual' },
  '2026-04-10': { date: '2026-04-10', isPeriod: true, periodFlow: 'medium', painIntensity: 4, mood: 'tired', sleepHours: 8, bodyScore: 52, cyclePhase: 'menstrual' },
  '2026-04-11': { date: '2026-04-11', isPeriod: true, periodFlow: 'light',  painIntensity: 2, mood: 'calm',  sleepHours: 7.5, bodyScore: 63, cyclePhase: 'menstrual' },
  '2026-04-12': { date: '2026-04-12', isPeriod: true, periodFlow: 'spotting', mood: 'calm', sleepHours: 8, bodyScore: 68, cyclePhase: 'menstrual' },
  '2026-04-14': { date: '2026-04-14', isPeriod: false, mood: 'happy', skinCondition: 'clear', sleepHours: 7, heartRate: 68, bodyScore: 78, cyclePhase: 'follicular' },
  '2026-04-16': { date: '2026-04-16', isPeriod: false, mood: 'energetic', sleepHours: 7.5, heartRate: 65, bodyScore: 85, cyclePhase: 'follicular' },
  '2026-04-18': { date: '2026-04-18', isPeriod: false, mood: 'happy', skinCondition: 'slightly_oily', dischargeType: 'egg_white', sleepHours: 8, bodyScore: 82, cyclePhase: 'ovulation' },
  '2026-04-21': { date: '2026-04-21', isPeriod: false, mood: 'calm', sleepHours: 7, heartRate: 70, bodyScore: 75, cyclePhase: 'luteal' },
}

export default function CalendarPage() {
  const [logs, setLogs] = useState<Record<string, DailyLogFormData>>(MOCK_LOGS)

  const handleLogSave = useCallback((data: DailyLogFormData) => {
    setLogs(prev => ({ ...prev, [data.date]: data }))
  }, [])

  const totalLogs = Object.keys(logs).length
  const avgScore = Object.values(logs).filter(l => l.bodyScore).reduce((sum, l) => sum + (l.bodyScore ?? 0), 0) / (Object.values(logs).filter(l => l.bodyScore).length || 1)

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="icon-badge-lg icon-badge-brand">
            <CalendarHeart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-800">건강 캘린더</h1>
            <p className="text-sm text-slate-400">생리 주기와 매일의 건강 상태를 추적하세요</p>
          </div>
        </div>

        {/* Stats — 2 cols on mobile, 4 on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Droplets,     label: '현재 주기 D+', value: `${Math.floor((new Date().getTime() - MOCK_LAST_PERIOD.getTime()) / 86400000) + 1}일`, iconBg: 'bg-rose-500' },
            { icon: CalendarHeart, label: '이번 달 기록',  value: `${totalLogs}일`,            iconBg: 'bg-pink-500' },
            { icon: TrendingUp,   label: '평균 바디 스코어', value: `${Math.round(avgScore)}점`, iconBg: 'bg-amber-500' },
            { icon: Sparkles,     label: '다음 생리 예정', value: '5월 6일',                   iconBg: 'bg-purple-500' },
          ].map(({ icon: Icon, label, value, iconBg }) => (
            <div key={label} className="glass-card p-3 sm:p-4 flex items-center gap-2.5">
              <div className={cn('icon-badge-sm flex-shrink-0', iconBg)}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-2xs text-slate-400 truncate">{label}</p>
                <p className="font-bold text-slate-800 text-base leading-tight">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <HealthCalendar
        logs={logs}
        lastPeriodStart={MOCK_LAST_PERIOD}
        cycleLength={28}
        periodLength={5}
        onLogSave={handleLogSave}
      />
    </div>
  )
}

function cn(...args: (string | undefined | false)[]) {
  return args.filter(Boolean).join(' ')
}
