'use client'

import { useState, useCallback, useMemo } from 'react'
import { CalendarHeart, Sparkles, TrendingUp, Droplets } from 'lucide-react'
import { HealthCalendar } from '@/components/calendar/HealthCalendar'
import { LudiaInsightCard } from '@/components/calendar/LudiaInsightCard'
import { MultimodalDataPanel } from '@/components/calendar/MultimodalDataPanel'
import type { DailyLogFormData } from '@/types/health'
import { getCyclePhase } from '@/lib/cycle-utils'
import { useMultimodalData } from '@/hooks/useMultimodalData'

const MOCK_LAST_PERIOD = new Date(2026, 3, 8)   // April 8 2026
const CYCLE_LENGTH     = 28
const PERIOD_LENGTH    = 5

const MOCK_LOGS: Record<string, DailyLogFormData> = {
  '2026-04-08': { date: '2026-04-08', isPeriod: true,  periodFlow: 'medium',   painIntensity: 6, painLocations: ['lower_abdomen'],          mood: 'tired',    bodyScore: 45, cyclePhase: 'menstrual' },
  '2026-04-09': { date: '2026-04-09', isPeriod: true,  periodFlow: 'heavy',    painIntensity: 7, painLocations: ['lower_abdomen', 'back'],   mood: 'sad',      sleepHours: 7,   bodyScore: 40, cyclePhase: 'menstrual' },
  '2026-04-10': { date: '2026-04-10', isPeriod: true,  periodFlow: 'medium',   painIntensity: 4, mood: 'tired',    sleepHours: 8,   bodyScore: 52, cyclePhase: 'menstrual' },
  '2026-04-11': { date: '2026-04-11', isPeriod: true,  periodFlow: 'light',    painIntensity: 2, mood: 'calm',     sleepHours: 7.5, bodyScore: 63, cyclePhase: 'menstrual' },
  '2026-04-12': { date: '2026-04-12', isPeriod: true,  periodFlow: 'spotting', mood: 'calm',     sleepHours: 8,   bodyScore: 68, cyclePhase: 'menstrual' },
  '2026-04-14': { date: '2026-04-14', isPeriod: false, mood: 'happy',     skinCondition: 'clear',         sleepHours: 7,   heartRate: 68, bodyScore: 78, cyclePhase: 'follicular' },
  '2026-04-16': { date: '2026-04-16', isPeriod: false, mood: 'energetic', sleepHours: 7.5, heartRate: 65, bodyScore: 85, cyclePhase: 'follicular' },
  '2026-04-18': { date: '2026-04-18', isPeriod: false, mood: 'happy',     skinCondition: 'slightly_oily', dischargeType: 'egg_white', sleepHours: 8, bodyScore: 82, cyclePhase: 'ovulation' },
  '2026-04-21': { date: '2026-04-21', isPeriod: false, mood: 'calm',      sleepHours: 7, heartRate: 70, bodyScore: 75, cyclePhase: 'luteal' },
}

function computeCycleDay(lastPeriodStart: Date, today: Date, cycleLength: number): number {
  const diff = Math.floor((today.getTime() - lastPeriodStart.getTime()) / 86400000)
  return (diff % cycleLength) + 1
}

