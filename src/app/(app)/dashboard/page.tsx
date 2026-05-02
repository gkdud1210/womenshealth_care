'use client'

import { useMemo } from 'react'
import { Sparkles, CalendarHeart, Microscope, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getPhaseLabel, getPhaseColor, getCyclePhase } from '@/lib/cycle-utils'
import { LudiaInsightCard } from '@/components/calendar/LudiaInsightCard'
import { useMultimodalData } from '@/hooks/useMultimodalData'
import { useAuth } from '@/hooks/useAuth'
import { LudiaVoice } from '@/components/voice/LudiaVoice'
import type { CyclePhase } from '@/types/health'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'

const MOCK_LAST_PERIOD = new Date(2026, 3, 8)
const CYCLE_LENGTH = 28
const PERIOD_LENGTH = 5

function computeCycleDay(from: Date, to: Date, len: number) {
  return (Math.floor((to.getTime() - from.getTime()) / 86400000) % len) + 1
}

// ── 점수 색상 ─────────────────────────────────────────────────────────────────
function scoreColor(v: number) {
  if (v >= 75) return { bar: '#22c55e', text: 'text-green-600', bg: 'bg-green-50', label: '양호' }
  if (v >= 55) return { bar: '#f59e0b', text: 'text-amber-500', bg: 'bg-amber-50', label: '보통' }
  return        { bar: '#f43f75',       text: 'text-rose-500',  bg: 'bg-rose-50',  label: '주의' }
}

