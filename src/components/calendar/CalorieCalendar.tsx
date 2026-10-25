'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Flame, Camera } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, format, isSameMonth, isToday,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useOnboardingProfile } from '@/lib/onboarding-profile'
import { resolveMealProfile, MEAL_META, MEAL_ORDER, type MealType } from '@/data/mealWellness'
import type { MealAnalysisResult } from '@/lib/meal-analysis'

/**
 * 칼로리 캘린더 — 루디아 헬스에서 기록한 식단(`ludia_meal_logs_v1`)을 날짜별로 모아
 * 하루 섭취 칼로리와 상태(과식·불균형 / 양호 / 부족)를 색으로 보여줘요.
 */

const LOGS_KEY = 'ludia_meal_logs_v1'

type MealEntry = MealAnalysisResult & { mealType: MealType }
type MealLogs = Record<string, Partial<Record<MealType, MealEntry>>>

type DayStatus = 'over' | 'good' | 'low'

const STATUS_META: Record<DayStatus, { label: string; desc: string; color: string; bg: string; border: string }> = {
  over: { label: '과식·불균형', desc: '많이 먹었거나 영양이 한쪽으로 치우친 날', color: '#e11d48', bg: 'rgba(244,63,94,0.13)', border: 'rgba(244,63,94,0.35)' },
  good: { label: '양호',       desc: '목표 범위 안에서 고르게 먹은 날',       color: '#059669', bg: 'rgba(16,185,129,0.13)', border: 'rgba(16,185,129,0.35)' },
  low:  { label: '부족',       desc: '목표보다 적게 먹은 날',                 color: '#2563eb', bg: 'rgba(59,130,246,0.13)', border: 'rgba(59,130,246,0.35)' },
}

interface DaySummary {
  total: number
  protein: number
  carb: number
  fat: number
  meals: MealEntry[]
  status: DayStatus
  reasons: string[]
}

function loadLogs(): MealLogs {
  try {
    const s = localStorage.getItem(LOGS_KEY)
    return s ? JSON.parse(s) : {}
  } catch { return {} }
}

/** 탄·단·지 에너지 비율로 불균형 여부를 판단해요 (영양 정보가 있는 끼니만) */
function macroImbalance(protein: number, carb: number, fat: number): string[] {
  const kcal = protein * 4 + carb * 4 + fat * 9
  if (kcal <= 0) return []
  const reasons: string[] = []
  if ((carb * 4) / kcal > 0.65) reasons.push('탄수화물 비중이 높아요')
  if ((fat * 9) / kcal > 0.4) reasons.push('지방 비중이 높아요')
  if ((protein * 4) / kcal < 0.12) reasons.push('단백질이 부족해요')
  return reasons
}

function summarize(day: MealLogs[string], [lo, hi]: [number, number]): DaySummary | null {
  const meals = MEAL_ORDER.map(m => day[m]).filter((e): e is MealEntry => !!e)
  if (meals.length === 0) return null
  const sum = (pick: (e: MealEntry) => number | undefined) => meals.reduce((s, e) => s + (pick(e) ?? 0), 0)
  const total = sum(e => e.totalCalories)
  const protein = sum(e => e.protein)
  const carb = sum(e => e.carb)
  const fat = sum(e => e.fat)

  const imbalance = macroImbalance(protein, carb, fat)
  let status: DayStatus
  let reasons: string[]
  if (total > hi * 1.1) {
    status = 'over'
    reasons = [`목표(${hi.toLocaleString()}kcal)보다 ${(total - hi).toLocaleString()}kcal 많아요`, ...imbalance]
  } else if (imbalance.length > 0) {
    status = 'over'
    reasons = imbalance
  } else if (total < lo * 0.75) {
    status = 'low'
    reasons = [`목표(${lo.toLocaleString()}kcal)보다 ${(lo - total).toLocaleString()}kcal 적어요`]
  } else {
    status = 'good'
    reasons = ['칼로리와 영양 균형이 모두 좋아요']
  }
  return { total, protein, carb, fat, meals, status, reasons }
}

