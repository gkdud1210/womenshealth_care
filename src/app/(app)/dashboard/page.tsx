'use client'

import {
  Activity, Droplets, TrendingUp, Sparkles, Heart,
  CalendarHeart, Microscope, ChevronRight, Zap, Moon, Scale
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getPhaseLabel, getPhaseColor } from '@/lib/cycle-utils'
import type { CyclePhase } from '@/types/health'

const TODAY_PHASE: CyclePhase = 'luteal'
const CYCLE_DAY = 14
const BODY_SCORE = 75

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-sm text-slate-400 mb-1">Good morning, Hayoung ✨</p>
        <h1 className="font-display text-3xl font-semibold text-slate-800">오늘의 건강 개요</h1>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Body Score Hero Card */}
        <div className="col-span-5 glass-card p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-gradient-to-br from-rose-100/60 to-pink-100/40 -translate-y-12 translate-x-12" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-gradient-to-tr from-gold-100/40 to-transparent -translate-x-8 translate-y-8" />

          <div className="relative z-10">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-4">오늘의 바디 스코어</p>
            <div className="flex items-end gap-4 mb-5">
              <span className="font-display text-7xl font-bold text-rose-500 leading-none">{BODY_SCORE}</span>
              <div className="mb-2">
                <div className="flex items-center gap-1.5 text-green-500 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  <span>+5 from yesterday</span>
                </div>
                <span className="text-slate-400 text-xs">양호</span>
              </div>
            </div>

            {/* Score Bar */}
            <div className="h-2.5 bg-rose-100 rounded-full overflow-hidden mb-5">
              <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-700"
                style={{ width: `${BODY_SCORE}%` }} />
            </div>

            {/* Current Cycle */}
            <div className="flex items-center gap-3 p-3 bg-white/60 rounded-2xl">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: getPhaseColor(TODAY_PHASE) + '20' }}>
                <Droplets className="w-5 h-5" style={{ color: getPhaseColor(TODAY_PHASE) }} />
              </div>
              <div>
                <p className="text-xs text-slate-400">현재 주기</p>
                <p className="font-semibold text-slate-700">
                  D+{CYCLE_DAY} · <span style={{ color: getPhaseColor(TODAY_PHASE) }}>{getPhaseLabel(TODAY_PHASE)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Vitals */}
        <div className="col-span-4 glass-card p-5">
          <h3 className="font-display text-base font-semibold text-slate-700 mb-4">오늘의 바이탈</h3>
          <div className="space-y-3">
            {[
              { icon: Heart, label: '심박수', value: '72', unit: 'bpm', color: 'text-rose-500', bg: 'bg-rose-50' },
              { icon: Moon, label: '수면', value: '7.5', unit: '시간', color: 'text-indigo-500', bg: 'bg-indigo-50' },
              { icon: Activity, label: 'HRV', value: '42', unit: 'ms', color: 'text-green-500', bg: 'bg-green-50' },
              { icon: Scale, label: '체중', value: '58.2', unit: 'kg', color: 'text-gold-500', bg: 'bg-amber-50' },
            ].map(({ icon: Icon, label, value, unit, color, bg }) => (
              <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/50">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', bg)}>
                  <Icon className={cn('w-4 h-4', color)} />
                </div>
                <span className="text-sm text-slate-600 flex-1">{label}</span>
                <span className="font-bold text-slate-800">{value}</span>
                <span className="text-xs text-slate-400">{unit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-3 space-y-3">
          <div className="glass-card p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-3">빠른 실행</p>
            <div className="space-y-2">
              {[
                { href: '/calendar', icon: CalendarHeart, label: '오늘 건강 기록', color: 'bg-rose-500' },
                { href: '/diagnostic', icon: Microscope, label: '진단 분석 보기', color: 'bg-purple-500' },
                { href: '/consultant', icon: Sparkles, label: 'AI 상담 시작', color: 'bg-gold-400' },
              ].map(({ href, icon: Icon, label, color }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-50/50 transition-all duration-200 group">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shadow-soft flex-shrink-0', color)}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-slate-600 group-hover:text-rose-600 transition-colors">{label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 ml-auto group-hover:text-rose-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Cycle Progress */}
        <div className="col-span-8 glass-card p-5">
          <h3 className="font-display text-base font-semibold text-slate-700 mb-4">사이클 진행률</h3>
          <div className="flex items-center gap-4">
            {(['menstrual', 'follicular', 'ovulation', 'luteal'] as CyclePhase[]).map((phase, i) => {
              const isActive = phase === TODAY_PHASE
              const durations = { menstrual: 5, follicular: 9, ovulation: 3, luteal: 11 }
              const width = `${(durations[phase] / 28) * 100}%`
              return (
                <div key={phase} className="relative" style={{ width }}>
                  <div className={cn(
                    'h-3 rounded-full transition-all duration-300',
                    isActive ? 'opacity-100 shadow-soft' : 'opacity-40'
                  )}
                    style={{ backgroundColor: getPhaseColor(phase) }} />
                  {isActive && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-medium whitespace-nowrap"
                      style={{ color: getPhaseColor(phase) }}>
                      {getPhaseLabel(phase)} ▼
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1 text-center">{getPhaseLabel(phase)}</p>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-3 text-xs text-slate-400">
            <span>1일</span>
            <span className="font-medium text-rose-500">D+{CYCLE_DAY}</span>
            <span>28일</span>
          </div>
        </div>

        {/* Insights */}
        <div className="col-span-4 glass-card p-5">
          <h3 className="font-display text-base font-semibold text-slate-700 mb-4">AI 인사이트</h3>
          <div className="space-y-3">
            {[
              { icon: Zap, text: '황체기로 접어들며 에너지가 감소할 수 있어요. 마그네슘 보충을 추천해요.', color: 'text-amber-500', bg: 'bg-amber-50' },
              { icon: Heart, text: 'HRV가 정상 범위입니다. 스트레스 수준이 양호해요.', color: 'text-green-500', bg: 'bg-green-50' },
            ].map(({ icon: Icon, text, color, bg }, i) => (
              <div key={i} className="flex gap-2.5 p-3 rounded-xl bg-slate-50/50">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', bg)}>
                  <Icon className={cn('w-3.5 h-3.5', color)} />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
