'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Droplets, Plus, ChevronDown
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getCyclePhase, getPhaseColor, getPhaseLabel } from '@/lib/cycle-utils'
import type { DailyLogFormData, CyclePhase } from '@/types/health'
import { DailyLogModal } from './DailyLogModal'

interface Props {
  logs: Record<string, DailyLogFormData>
  lastPeriodStart?: Date
  cycleLength?: number
  periodLength?: number
  onLogSave: (data: DailyLogFormData) => void
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const MOODS = [
  { key: 'happy',    emoji: '😊', label: '행복' },
  { key: 'calm',     emoji: '😌', label: '평온' },
  { key: 'tired',    emoji: '😴', label: '피곤' },
  { key: 'sad',      emoji: '😢', label: '슬픔' },
  { key: 'energetic',emoji: '⚡', label: '활기' },
]

const PAIN_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export function HealthCalendar({ logs, lastPeriodStart, cycleLength = 28, periodLength = 5, onLogSave }: Props) {
  const [currentMonth, setCurrentMonth]   = useState(new Date())
  const [selectedDate, setSelectedDate]   = useState<Date | null>(null)
  const [showModal, setShowModal]         = useState(false)

  // quick-log state
  const [quickPeriod, setQuickPeriod]     = useState(false)
  const [quickMood,   setQuickMood]       = useState('')
  const [quickPain,   setQuickPain]       = useState(0)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd   = endOfMonth(currentMonth)
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end:   endOfWeek(monthEnd,     { weekStartsOn: 0 }),
    })
  }, [currentMonth])

  function getDayPhase(date: Date): CyclePhase | undefined {
    if (!lastPeriodStart) return undefined
    const diff = Math.floor((date.getTime() - lastPeriodStart.getTime()) / 86400000)
    if (diff < 0) return undefined
    return getCyclePhase((diff % cycleLength) + 1, cycleLength, periodLength)
  }

  function getKey(date: Date) { return format(date, 'yyyy-MM-dd') }

  const selectedLog   = selectedDate ? logs[getKey(selectedDate)] : undefined
  const selectedPhase = selectedDate ? getDayPhase(selectedDate) : undefined

  // sync quick-log state when selectedDate changes
  useEffect(() => {
    if (!selectedDate) return
    const log = logs[getKey(selectedDate)]
    setQuickPeriod(log?.isPeriod ?? false)
    setQuickMood(log?.mood ?? '')
    setQuickPain(log?.painIntensity ?? 0)
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleQuickSave() {
    if (!selectedDate) return
    const key = getKey(selectedDate)
    const existing = logs[key] ?? {}
    onLogSave({
      ...existing,
      date: key,
      isPeriod: quickPeriod,
      mood: quickMood || undefined,
      painIntensity: quickPain,
      cyclePhase: selectedPhase,
    } as DailyLogFormData)
    setSelectedDate(null)
  }

  return (
    <>
      <div className="glass-card p-4 sm:p-5">

        {/* ── Month navigation ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-800">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </h2>
          <div className="flex gap-1.5">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors">
              <ChevronLeft className="w-4 h-4 text-rose-500" />
            </button>
            <button onClick={() => setCurrentMonth(new Date())}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-medium text-rose-500 transition-colors">
              오늘
            </button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors">
              <ChevronRight className="w-4 h-4 text-rose-500" />
            </button>
          </div>
        </div>

        {/* ── Weekday headers ── */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className={cn('text-center text-xs font-semibold py-1',
              i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400')}>
              {day}
            </div>
          ))}
        </div>

        {/* ── Calendar grid ── */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const inMonth  = isSameMonth(day, currentMonth)
            const isNow    = isToday(day)
            const isSel    = selectedDate ? isSameDay(day, selectedDate) : false
            const log      = inMonth ? logs[getKey(day)] : undefined
            const phase    = getDayPhase(day)
            const pColor   = phase ? getPhaseColor(phase) : null
            const dow      = day.getDay()

            return (
              <button key={idx}
                onClick={() => {
                  if (!inMonth) return
                  setSelectedDate(isSel ? null : day)
                }}
                disabled={!inMonth}
                className={cn(
                  'relative rounded-2xl flex flex-col items-center py-2 gap-0.5 transition-all duration-150 min-h-[4.5rem] sm:min-h-[5.5rem]',
                  !inMonth && 'opacity-0 pointer-events-none',
                  isSel
                    ? 'ring-2 ring-rose-400 ring-offset-1 bg-rose-50 shadow-md'
                    : 'hover:bg-rose-50/60 active:scale-95',
                  isNow && !isSel && 'bg-gradient-to-b from-rose-50 to-pink-50',
                )}>

                {/* phase strip */}
                {phase && inMonth && (
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl opacity-60"
                    style={{ backgroundColor: pColor ?? undefined }} />
                )}

                {/* day number */}
                <span className={cn(
                  'text-sm font-semibold leading-none mt-0.5',
                  isNow
                    ? 'w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold'
                    : dow === 0 ? 'text-rose-500'
                      : dow === 6 ? 'text-blue-400'
                        : 'text-slate-700'
                )}>
                  {format(day, 'd')}
                </span>

                {/* log indicators */}
                {log && (
                  <div className="flex items-center gap-0.5">
                    {log.isPeriod && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(244,63,117,0.15)' }}>
                        <Droplets className="w-2.5 h-2.5 text-rose-400" />
                      </div>
                    )}
                    {log.mood && (
                      <span className="text-[11px] leading-none">
                        {MOODS.find(m => m.key === log.mood)?.emoji ?? '😊'}
                      </span>
                    )}
                  </div>
                )}

                {/* pain dot */}
                {log?.painIntensity !== undefined && log.painIntensity >= 4 && (
                  <div className="w-1.5 h-1.5 rounded-full absolute bottom-1 right-1.5"
                    style={{ backgroundColor: log.painIntensity >= 7 ? '#ef4444' : '#f59e0b' }} />
                )}

                {/* unlogged + cue */}
                {!log && inMonth && !isSel && (
                  <Plus className="w-3 h-3 text-slate-200 mt-auto mb-1" />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Phase legend ── */}
        <div className="mt-3 pt-3 border-t border-rose-100/50 flex flex-wrap gap-x-3 gap-y-1">
          {(['menstrual','follicular','ovulation','luteal'] as CyclePhase[]).map(p => (
            <div key={p} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getPhaseColor(p) }} />
              <span className="text-[10px] text-slate-400">{getPhaseLabel(p)}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 ml-auto">
            <Droplets className="w-2.5 h-2.5 text-rose-300" />
            <span className="text-[10px] text-slate-400">생리일</span>
          </div>
        </div>

        {/* ── Quick log panel ── */}
        {selectedDate && (
          <div className="mt-4 pt-4 border-t border-rose-100/60 animate-fade-in">

            {/* date header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  {format(selectedDate, 'M월 d일 EEEE', { locale: ko })}
                </p>
                {selectedPhase && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-0.5"
                    style={{ background: getPhaseColor(selectedPhase) + '18', color: getPhaseColor(selectedPhase) }}>
                    {getPhaseLabel(selectedPhase)}
                  </span>
                )}
              </div>
              <button onClick={() => { setShowModal(true) }}
                className="text-xs text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1">
                상세 기록 <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* 생리 중 토글 */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">생리 중인가요?</p>
              <div className="flex gap-2">
                {[{ v: true, label: '네, 생리 중', icon: '🩸' }, { v: false, label: '아니요', icon: '✓' }].map(({ v, label, icon }) => (
                  <button key={String(v)} onClick={() => setQuickPeriod(v)}
                    className={cn('flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all border',
                      quickPeriod === v
                        ? v ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-white text-slate-500 border-slate-100 hover:border-rose-200')}>
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 기분 */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">오늘 기분은?</p>
              <div className="flex gap-2">
                {MOODS.map(({ key, emoji, label }) => (
                  <button key={key} onClick={() => setQuickMood(quickMood === key ? '' : key)}
                    className={cn(
                      'flex-1 flex flex-col items-center py-2 rounded-2xl transition-all border text-center',
                      quickMood === key
                        ? 'bg-amber-50 border-amber-300 shadow-sm'
                        : 'bg-white border-slate-100 hover:border-amber-200'
                    )}>
                    <span className="text-lg leading-none">{emoji}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 통증 */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500">통증 강도</p>
                <span className={cn('text-sm font-bold',
                  quickPain === 0 ? 'text-slate-300'
                    : quickPain <= 3 ? 'text-green-500'
                      : quickPain <= 6 ? 'text-amber-500'
                        : 'text-rose-500')}>
                  {quickPain === 0 ? '없음' : `${quickPain} / 10`}
                </span>
              </div>
              <div className="flex gap-1">
                {PAIN_LEVELS.map(n => (
                  <button key={n} onClick={() => setQuickPain(quickPain === n ? 0 : n)}
                    className={cn('flex-1 h-7 rounded-lg transition-all',
                      n <= quickPain && quickPain > 0
                        ? n <= 3 ? 'bg-green-400' : n <= 6 ? 'bg-amber-400' : 'bg-rose-500'
                        : 'bg-slate-100 hover:bg-slate-200'
                    )} />
                ))}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[9px] text-slate-300">없음</span>
                <span className="text-[9px] text-slate-300">매우 심함</span>
              </div>
            </div>

            {/* actions */}
            <div className="flex gap-2">
              <button onClick={() => setSelectedDate(null)}
                className="flex-1 py-2.5 rounded-2xl text-sm text-slate-400 border border-slate-100 hover:border-slate-200 transition-colors">
                취소
              </button>
              <button onClick={handleQuickSave}
                className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
                  boxShadow: '0 4px 16px rgba(244,63,117,0.35)',
                }}>
                저장하기 ✓
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Full log modal ── */}
      {showModal && selectedDate && (
        <DailyLogModal
          date={selectedDate}
          existingLog={selectedLog}
          cyclePhase={selectedPhase}
          onSave={(data) => { onLogSave(data); setShowModal(false); setSelectedDate(null) }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
