'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Droplets, X } from 'lucide-react'
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
  { key: 'happy',     emoji: '😊', label: '행복' },
  { key: 'calm',      emoji: '😌', label: '평온' },
  { key: 'tired',     emoji: '😴', label: '피곤' },
  { key: 'sad',       emoji: '😢', label: '슬픔' },
  { key: 'energetic', emoji: '⚡', label: '활기' },
]

const PAIN_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function phaseBg(phase: CyclePhase, opacity = 0.14): string {
  const map: Record<CyclePhase, string> = {
    menstrual:  `rgba(244,63,117,${opacity})`,
    follicular: `rgba(251,146,60,${opacity})`,
    ovulation:  `rgba(34,197,94,${opacity})`,
    luteal:     `rgba(168,85,247,${opacity})`,
  }
  return map[phase]
}

export function HealthCalendar({
  logs, lastPeriodStart, cycleLength = 28, periodLength = 5, onLogSave
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showModal, setShowModal]       = useState(false)

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
          {calendarDays.map((day, i) => {
            const inMonth  = isSameMonth(day, currentMonth)
            const isNow    = isToday(day)
            const isSel    = selectedDate ? isSameDay(day, selectedDate) : false
            const log      = inMonth ? logs[getKey(day)] : undefined
            const phase    = getDayPhase(day)
            const dow      = day.getDay()
            const phColor  = phase ? getPhaseColor(phase) : '#f43f75'

            return (
              <button key={i}
                onClick={() => { if (!inMonth) return; setSelectedDate(isSel ? null : day) }}
                disabled={!inMonth}
                className={cn(
                  'relative rounded-2xl flex flex-col items-center py-2 gap-0.5 transition-all duration-150 min-h-[4.5rem] sm:min-h-[5.5rem]',
                  !inMonth && 'opacity-0 pointer-events-none',
                  'active:scale-95',
                )}
                style={{
                  background: phase && inMonth
                    ? phaseBg(phase, isSel ? 0.3 : 0.15)
                    : isSel ? 'rgba(244,63,117,0.1)' : 'transparent',
                  boxShadow: isSel
                    ? `0 0 0 2px ${phColor}, 0 4px 14px ${phColor}30`
                    : isNow
                      ? '0 0 0 2px #f43f75'
                      : undefined,
                }}>

                {/* day number */}
                <span className={cn(
                  'text-sm font-semibold leading-none mt-0.5 z-10',
                  isNow
                    ? 'w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold'
                    : dow === 0 ? 'text-rose-600'
                      : dow === 6 ? 'text-blue-500'
                        : 'text-slate-700'
                )}>
                  {format(day, 'd')}
                </span>

                {/* log indicators */}
                {log && (
                  <div className="flex items-center gap-0.5 z-10">
                    {log.isPeriod && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(244,63,117,0.2)' }}>
                        <Droplets className="w-2.5 h-2.5 text-rose-500" />
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
                  <div className="w-1.5 h-1.5 rounded-full absolute bottom-1 right-1.5 z-10"
                    style={{ backgroundColor: log.painIntensity >= 7 ? '#ef4444' : '#f59e0b' }} />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Phase legend ── */}
        <div className="mt-3 pt-3 border-t border-rose-100/50 flex flex-wrap gap-x-3 gap-y-1">
          {(['menstrual','follicular','ovulation','luteal'] as CyclePhase[]).map(p => (
            <div key={p} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: phaseBg(p, 0.7) }} />
              <span className="text-[10px] text-slate-400">{getPhaseLabel(p)}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 ml-auto">
            <Droplets className="w-2.5 h-2.5 text-rose-300" />
            <span className="text-[10px] text-slate-400">생리일</span>
          </div>
        </div>
      </div>

      {/* ── Quick log popup ── */}
      {selectedDate && !showModal && (
        <QuickLogPopup
          date={selectedDate}
          log={selectedLog}
          phase={selectedPhase}
          onSave={(data) => { onLogSave(data); setSelectedDate(null) }}
          onClose={() => setSelectedDate(null)}
          onOpenFull={() => setShowModal(true)}
        />
      )}

      {/* ── Full log modal ── */}
      {showModal && selectedDate && (
        <DailyLogModal
          date={selectedDate}
          existingLog={selectedLog}
          cyclePhase={selectedPhase}
          onSave={(data) => { onLogSave(data); setShowModal(false); setSelectedDate(null) }}
          onClose={() => { setShowModal(false) }}
        />
      )}
    </>
  )
}

/* ── Quick log popup ────────────────────────────────────────────── */
function QuickLogPopup({ date, log, phase, onSave, onClose, onOpenFull }: {
  date: Date
  log?: DailyLogFormData
  phase?: CyclePhase
  onSave: (data: DailyLogFormData) => void
  onClose: () => void
  onOpenFull: () => void
}) {
  const [period, setPeriod] = useState(log?.isPeriod ?? false)
  const [mood,   setMood]   = useState(log?.mood ?? '')
  const [pain,   setPain]   = useState(log?.painIntensity ?? 0)

  const phaseColor = phase ? getPhaseColor(phase) : '#f43f75'

  function handleSave() {
    onSave({
      ...(log ?? {}),
      date:          format(date, 'yyyy-MM-dd'),
      isPeriod:      period,
      mood:          mood || undefined,
      painIntensity: pain,
      cyclePhase:    phase,
    } as DailyLogFormData)
  }

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      {/* popup */}
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background:    'rgba(255,255,255,0.97)',
          backdropFilter:'blur(24px)',
          border:        '1px solid rgba(255,255,255,0.9)',
        }}>

        {/* header */}
        <div className="px-5 pt-5 pb-3.5 flex items-start justify-between"
          style={{ borderBottom: `1.5px solid ${phaseColor}20` }}>
          <div>
            <p className="font-semibold text-slate-800 text-[15px]">
              {format(date, 'M월 d일 EEEE', { locale: ko })}
            </p>
            {phase && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-1"
                style={{ background: phaseColor + '18', color: phaseColor }}>
                {getPhaseLabel(phase)}
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* 생리 중 */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">생리 중인가요?</p>
            <div className="flex gap-2">
              {[
                { v: true,  label: '🩸 네, 생리 중' },
                { v: false, label: '✓ 아니요' },
              ].map(({ v, label }) => (
                <button key={String(v)} onClick={() => setPeriod(v)}
                  className={cn(
                    'flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all border',
                    period === v
                      ? v ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-white text-slate-500 border-slate-100 hover:border-rose-200',
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 기분 */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">오늘 기분은?</p>
            <div className="flex gap-1.5">
              {MOODS.map(({ key, emoji, label }) => (
                <button key={key} onClick={() => setMood(mood === key ? '' : key)}
                  className={cn(
                    'flex-1 flex flex-col items-center py-2 rounded-2xl transition-all border',
                    mood === key
                      ? 'bg-amber-50 border-amber-300 shadow-sm'
                      : 'bg-white border-slate-100 hover:border-amber-200',
                  )}>
                  <span className="text-lg leading-none">{emoji}</span>
                  <span className="text-[9px] text-slate-400 mt-0.5">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 통증 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500">통증 강도</p>
              <span className={cn('text-sm font-bold',
                pain === 0 ? 'text-slate-300'
                  : pain <= 3 ? 'text-green-500'
                    : pain <= 6 ? 'text-amber-500'
                      : 'text-rose-500')}>
                {pain === 0 ? '없음' : `${pain} / 10`}
              </span>
            </div>
            <div className="flex gap-1">
              {PAIN_LEVELS.map(n => (
                <button key={n} onClick={() => setPain(pain === n ? 0 : n)}
                  className={cn('flex-1 h-6 rounded-lg transition-all',
                    n <= pain && pain > 0
                      ? n <= 3 ? 'bg-green-400' : n <= 6 ? 'bg-amber-400' : 'bg-rose-500'
                      : 'bg-slate-100 hover:bg-slate-200',
                  )} />
              ))}
            </div>
          </div>

          {/* actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl text-sm text-slate-400 border border-slate-100 hover:border-slate-200 transition-colors">
              취소
            </button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
                boxShadow: '0 4px 16px rgba(244,63,117,0.35)',
              }}>
              저장하기 ✓
            </button>
          </div>

          <button onClick={onOpenFull}
            className="w-full text-center text-[11px] text-slate-300 hover:text-rose-400 transition-colors pb-1">
            더 자세히 기록하기 →
          </button>
        </div>
      </div>
    </>
  )
}