// ── 그래프: 수평 바 ───────────────────────────────────────────────────────────
function BarChart({ data }: { data: MultimodalData }) {
  const irisAvg  = Math.round((data.iris.leftScore + data.iris.rightScore) / 2)
  const tempScore = Math.round(Math.max(0, Math.min(100, (data.thermal.uterineTemp - 34.5) / 3 * 100)))
  const stressScore = 100 - data.eda.stressIndex
  const hrvScore = Math.min(100, Math.round(data.biosignal.hrv / 0.8))
  const sleepScore = Math.min(100, Math.round(data.biosignal.sleepHours / 8 * 100))

  const bars = [
    { label: '홍채 건강', score: irisAvg },
    { label: '자궁 온도', score: tempScore },
    { label: '스트레스', score: stressScore },
    { label: 'HRV',      score: hrvScore },
    { label: '수면',     score: sleepScore },
  ]

  const overall = Math.round(bars.reduce((s, b) => s + b.score, 0) / bars.length)
  const oc = scoreColor(overall)

  return (
    <div className="glass-card p-5">
      {/* 종합 점수 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-slate-400 font-medium mb-0.5">종합 건강 점수</p>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-4xl font-bold font-display', oc.text)}>{overall}</span>
            <span className="text-slate-400 text-sm">/ 100</span>
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', oc.bg, oc.text)}>{oc.label}</span>
          </div>
        </div>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: oc.bar + '18', border: `2px solid ${oc.bar}40` }}>
          <span className="text-2xl">
            {overall >= 75 ? '😊' : overall >= 55 ? '😐' : '😟'}
          </span>
        </div>
      </div>

      {/* 바 차트 */}
      <div className="space-y-3">
        {bars.map(({ label, score }) => {
          const c = scoreColor(score)
          return (
            <div key={label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-600 font-medium">{label}</span>
                <span className={cn('text-xs font-bold', c.text)}>{score}점</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${score}%`, background: c.bar }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 표: 오늘 수치 ─────────────────────────────────────────────────────────────
function MetricsTable({ data }: { data: MultimodalData }) {
  const rows = [
    {
      label: '심박수',
      value: `${data.biosignal.heartRate} bpm`,
      ok: data.biosignal.heartRate >= 55 && data.biosignal.heartRate <= 90,
      warn: false,
    },
    {
      label: '수면 시간',
      value: `${data.biosignal.sleepHours} h`,
      ok: data.biosignal.sleepHours >= 7,
      warn: data.biosignal.sleepHours >= 6 && data.biosignal.sleepHours < 7,
    },
    {
      label: 'HRV',
      value: `${data.biosignal.hrv} ms`,
      ok: data.biosignal.hrv >= 40,
      warn: data.biosignal.hrv >= 30 && data.biosignal.hrv < 40,
    },
    {
      label: '자궁 온도',
      value: `${data.thermal.uterineTemp.toFixed(1)} °C`,
      ok: data.thermal.uterineTemp >= 36.2,
      warn: data.thermal.uterineTemp >= 35.8 && data.thermal.uterineTemp < 36.2,
    },
    {
      label: '스트레스',
      value: `${data.eda.stressIndex} / 100`,
      ok: data.eda.stressIndex < 45,
      warn: data.eda.stressIndex >= 45 && data.eda.stressIndex < 65,
    },
    {
      label: 'BMI',
      value: `${data.biosignal.bmi}`,
      ok: data.biosignal.bmi >= 18.5 && data.biosignal.bmi < 25,
      warn: false,
    },
  ]

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-rose-100/60">
        <h3 className="text-sm font-semibold text-slate-700">오늘 수치</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map(({ label, value, ok, warn }) => {
          const dot   = ok   ? 'bg-green-400' : warn ? 'bg-amber-400' : 'bg-rose-400'
          const badge = ok   ? 'text-green-600 bg-green-50' :
                        warn ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'
          const status = ok ? '정상' : warn ? '주의' : '관리 필요'
          return (
            <div key={label} className="flex items-center px-5 py-3">
              <span className="text-sm text-slate-600 flex-1">{label}</span>
              <span className="text-sm font-semibold text-slate-800 mr-3">{value}</span>
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5', badge)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
                {status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 권장 액션 ─────────────────────────────────────────────────────────────────
interface Action { emoji: string; title: string; desc: string }

function buildActions(data: MultimodalData, phase: CyclePhase): Action[] {
  const actions: Action[] = []

  if (data.thermal.uterineTemp < 36.2)
    actions.push({ emoji: '🔥', title: '핫팩 하복부 15분', desc: '자궁 냉기 감지 — 혈액 순환 개선에 도움돼요' })

  if (data.eda.stressIndex >= 65)
    actions.push({ emoji: '🫁', title: '4-7-8 호흡법 3회', desc: '스트레스가 높아요 — 지금 바로 부교감 신경을 켜줘요' })
  else if (data.eda.stressIndex >= 45)
    actions.push({ emoji: '🧘', title: '5분 명상', desc: '긴장도가 보통 이상이에요 — 짧은 이완이 도움이 돼요' })

  if (data.biosignal.hrv < 38)
    actions.push({ emoji: '😴', title: '30분 일찍 취침', desc: 'HRV가 낮아요 — 오늘은 일찍 자는 것이 최선이에요' })

  if (data.biosignal.sleepHours < 6.5)
    actions.push({ emoji: '🌙', title: '수면 7시간 목표', desc: `어젯밤 ${data.biosignal.sleepHours}h — 회복이 부족해요` })

  if (actions.length < 3) {
    const phaseAction: Record<CyclePhase, Action> = {
      luteal:     { emoji: '💊', title: '마그네슘 300mg', desc: 'PMS 예방 및 황체기 이완 지원' },
      menstrual:  { emoji: '💊', title: '철분 + 비타민C', desc: '생리 중 필수 영양소를 챙겨요' },
      follicular: { emoji: '🏃', title: '유산소 30분', desc: '에스트로겐 상승 — 에너지가 좋은 시기예요' },
      ovulation:  { emoji: '💧', title: '수분 2L 목표', desc: '배란기 자궁경부 환경 최적화에 도움돼요' },
    }
    actions.push(phaseAction[phase])
  }

  return actions.slice(0, 3)
}

function ActionCards({ data, phase }: { data: MultimodalData; phase: CyclePhase }) {
  const actions = buildActions(data, phase)
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-3.5">오늘의 권장 액션</h3>
      <div className="space-y-2.5">
        {actions.map(({ emoji, title, desc }, i) => (
          <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-2xl leading-none mt-0.5">{emoji}</span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 빠른 이동 ─────────────────────────────────────────────────────────────────
function QuickLinks() {
  const links = [
    { href: '/diagnostic/scan', icon: Microscope, label: '새 진단 시작', color: '#f43f75' },
    { href: '/calendar',        icon: CalendarHeart, label: '건강 기록',  color: '#a855f7' },
    { href: '/consultant',      icon: Sparkles,   label: 'LUDIA 상담',    color: '#f59e0b' },
  ]
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {links.map(({ href, icon: Icon, label, color }) => (
        <Link key={href} href={href}
          className="glass-card p-3.5 flex flex-col items-center gap-2 text-center hover:scale-105 transition-transform active:scale-95">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: color + '18' }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <span className="text-xs font-medium text-slate-600 leading-tight">{label}</span>
          <ChevronRight className="w-3 h-3 text-slate-300" />
        </Link>
      ))}
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, ready } = useMultimodalData()
  const { user }        = useAuth()
  const today    = useMemo(() => new Date(), [])
  const cycleDay = useMemo(() => computeCycleDay(MOCK_LAST_PERIOD, today, CYCLE_LENGTH), [today])
  const phase    = useMemo(() => getCyclePhase(cycleDay, CYCLE_LENGTH, PERIOD_LENGTH), [cycleDay])

  if (!ready) return null

  const phaseColor = getPhaseColor(phase)

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-lg mx-auto">

      {/* 인사 + 주기 */}
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold text-slate-800 mb-1.5">오늘의 건강</h1>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: phaseColor + '18', border: `1px solid ${phaseColor}35` }}>
          <div className="w-2 h-2 rounded-full" style={{ background: phaseColor }} />
          <span className="text-xs font-semibold" style={{ color: phaseColor }}>
            생리 D+{cycleDay} · {getPhaseLabel(phase)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. 그래프 */}
        <BarChart data={data} />

        {/* 2. 표 */}
        <MetricsTable data={data} />

        {/* 3. 권장 액션 */}
        <ActionCards data={data} phase={phase} />

        {/* 4. AI 인사이트 */}
        <LudiaInsightCard phase={phase} cycleDay={cycleDay} data={data} />

        {/* 5. 빠른 이동 */}
        <QuickLinks />

        {/* 하단 여백 — 음성 버튼 공간 확보 */}
        <div className="h-24" />
      </div>

      {/* 음성 대화 */}
      <LudiaVoice
        data={data}
        phase={phase}
        cycleDay={cycleDay}
        userName={user?.name ?? '루디아'}
      />
    </div>
  )
}
