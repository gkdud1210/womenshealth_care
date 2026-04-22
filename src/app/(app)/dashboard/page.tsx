'use client'

import { useMemo } from 'react'
import {
  Activity, Droplets, Sparkles, Heart,
  CalendarHeart, Microscope, ChevronRight, Zap, Moon, Scale
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getPhaseLabel, getPhaseColor, getCyclePhase } from '@/lib/cycle-utils'
import { LudiaInsightCard } from '@/components/calendar/LudiaInsightCard'
import { useMultimodalData } from '@/hooks/useMultimodalData'

const MOCK_LAST_PERIOD = new Date(2026, 3, 8)
const CYCLE_LENGTH = 28
const PERIOD_LENGTH = 5

function computeCycleDay(from: Date, to: Date, len: number) {
  return (Math.floor((to.getTime() - from.getTime()) / 86400000) % len) + 1
}

export default function DashboardPage() {
  const { data, ready } = useMultimodalData()
  const today    = useMemo(() => new Date(), [])
  const cycleDay = useMemo(() => computeCycleDay(MOCK_LAST_PERIOD, today, CYCLE_LENGTH), [today])
  const phase    = useMemo(() => getCyclePhase(cycleDay, CYCLE_LENGTH, PERIOD_LENGTH), [cycleDay])

  if (!ready) return null

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">

      {/* Greeting */}
      <div className="mb-6">
        <p className="text-sm text-slate-400 mb-0.5">Good morning, Hayoung ✨</p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-800">오늘의 건강 개요</h1>
      </div>

      <div className="space-y-4">

        {/* LUDIA AI Insight */}
        <LudiaInsightCard phase={phase} cycleDay={cycleDay} data={data} />

        {/* Vitals + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Vitals */}
          <div className="lg:col-span-5 glass-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="card-title">오늘의 바이탈</h3>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full"
                style={{ background: getPhaseColor(phase) + '18', border: `1px solid ${getPhaseColor(phase)}35` }}>
                <Droplets className="w-3 h-3" style={{ color: getPhaseColor(phase) }} />
                <span className="text-xs font-semibold" style={{ color: getPhaseColor(phase) }}>
                  D+{cycleDay} · {getPhaseLabel(phase)}
                </span>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { icon: Heart,    label: '심박수', value: '72',   unit: 'bpm',  color: 'text-rose-500',   bg: 'bg-rose-50' },
                { icon: Moon,     label: '수면',   value: '7.5',  unit: '시간', color: 'text-indigo-500', bg: 'bg-indigo-50' },
                { icon: Activity, label: 'HRV',   value: '42',   unit: 'ms',   color: 'text-green-500',  bg: 'bg-green-50' },
                { icon: Scale,    label: '체중',   value: '58.2', unit: 'kg',   color: 'text-amber-500',  bg: 'bg-amber-50' },
              ].map(({ icon: Icon, label, value, unit, color, bg }) => (
                <div key={label} className="stat-row">
                  <div className={cn('icon-badge-sm', bg)}>
                    <Icon className={cn('w-3.5 h-3.5', color)} />
                  </div>
                  <span className="text-sm text-slate-600 flex-1">{label}</span>
                  <span className="font-bold text-slate-800">{value}</span>
                  <span className="text-xs text-slate-400 w-8">{unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI 인사이트 */}
          <div className="lg:col-span-4 glass-card p-4 sm:p-5">
            <h3 className="card-title mb-3">AI 인사이트</h3>
            <div className="space-y-2.5">
              {[
                { icon: Zap,   text: '황체기로 접어들며 에너지가 감소할 수 있어요. 마그네슘 보충을 추천해요.', color: 'text-amber-500', bg: 'bg-amber-50' },
                { icon: Heart, text: 'HRV가 정상 범위입니다. 스트레스 수준이 양호해요.',                      color: 'text-green-500', bg: 'bg-green-50' },
              ].map(({ icon: Icon, text, color, bg }, i) => (
                <div key={i} className="flex gap-2.5 p-3 rounded-xl bg-slate-50/50">
                  <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', bg)}>
                    <Icon className={cn('w-3 h-3', color)} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-3 glass-card p-4">
            <p className="label-caps mb-3">빠른 실행</p>
            <div className="space-y-1.5">
              {[
                { href: '/calendar',   icon: CalendarHeart, label: '오늘 건강 기록', color: 'icon-badge-brand' },
                { href: '/diagnostic', icon: Microscope,    label: '진단 분석',     color: 'bg-purple-500' },
                { href: '/consultant', icon: Sparkles,      label: 'LUDIA 상담',    color: 'bg-amber-400' },
              ].map(({ href, icon: Icon, label, color }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-50/50 transition-all duration-200 group">
                  <div className={cn('icon-badge-sm flex-shrink-0', color)}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm text-slate-600 group-hover:text-rose-600 transition-colors">{label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-rose-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
