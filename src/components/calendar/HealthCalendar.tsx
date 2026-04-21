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
  { phase: 'menstrual' as CyclePhase, label: '생리기', color: '#f43f75' },
  { phase: 'follicular' as CyclePhase, label: '난포기', color: '#fb923c' },
  { phase: 'ovulation' as CyclePhase, label: '배란기', color: '#22c55e' },
  { phase: 'luteal' as CyclePhase, label: '황체기', color: '#a855f7' },
]

export function HealthCalendar({ logs, lastPeriodStart, cycleLength = 28, periodLength = 5, onLogSave }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  function getDayPhase(date: Date): CyclePhase | undefined {
    if (!lastPeriodStart) return undefined
    const diffDays = Math.floor((date.getTime() - lastPeriodStart.getTime()) / 86400000)
    if (diffDays < 0) return undefined
    const dayInCycle = (diffDays % cycleLength) + 1
    return getCyclePhase(dayInCycle, cycleLength, periodLength)
  }

  function getLogKey(date: Date) {
    return format(date, 'yyyy-MM-dd')
  }

  const selectedLog = selectedDate ? logs[getLogKey(selectedDate)] : undefined
  const selectedPhase = selectedDate ? getDayPhase(selectedDate) : undefined

  // Stats for current month
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
      periodDays,
      loggedDays,
      avgScore: scoreCount > 0 ? Math.round(avgScore / scoreCount) : null,
      totalDays: monthDays.length,
    }
  }, [calendarDays, currentMonth, logs])

  return (
    <div className="flex gap-6">
      {/* Calendar Panel */}
      <div className="flex-1 glass-card p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-800">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">건강 사이클 추적</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors">
              <ChevronLeft className="w-4 h-4 text-rose-500" />
            </button>
            <button onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-medium text-rose-500 transition-colors">
              오늘
            </button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="w-9 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors">
              <ChevronRight className="w-4 h-4 text-rose-500" />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className={cn(
              'text-center text-xs font-semibold py-1',
              i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'
            )}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isCurrentDay = isToday(day)
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
            const key = getLogKey(day)
            const log = logs[key]
            const phase = getDayPhase(day)
            const phaseColor = phase ? getPhaseColor(phase) : null
            const dayOfWeek = day.getDay()

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(isSelected ? null : day)}
                className={cn(
                  'relative aspect-square rounded-2xl flex flex-col items-center justify-start pt-1.5 transition-all duration-200 group overflow-hidden',
                  !isCurrentMonth && 'opacity-25',
                  isSelected
                    ? 'ring-2 ring-rose-400 ring-offset-1 bg-rose-50'
                    : 'hover:bg-rose-50/50',
                  isCurrentDay && !isSelected && 'bg-gradient-to-br from-rose-50 to-pink-50'
                )}
              >
                {/* Phase background stripe */}
                {phase && isCurrentMonth && (
                  <div className="absolute inset-0 opacity-10 rounded-2xl"
                    style={{ backgroundColor: phaseColor ?? undefined }} />
                )}

                {/* Day number */}
                <span className={cn(
                  'text-sm font-medium leading-none relative z-10',
                  isCurrentDay
                    ? 'w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold'
                    : dayOfWeek === 0
                      ? 'text-rose-500'
                      : dayOfWeek === 6
                        ? 'text-blue-400'
                        : 'text-slate-700'
                )}>
                  {format(day, 'd')}
                </span>

                {/* Log indicators */}
                {log && isCurrentMonth && (
                  <div className="flex flex-wrap gap-0.5 mt-1 justify-center relative z-10">
                    {log.isPeriod && (
                      <Droplets className="w-3 h-3 text-rose-400" />
                    )}
                    {log.mood && (
                      <span className="text-[10px]">
                        {log.mood === 'happy' ? '😊' : log.mood === 'sad' ? '😢' : log.mood === 'tired' ? '😴' : log.mood === 'anxious' ? '😰' : '😊'}
                      </span>
                    )}
                    {log.painIntensity && log.painIntensity >= 5 && (
                      <AlertCircle className="w-3 h-3 text-orange-400" />
                    )}
                  </div>
                )}

                {/* Body Score dot */}
                {log?.bodyScore && isCurrentMonth && (
                  <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: log.bodyScore >= 80 ? '#22c55e'
                        : log.bodyScore >= 60 ? '#f59e0b'
                          : '#f43f75'
                    }} />
                )}

                {/* Phase dot at bottom */}
                {phase && isCurrentMonth && !log && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full opacity-50"
                    style={{ backgroundColor: phaseColor ?? undefined }} />
                )}

                {/* Add indicator on hover */}
                {!log && isCurrentMonth && (
                  <Plus className="absolute bottom-1 right-1 w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-rose-100/60 flex items-center justify-between">
          <div className="flex gap-3">
            {PHASE_LEGEND.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-slate-500">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets className="w-3 h-3 text-rose-400" />
            <span className="text-[11px] text-slate-500">생리</span>
          </div>
        </div>
      </div>

      {/* Right Panel: Stats + Selected Day */}
      <div className="w-72 space-y-4">
        {/* Monthly Stats */}
        <div className="glass-card p-5">
          <h3 className="font-display text-base font-semibold text-slate-700 mb-4">이번 달 요약</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Droplets className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <span className="text-sm text-slate-600">생리 일수</span>
              </div>
              <span className="font-bold text-slate-800">{monthStats.periodDays}일</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                  <Sun className="w-3.5 h-3.5 text-green-500" />
                </div>
                <span className="text-sm text-slate-600">기록 일수</span>
              </div>
              <span className="font-bold text-slate-800">{monthStats.loggedDays}일</span>
            </div>
            {monthStats.avgScore !== null && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gold-100 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-gold-500" />
                  </div>
                  <span className="text-sm text-slate-600">평균 바디 스코어</span>
                </div>
                <span className={cn('font-bold', getBodyScoreColor(monthStats.avgScore))}>{monthStats.avgScore}</span>
              </div>
            )}
          </div>

          {/* Logging progress bar */}
          <div className="mt-4 pt-4 border-t border-rose-100/60">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>기록률</span>
              <span className="font-medium text-slate-600">{Math.round(monthStats.loggedDays / new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() * 100)}%</span>
            </div>
            <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round(monthStats.loggedDays / new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Selected Day Detail */}
        {selectedDate && (
          <div className="glass-card p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-rose-400 font-medium">{format(selectedDate, 'M월 d일', { locale: ko })}</p>
                <p className="text-sm font-semibold text-slate-700">{format(selectedDate, 'EEEE', { locale: ko })}</p>
              </div>
              {selectedPhase && (
                <span className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: getPhaseColor(selectedPhase) + '20', color: getPhaseColor(selectedPhase) }}>
                  {getPhaseLabel(selectedPhase)}
                </span>
              )}
            </div>

            {selectedLog ? (
              <div className="space-y-2">
                {selectedLog.bodyScore !== undefined && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs text-slate-500">바디 스코어</span>
                    <span className={cn('font-bold text-lg font-display', getBodyScoreColor(selectedLog.bodyScore))}>
                      {selectedLog.bodyScore}
                    </span>
                  </div>
                )}
                {selectedLog.isPeriod && (
                  <div className="flex items-center gap-2 p-2.5 bg-rose-50 rounded-xl">
                    <Droplets className="w-4 h-4 text-rose-400" />
                    <span className="text-xs text-rose-600">생리 중</span>
                    {selectedLog.periodFlow && (
                      <span className="ml-auto text-xs text-rose-400">{selectedLog.periodFlow}</span>
                    )}
                  </div>
                )}
                {selectedLog.painIntensity !== undefined && selectedLog.painIntensity > 0 && (
                  <div className="flex items-center justify-between p-2.5 bg-orange-50 rounded-xl">
                    <span className="text-xs text-orange-600">통증 강도</span>
                    <span className="font-bold text-orange-600">{selectedLog.painIntensity}/10</span>
                  </div>
                )}
                {selectedLog.mood && (
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                    <Smile className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-600">기분</span>
                    <span className="ml-auto text-sm">{selectedLog.mood === 'happy' ? '😊 행복' : selectedLog.mood === 'calm' ? '😌 평온' : selectedLog.mood}</span>
                  </div>
                )}
                {selectedLog.sleepHours && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-xs text-slate-500">수면</span>
                    <span className="text-xs font-medium text-slate-700">{selectedLog.sleepHours}시간</span>
                  </div>
                )}
                <button
                  onClick={() => setSelectedDate(selectedDate)}
                  className="w-full btn-ghost text-xs py-2 mt-1"
                >
                  수정하기
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-400 mb-3">아직 기록이 없어요</p>
                <button
                  onClick={() => setSelectedDate(selectedDate)}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 mx-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  기록 추가하기
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase Guide */}
        {selectedPhase && (
          <div className="glass-card p-5">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">현재 사이클 가이드</h4>
            {PHASE_LEGEND.map(({ phase, label, color }) => phase === selectedPhase && (
              <div key={phase}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-semibold text-sm text-slate-700">{label}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {phase === 'menstrual' && '자궁 내막이 탈락하는 시기. 충분한 휴식과 철분 보충이 필요합니다. 따뜻한 음식과 온찜질이 도움돼요.'}
                  {phase === 'follicular' && '에스트로겐이 증가하며 에너지가 높아지는 시기. 운동과 창의적인 활동에 좋습니다.'}
                  {phase === 'ovulation' && '가임력이 최고조에 달하는 시기. 기초 체온이 약간 상승합니다. 이 시기 분비물이 달걀 흰자처럼 변합니다.'}
                  {phase === 'luteal' && '프로게스테론이 증가하는 시기. PMS 증상이 나타날 수 있어요. 마그네슘과 비타민 B6가 도움됩니다.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedDate && (
        <DailyLogModal
          date={selectedDate}
          existingLog={selectedLog}
          cyclePhase={selectedPhase}
          onSave={(data) => {
            onLogSave(data)
            setSelectedDate(null)
          }}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}
