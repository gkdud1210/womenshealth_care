'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Droplets,
  Smile, Zap, AlertCircle, Sun
} from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getCyclePhase, getPhaseColor, getPhaseLabel } from '@/lib/cycle-utils'
import { getBodyScoreColor } from '@/lib/body-score'
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
const PHASE_LEGEND = [
  { phase: 'menstrual'  as CyclePhase, label: '생리기', color: '#f43f75' },
  { phase: 'follicular' as CyclePhase, label: '난포기', color: '#fb923c' },
  { phase: 'ovulation'  as CyclePhase, label: '배란기', color: '#22c55e' },
  { phase: 'luteal'     as CyclePhase, label: '황체기', color: '#a855f7' },
]

export function HealthCalendar({ logs, lastPeriodStart, cycleLength = 28, periodLength = 5, onLogSave }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd   = endOfMonth(currentMonth)
    const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  function getDayPhase(date: Date): CyclePhase | undefined {
    if (!lastPeriodStart) return undefined
    const diffDays = Math.floor((date.getTime() - lastPeriodStart.getTime()) / 86400000)
    if (diffDays < 0) return undefined
    return getCyclePhase((diffDays % cycleLength) + 1, cycleLength, periodLength)
  }

  function getLogKey(date: Date) { return format(date, 'yyyy-MM-dd') }

  const selectedLog   = selectedDate ? logs[getLogKey(selectedDate)] : undefined
  const selectedPhase = selectedDate ? getDayPhase(selectedDate) : undefined

  const monthStats = useMemo(() => {
    const monthDays = calendarDays.filter(d => isSameMonth(d, currentMonth))
    let periodDays = 0, loggedDays = 0, avgScore = 0, scoreCount = 0
    monthDays.forEach(d => {
      const log = logs[getLogKey(d)]
      if (log) {
        loggedDays++
        if (log.isPeriod) periodDays++
        if (log.bodyScore) { avgScore += log.bodyScore; scoreCount++ }
      }
    })
    return {
      periodDays, loggedDays,
      avgScore: scoreCount > 0 ? Math.round(avgScore / scoreCount) : null,
      totalDays: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate(),
    }
  }, [calendarDays, currentMonth, logs])

  return (
    <>
      {/* Mobile: stacked, Desktop: side-by-side */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* Calendar Panel */}
        <div className="flex-1 glass-card p-4 sm:p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-800">
                {format(currentMonth, 'yyyy년 M월', { locale: ko })}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">건강 사이클 추적</p>
            </div>
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

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className={cn('text-center text-xs font-semibold py-1',
                i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400')}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {calendarDays.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isCurrentDay   = isToday(day)
              const isSelected     = selectedDate ? isSameDay(day, selectedDate) : false
              const log            = logs[getLogKey(day)]
              const phase          = getDayPhase(day)
              const phaseColor     = phase ? getPhaseColor(phase) : null
              const dayOfWeek      = day.getDay()

              return (
                <button key={idx} onClick={() => setSelectedDate(isSelected ? null : day)}
                  className={cn(
                    'relative aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-start pt-1 sm:pt-1.5 transition-all duration-200 overflow-hidden',
                    !isCurrentMonth && 'opacity-25',
                    isSelected     ? 'ring-2 ring-rose-400 ring-offset-1 bg-rose-50'
                      : 'hover:bg-rose-50/50',
                    isCurrentDay && !isSelected && 'bg-gradient-to-br from-rose-50 to-pink-50'
                  )}>
                  {phase && isCurrentMonth && (
                    <div className="absolute inset-0 opacity-10 rounded-xl sm:rounded-2xl"
                      style={{ backgroundColor: phaseColor ?? undefined }} />
                  )}

                  <span className={cn(
                    'text-xs sm:text-sm font-medium leading-none relative z-10',
                    isCurrentDay
                      ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold'
                      : dayOfWeek === 0 ? 'text-rose-500'
                        : dayOfWeek === 6 ? 'text-blue-400'
                          : 'text-slate-700'
                  )}>
                    {format(day, 'd')}
                  </span>

                  {log && isCurrentMonth && (
                    <div className="flex flex-wrap gap-0 sm:gap-0.5 mt-0.5 justify-center relative z-10">
                      {log.isPeriod && <Droplets className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-400" />}
                      {log.mood && (
                        <span className="text-[8px] sm:text-[10px]">
                          {log.mood === 'happy' ? '😊' : log.mood === 'sad' ? '😢' : log.mood === 'tired' ? '😴' : '😊'}
                        </span>
                      )}
                      {(log.painIntensity ?? 0) >= 5 && (
                        <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-400" />
                      )}
                    </div>
                  )}

                  {log?.bodyScore && isCurrentMonth && (
                    <div className="absolute bottom-0.5 right-0.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full"
                      style={{ backgroundColor: log.bodyScore >= 80 ? '#22c55e' : log.bodyScore >= 60 ? '#f59e0b' : '#f43f75' }} />
                  )}

                  {!log && isCurrentMonth && (
                    <Plus className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 text-slate-300 opacity-0 hover:opacity-100 transition-opacity" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 pt-3 border-t border-rose-100/60 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {PHASE_LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-slate-500">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1 ml-auto">
              <Droplets className="w-2.5 h-2.5 text-rose-400" />
              <span className="text-[10px] text-slate-500">생리</span>
            </div>
          </div>
        </div>

        {/* Right Panel — horizontal scroll on mobile */}
        <div className="lg:w-64 flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0">

          {/* Monthly Stats */}
          <div className="glass-card p-4 flex-shrink-0 w-56 sm:w-64 lg:w-auto">
            <h3 className="card-title mb-3">이번 달 요약</h3>
            <div className="space-y-2.5">
              {[
                { icon: Droplets, label: '생리 일수', value: `${monthStats.periodDays}일`, bg: 'bg-rose-100',  color: 'text-rose-500' },
                { icon: Sun,      label: '기록 일수', value: `${monthStats.loggedDays}일`, bg: 'bg-green-100', color: 'text-green-500' },
                ...(monthStats.avgScore !== null ? [{ icon: Zap, label: '평균 스코어', value: `${monthStats.avgScore}`, bg: 'bg-amber-100', color: 'text-amber-500' }] : []),
              ].map(({ icon: Icon, label, value, bg, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('icon-badge-sm', bg)}>
                      <Icon className={cn('w-3 h-3', color)} />
                    </div>
                    <span className="text-xs text-slate-600">{label}</span>
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-rose-100/60">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>기록률</span>
                <span className="font-medium text-slate-600">
                  {Math.round(monthStats.loggedDays / monthStats.totalDays * 100)}%
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.round(monthStats.loggedDays / monthStats.totalDays * 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Selected Day */}
          {selectedDate && (
            <div className="glass-card p-4 flex-shrink-0 w-56 sm:w-64 lg:w-auto animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-rose-400 font-medium">{format(selectedDate, 'M월 d일', { locale: ko })}</p>
                  <p className="text-sm font-semibold text-slate-700">{format(selectedDate, 'EEEE', { locale: ko })}</p>
                </div>
                {selectedPhase && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: getPhaseColor(selectedPhase) + '20', color: getPhaseColor(selectedPhase) }}>
                    {getPhaseLabel(selectedPhase)}
                  </span>
                )}
              </div>

              {selectedLog ? (
                <div className="space-y-1.5">
                  {selectedLog.bodyScore !== undefined && (
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                      <span className="text-xs text-slate-500">바디 스코어</span>
                      <span className={cn('font-bold text-lg font-display', getBodyScoreColor(selectedLog.bodyScore))}>
                        {selectedLog.bodyScore}
                      </span>
                    </div>
                  )}
                  {selectedLog.isPeriod && (
                    <div className="flex items-center gap-2 p-2 bg-rose-50 rounded-xl">
                      <Droplets className="w-3.5 h-3.5 text-rose-400" />
                      <span className="text-xs text-rose-600">생리 중</span>
                    </div>
                  )}
                  {selectedLog.mood && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                      <Smile className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-600 ml-auto">{selectedLog.mood === 'happy' ? '😊 행복' : selectedLog.mood === 'calm' ? '😌 평온' : selectedLog.mood}</span>
                    </div>
                  )}
                  <button onClick={() => setSelectedDate(selectedDate)}
                    className="w-full btn-ghost text-xs py-1.5 mt-1">
                    수정하기
                  </button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-slate-400 mb-2.5">아직 기록이 없어요</p>
                  <button onClick={() => setSelectedDate(selectedDate)}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 mx-auto">
                    <Plus className="w-3 h-3" />
                    기록 추가
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Phase Guide */}
          {selectedPhase && (
            <div className="glass-card p-4 flex-shrink-0 w-56 sm:w-64 lg:w-auto">
              <p className="label-caps mb-2">사이클 가이드</p>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getPhaseColor(selectedPhase) }} />
                <span className="text-sm font-semibold text-slate-700">{getPhaseLabel(selectedPhase)}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {selectedPhase === 'menstrual'  && '자궁 내막이 탈락하는 시기. 충분한 휴식과 철분 보충이 필요합니다.'}
                {selectedPhase === 'follicular' && '에스트로겐이 증가하며 에너지가 높아지는 시기.'}
                {selectedPhase === 'ovulation'  && '가임력이 최고조. 기초 체온이 약간 상승합니다.'}
                {selectedPhase === 'luteal'     && 'PMS 증상이 나타날 수 있어요. 마그네슘이 도움됩니다.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedDate && (
        <DailyLogModal
          date={selectedDate}
          existingLog={selectedLog}
          cyclePhase={selectedPhase}
          onSave={(data) => { onLogSave(data); setSelectedDate(null) }}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </>
  )
}