export function CalorieCalendar() {
  const { careTypes } = useOnboardingProfile()
  const target = useMemo(() => resolveMealProfile(careTypes).dailyKcal, [careTypes])
  const [logs, setLogs] = useState<MealLogs>({})
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => { setLogs(loadLogs()) }, [])

  const summaries = useMemo(() => {
    const out: Record<string, DaySummary> = {}
    for (const [k, day] of Object.entries(logs)) {
      const s = day && summarize(day, target)
      if (s) out[k] = s
    }
    return out
  }, [logs, target])

  const days = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  }), [month])

  const monthStats = useMemo(() => {
    const inMonth = Object.entries(summaries).filter(([k]) => k.startsWith(format(month, 'yyyy-MM')))
    const counts: Record<DayStatus, number> = { over: 0, good: 0, low: 0 }
    inMonth.forEach(([, s]) => { counts[s.status]++ })
    const avg = inMonth.length ? Math.round(inMonth.reduce((s, [, d]) => s + d.total, 0) / inMonth.length) : 0
    return { counts, avg, days: inMonth.length }
  }, [summaries, month])

  const sel = summaries[selected]

  return (
    <div className="space-y-3">
      <div className="rounded-3xl p-3 sm:p-4"
        style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(244,63,117,0.12)', boxShadow: '0 4px 20px rgba(244,63,117,0.06)' }}>

        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonth(m => subMonths(m, 1))} aria-label="이전 달"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-800">{format(month, 'yyyy년 M월', { locale: ko })}</p>
            <p className="text-[10px] text-slate-400">하루 목표 {target[0].toLocaleString()}~{target[1].toLocaleString()}kcal</p>
          </div>
          <button onClick={() => setMonth(m => addMonths(m, 1))} aria-label="다음 달"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <p key={d} className={cn('text-center text-[10px] font-semibold',
              i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400')}>{d}</p>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map(d => {
            const k = format(d, 'yyyy-MM-dd')
            const s = summaries[k]
            const meta = s ? STATUS_META[s.status] : null
            const inMonth = isSameMonth(d, month)
            return (
              <button key={k} onClick={() => setSelected(k)}
                className={cn('aspect-square sm:aspect-[4/3] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95',
                  !inMonth && 'opacity-30',
                  selected === k && 'ring-2 ring-offset-1 ring-slate-400')}
                style={meta
                  ? { background: meta.bg, border: `1px solid ${meta.border}` }
                  : { background: 'rgba(241,245,249,0.6)', border: '1px solid transparent' }}>
                <span className={cn('text-[11px] leading-none',
                  isToday(d) ? 'font-black text-rose-500' : 'font-semibold text-slate-600')}>
                  {d.getDate()}
                </span>
                {s && (
                  <span className="text-[9.5px] sm:text-[11px] font-bold leading-none tabular-nums" style={{ color: meta!.color }}>
                    {s.total.toLocaleString()}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3">
          {(Object.keys(STATUS_META) as DayStatus[]).map(st => (
            <span key={st} className="flex items-center gap-1 text-[10.5px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_META[st].color }} />
              {STATUS_META[st].label}
              <span className="font-bold" style={{ color: STATUS_META[st].color }}>{monthStats.counts[st]}일</span>
            </span>
          ))}
        </div>
        {monthStats.days > 0 && (
          <p className="text-center text-[10.5px] text-slate-400 mt-1.5">
            이번 달 하루 평균 <span className="font-bold text-slate-600">{monthStats.avg.toLocaleString()}kcal</span> · {monthStats.days}일 기록
          </p>
        )}
      </div>

      {/* Selected day detail */}
      <div className="rounded-3xl p-4"
        style={{ background: 'rgba(255,255,255,0.92)', border: `1px solid ${sel ? STATUS_META[sel.status].border : 'rgba(226,232,240,1)'}` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12.5px] font-bold text-slate-700">
            {format(new Date(selected + 'T00:00:00'), 'M월 d일 (EEE)', { locale: ko })}
          </p>
          {sel && (
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: STATUS_META[sel.status].color }}>
              {STATUS_META[sel.status].label}
            </span>
          )}
        </div>

        {sel ? (
          <>
            <p className="text-[26px] font-black text-slate-800 leading-tight">
              {sel.total.toLocaleString()}<span className="text-sm font-bold text-slate-400 ml-1">kcal</span>
            </p>
            <ul className="mt-1 mb-3 space-y-0.5">
              {sel.reasons.map(r => (
                <li key={r} className="text-[11.5px] font-semibold" style={{ color: STATUS_META[sel.status].color }}>· {r}</li>
              ))}
            </ul>
            {(sel.protein + sel.carb + sel.fat) > 0 && (
              <div className="flex gap-2 mb-3">
                {[['탄수화물', sel.carb], ['단백질', sel.protein], ['지방', sel.fat]].map(([label, g]) => (
                  <div key={label} className="flex-1 text-center py-1.5 rounded-xl bg-slate-50">
                    <p className="text-[10px] text-slate-400">{label}</p>
                    <p className="text-[12px] font-bold text-slate-700">{Math.round(g as number)}g</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              {MEAL_ORDER.map(m => {
                const e = sel.meals.find(x => x.mealType === m)
                return (
                  <div key={m} className={cn('flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl bg-slate-50', !e && 'opacity-40')}>
                    <span className="text-base">{MEAL_META[m].emoji}</span>
                    <span className="text-[10px] text-slate-400">{MEAL_META[m].label}</span>
                    <span className="text-[11px] font-bold text-slate-600">{e ? `${e.totalCalories.toLocaleString()}kcal` : '-'}</span>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-3">
            <Flame className="w-6 h-6 text-slate-300 mb-1.5" />
            <p className="text-[12px] text-slate-400 mb-3">이 날은 식단 기록이 없어요</p>
            <Link href="/ludia-call"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold text-white active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
              <Camera className="w-3.5 h-3.5" />
              식단 사진 찍고 기록하기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