export default function CalendarPage() {
  const [logs, setLogs] = useState<Record<string, DailyLogFormData>>(MOCK_LOGS)
  const { data: multimodalData, setData: setMultimodalData } = useMultimodalData()

  const today      = useMemo(() => new Date(), [])
  const cycleDay   = useMemo(() => computeCycleDay(MOCK_LAST_PERIOD, today, CYCLE_LENGTH), [today])
  const cyclePhase = useMemo(() => getCyclePhase(cycleDay, CYCLE_LENGTH, PERIOD_LENGTH), [cycleDay])

  const handleLogSave = useCallback((data: DailyLogFormData) => {
    setLogs(prev => ({ ...prev, [data.date]: data }))
  }, [])

  const totalLogs = Object.keys(logs).length
  const avgScore  = useMemo(() => {
    const scored = Object.values(logs).filter(l => l.bodyScore)
    return scored.length ? Math.round(scored.reduce((s, l) => s + (l.bodyScore ?? 0), 0) / scored.length) : 0
  }, [logs])

  const daysUntilNext = CYCLE_LENGTH - cycleDay
  const nextPeriodDate = useMemo(() => {
    const d = new Date(MOCK_LAST_PERIOD)
    d.setDate(d.getDate() + CYCLE_LENGTH)
    return `${d.getMonth() + 1}월 ${d.getDate()}일`
  }, [])

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">

      {/* ── Premium Header ── */}
      <div className="mb-6">
        {/* LUDIA wordmark + page title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative">
            <div className="icon-badge-lg rounded-2xl flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #0f0810 0%, #2d1129 55%, #1a0a18 100%)',
                boxShadow: '0 4px 20px rgba(244,63,117,0.3)',
              }}>
              <CalendarHeart className="w-5 h-5 text-rose-300" />
            </div>
            {/* Gold sparkle accent */}
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #d4af37, #b8962e)', boxShadow: '0 2px 8px rgba(212,175,55,0.4)' }}>
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-black tracking-[0.2em] uppercase"
                style={{
                  background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 45%, #e8d07a 70%, #d4af37 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                LUDIA
              </span>
              <span className="text-xs font-light text-slate-400">AI Health Dashboard</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-800 leading-tight">건강 캘린더</h1>
            <p className="text-sm text-slate-400 mt-0.5 hidden sm:block">생리 주기 · 멀티모달 분석 · AI 인사이트 통합 추적</p>
          </div>
        </div>

        {/* KPI stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: Droplets,
              label: '현재 주기 D+',
              value: `${cycleDay}일`,
              sub: `다음 생리 ${daysUntilNext}일 후`,
              iconStyle: { background: 'linear-gradient(135deg, #f43f75, #e11d5a)', boxShadow: '0 3px 12px rgba(244,63,117,0.35)' },
            },
            {
              icon: CalendarHeart,
              label: '이번 달 기록',
              value: `${totalLogs}일`,
              sub: '지속 기록 중',
              iconStyle: { background: 'linear-gradient(135deg, #ec4899, #db2777)', boxShadow: '0 3px 12px rgba(236,72,153,0.3)' },
            },
            {
              icon: TrendingUp,
              label: '평균 바디 스코어',
              value: `${avgScore}점`,
              sub: avgScore >= 75 ? '양호' : avgScore >= 60 ? '보통' : '주의',
              iconStyle: { background: 'linear-gradient(135deg, #d4af37, #b8962e)', boxShadow: '0 3px 12px rgba(212,175,55,0.35)' },
            },
            {
              icon: Sparkles,
              label: '다음 생리 예정',
              value: nextPeriodDate,
              sub: `D-${daysUntilNext}`,
              iconStyle: { background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 3px 12px rgba(168,85,247,0.3)' },
            },
          ].map(({ icon: Icon, label, value, sub, iconStyle }) => (
            <div key={label} className="glass-card p-3 sm:p-4 flex items-center gap-3 hover-lift">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={iconStyle}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400 truncate leading-none mb-0.5">{label}</p>
                <p className="font-bold text-slate-800 text-base leading-tight">{value}</p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── LUDIA AI Insight Card ── */}
      <div className="mb-5">
        <LudiaInsightCard
          phase={cyclePhase}
          cycleDay={cycleDay}
          data={multimodalData}
        />
      </div>

      {/* ── Multimodal Data Input Panel ── */}
      <div className="mb-5">
        <MultimodalDataPanel
          value={multimodalData}
          onChange={setMultimodalData}
        />
      </div>

      {/* ── Calendar ── */}
      <HealthCalendar
        logs={logs}
        lastPeriodStart={MOCK_LAST_PERIOD}
        cycleLength={CYCLE_LENGTH}
        periodLength={PERIOD_LENGTH}
        onLogSave={handleLogSave}
      />
    </div>
  )
}
