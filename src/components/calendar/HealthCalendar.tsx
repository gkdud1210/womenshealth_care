'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Droplets, X } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, addDays
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getCyclePhase, getPhaseColor, getPhaseLabel } from '@/lib/cycle-utils'
import type { DailyLogFormData, CyclePhase } from '@/types/health'
import { DailyLogModal } from './DailyLogModal'

// ── Types ────────────────────────────────────────────────────────────────────
type CycleMode = 'normal' | 'pregnancy' | 'menopause' | 'irregular'

interface ModeData {
  mode: CycleMode
  pregnancyLMP?: string   // YYYY-MM-DD — last menstrual period
  menopauseDate?: string  // YYYY-MM-DD — when periods stopped
}

const MODE_STORAGE_KEY = 'ludia_cycle_mode_v1'

const MODES: { id: CycleMode; label: string; emoji: string; color: string }[] = [
  { id: 'normal',    label: '일반 모드',  emoji: '🩸', color: '#f43f75' },
  { id: 'pregnancy', label: '임신/출산', emoji: '🌿', color: '#10b981' },
  { id: 'menopause', label: '완경',      emoji: '🌸', color: '#8b5cf6' },
  { id: 'irregular', label: '무월경/불순', emoji: '⚡', color: '#f59e0b' },
]

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  logs: Record<string, DailyLogFormData>
  lastPeriodStart?: Date
  cycleLength?: number
  periodLength?: number
  onLogSave: (data: DailyLogFormData) => void
  userName?: string
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

// ── HealthCalendar ───────────────────────────────────────────────────────────
export function HealthCalendar({
  logs, lastPeriodStart, cycleLength = 28, periodLength = 5, onLogSave, userName = '님'
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showModal, setShowModal]       = useState(false)
  const [modeData, setModeData]         = useState<ModeData>({ mode: 'normal' })
  const [pendingMode, setPendingMode]   = useState<CycleMode | null>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY)
      if (saved) setModeData(JSON.parse(saved))
    } catch {}
  }, [])

  function saveMode(data: ModeData) {
    setModeData(data)
    try { localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(data)) } catch {}
  }

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end   = endOfWeek(endOfMonth(currentMonth),     { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  function getDayPhase(date: Date): CyclePhase | undefined {
    if (!lastPeriodStart) return undefined
    const diff = Math.floor((date.getTime() - lastPeriodStart.getTime()) / 86400000)
    if (diff < 0) return undefined
    return getCyclePhase((diff % cycleLength) + 1, cycleLength, periodLength)
  }

  function getKey(date: Date) { return format(date, 'yyyy-MM-dd') }

  // derived values
  const dueDate = modeData.mode === 'pregnancy' && modeData.pregnancyLMP
    ? addDays(new Date(modeData.pregnancyLMP), 280)
    : null

  const expectedPeriod = lastPeriodStart ? addDays(lastPeriodStart, cycleLength) : null

  // per-cell info based on current mode
  function getCellInfo(day: Date): {
    bg: string | undefined; label: string | null; isWarning: boolean; isDue: boolean
  } {
    if (modeData.mode === 'pregnancy' && modeData.pregnancyLMP) {
      const lmp  = new Date(modeData.pregnancyLMP)
      const diff = Math.floor((day.getTime() - lmp.getTime()) / 86400000)
      const isDue = dueDate ? isSameDay(day, dueDate) : false
      if (isDue) return { bg: 'rgba(245,158,11,0.25)', label: '🎉출산예정', isWarning: false, isDue: true }
      if (diff >= 0 && diff < 290) {
        const w = Math.floor(diff / 7) + 1
        const d = diff % 7
        return { bg: 'rgba(16,185,129,0.12)', label: `${w}주${d > 0 ? d + 'd' : ''}`, isWarning: false, isDue: false }
      }
      return { bg: 'rgba(16,185,129,0.06)', label: null, isWarning: false, isDue: false }
    }

    if (modeData.mode === 'menopause') {
      return { bg: 'rgba(139,92,246,0.10)', label: null, isWarning: false, isDue: false }
    }

    if (modeData.mode === 'irregular' && expectedPeriod) {
      const overdue = Math.floor((day.getTime() - expectedPeriod.getTime()) / 86400000)
      if (overdue > 0) {
        return {
          bg: overdue > 15 ? 'rgba(239,68,68,0.13)' : 'rgba(245,158,11,0.13)',
          label: `D+${overdue}`,
          isWarning: true,
          isDue: false,
        }
      }
    }

    return { bg: undefined, label: null, isWarning: false, isDue: false }
  }

  const selectedLog   = selectedDate ? logs[getKey(selectedDate)] : undefined
  const selectedPhase = selectedDate ? getDayPhase(selectedDate) : undefined

  return (
    <>
      <div className="glass-card p-4 sm:p-5">

        {/* ── Month nav ── */}
        <div className="flex items-center justify-between mb-3">
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

        {/* ── Mode switcher strip ── */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-0.5 scrollbar-none">
          {MODES.map(({ id, label, emoji, color }) => {
            const active = id === modeData.mode
            return (
              <button key={id}
                onClick={() => { if (id !== modeData.mode) setPendingMode(id) }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  background: active ? color + '18' : 'rgba(248,248,250,0.9)',
                  border:     `1.5px solid ${active ? color + '55' : 'rgba(200,200,210,0.5)'}`,
                  color:      active ? color : '#94a3b8',
                  boxShadow:  active ? `0 2px 8px ${color}22` : undefined,
                }}>
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {/* ── Mode info banner ── */}
        <ModeBanner
          modeData={modeData}
          dueDate={dueDate}
          expectedPeriod={expectedPeriod}
          lastPeriodStart={lastPeriodStart}
          userName={userName}
        />

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
            const phase    = modeData.mode === 'normal' ? getDayPhase(day) : undefined
            const phColor  = phase ? getPhaseColor(phase) : '#f43f75'
            const dow      = day.getDay()
            const { bg: modeBg, label: cellLabel, isWarning, isDue } =
              inMonth ? getCellInfo(day) : { bg: undefined, label: null, isWarning: false, isDue: false }

            const cellBg = isSel
              ? (phase ? phaseBg(phase, 0.30) : modeBg ? modeBg.replace(/[\d.]+\)$/, '0.28)') : 'rgba(244,63,117,0.1)')
              : (phase ? phaseBg(phase, 0.15) : modeBg)

            const ringColor = isDue ? '#f59e0b' : isWarning ? '#ef4444' : (phase ? phColor : '#f43f75')

            return (
              <button key={i}
                onClick={() => { if (!inMonth) return; setSelectedDate(isSel ? null : day) }}
                disabled={!inMonth}
                className={cn(
                  'relative rounded-2xl flex flex-col items-center py-1.5 gap-0.5 transition-all duration-150',
                  'min-h-[4.5rem] sm:min-h-[5.5rem] active:scale-95',
                  !inMonth && 'opacity-0 pointer-events-none',
                )}
                style={{
                  background: cellBg,
                  boxShadow: isSel
                    ? `0 0 0 2px ${ringColor}, 0 4px 14px ${ringColor}30`
                    : isNow ? '0 0 0 2px #f43f75'
                      : isDue ? '0 0 0 1.5px #f59e0b88'
                        : undefined,
                }}>

                {/* date number */}
                <span className={cn(
                  'text-sm font-semibold leading-none mt-0.5 z-10',
                  isNow
                    ? 'w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold'
                    : isDue ? 'text-amber-600 font-bold'
                      : dow === 0 ? 'text-rose-600'
                        : dow === 6 ? 'text-blue-500'
                          : 'text-slate-700'
                )}>
                  {format(day, 'd')}
                </span>

                {/* mode extra label (pregnancy week / D+N overdue) */}
                {cellLabel && (
                  <span className={cn(
                    'text-[8px] font-semibold leading-none',
                    isWarning ? 'text-amber-600' : isDue ? 'text-amber-600' : 'text-emerald-600',
                  )}>
                    {cellLabel}
                  </span>
                )}

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

        {/* ── Phase legend (normal only) ── */}
        {modeData.mode === 'normal' && (
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
        )}
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
          onClose={() => setShowModal(false)}
        />
      )}

      {/* ── Mode switch dialog ── */}
      {pendingMode && (
        <ModeDialog
          targetMode={pendingMode}
          userName={userName}
          currentModeData={modeData}
          onConfirm={(data) => { saveMode(data); setPendingMode(null) }}
          onCancel={() => setPendingMode(null)}
        />
      )}
    </>
  )
}

// ── ModeBanner ───────────────────────────────────────────────────────────────
function ModeBanner({ modeData, dueDate, expectedPeriod, lastPeriodStart, userName }: {
  modeData: ModeData
  dueDate: Date | null
  expectedPeriod: Date | null
  lastPeriodStart?: Date
  userName: string
}) {
  const today = new Date()

  if (modeData.mode === 'pregnancy' && modeData.pregnancyLMP) {
    const lmp      = new Date(modeData.pregnancyLMP)
    const diff     = Math.floor((today.getTime() - lmp.getTime()) / 86400000)
    const week     = Math.floor(diff / 7) + 1
    const dayInW   = diff % 7
    const daysLeft = dueDate ? Math.floor((dueDate.getTime() - today.getTime()) / 86400000) : null
    return (
      <div className="mb-3 px-3 py-2.5 rounded-2xl text-xs leading-relaxed"
        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <span className="font-bold text-emerald-700">🌿 현재 임신 {week}주차 {dayInW}일</span>
        {dueDate && daysLeft !== null && (
          <span className="text-emerald-600 ml-2">
            · 출산 예정일 {format(dueDate, 'M월 d일', { locale: ko })}
            <span className="font-semibold"> (D-{Math.max(0, daysLeft)})</span>
          </span>
        )}
      </div>
    )
  }

  if (modeData.mode === 'menopause') {
    const since    = modeData.menopauseDate ? new Date(modeData.menopauseDate) : null
    const daysSince = since ? Math.floor((today.getTime() - since.getTime()) / 86400000) : null
    const months   = daysSince !== null ? Math.floor(daysSince / 30) : null
    return (
      <div className="mb-3 px-3 py-2.5 rounded-2xl text-xs leading-relaxed"
        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
        <span className="font-bold text-purple-700">🌸 완경 모니터링 중</span>
        {months !== null && (
          <span className="text-purple-600 ml-2">· 마지막 생리 후 약 {months}개월 경과</span>
        )}
        <span className="block text-purple-400 mt-0.5">골밀도 · 갑상선 · 혈관 건강을 집중 관리해요</span>
      </div>
    )
  }

  if (modeData.mode === 'irregular') {
    const overdue = expectedPeriod
      ? Math.floor((today.getTime() - expectedPeriod.getTime()) / 86400000)
      : null
    const daysSincePeriod = lastPeriodStart
      ? Math.floor((today.getTime() - lastPeriodStart.getTime()) / 86400000)
      : null

    if (overdue !== null && overdue > 0) {
      return (
        <div className="mb-3 px-3 py-2.5 rounded-2xl text-xs leading-relaxed"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <span className="font-bold text-amber-700">
            ⚡ {userName}님, 예상 주기보다 {overdue}일 늦어지고 있어요
          </span>
          {overdue >= 15 && (
            <span className="block text-amber-600 mt-0.5">
              최근 스트레스가 높지는 않으셨나요? 루디아 기기로 자궁 부위 온도를 체크해보세요
            </span>
          )}
        </div>
      )
    }

    if (daysSincePeriod !== null) {
      return (
        <div className="mb-3 px-3 py-2.5 rounded-2xl text-xs leading-relaxed"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span className="font-bold text-amber-600">⚡ 마지막 생리 후 {daysSincePeriod}일 경과</span>
          <span className="text-amber-500 ml-2">· 호르몬 리듬을 모니터링 중이에요</span>
        </div>
      )
    }
  }

  return null
}

// ── ModeDialog ───────────────────────────────────────────────────────────────
function ModeDialog({ targetMode, userName, currentModeData, onConfirm, onCancel }: {
  targetMode: CycleMode
  userName: string
  currentModeData: ModeData
  onConfirm: (data: ModeData) => void
  onCancel: () => void
}) {
  const [lmpDate,       setLmpDate]       = useState(currentModeData.pregnancyLMP    ?? '')
  const [menopauseDate, setMenopauseDate] = useState(currentModeData.menopauseDate   ?? '')

  const modeInfo = MODES.find(m => m.id === targetMode)!

  const MESSAGE: Record<CycleMode, string> = {
    normal:    `다시 일반 모드로 돌아왔어요. ${userName}님의 생리 주기를 함께 관리할게요 💜`,
    pregnancy: `축하해요, ${userName}님! 이제 루디아가 '예비 엄마' 모드로 전환할게요. 소중한 아이와 ${userName}님의 건강을 위해 매일의 컨디션을 더 세심하게 살펴드릴게요.`,
    menopause: `${userName}님, 새로운 건강 여정의 시작이에요. 루디아가 갱년기 변화를 함께 모니터링하며 최적의 건강 상태를 유지할 수 있도록 도와드릴게요 🌸`,
    irregular: `몸이 조금 지쳤나 봐요. 걱정 마세요, 루디아가 ${userName}님의 호르몬 리듬이 다시 제자리를 찾을 수 있게 원인을 함께 찾아볼게요.`,
  }

  function handleConfirm() {
    onConfirm({
      mode:          targetMode,
      pregnancyLMP:  targetMode === 'pregnancy' ? (lmpDate || undefined)       : undefined,
      menopauseDate: targetMode === 'menopause' ? (menopauseDate || undefined) : undefined,
    })
  }

  const inputStyle = {
    background: modeInfo.color + '0a',
    border:     `1.5px solid ${modeInfo.color}35`,
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onCancel} />

      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background:     'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(24px)',
          border:         `1px solid ${modeInfo.color}20`,
        }}>

        {/* header */}
        <div className="px-5 pt-5 pb-4"
          style={{ background: modeInfo.color + '0d', borderBottom: `1.5px solid ${modeInfo.color}18` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{modeInfo.emoji}</span>
              <span className="font-bold text-slate-800 text-[15px]">{modeInfo.label}</span>
            </div>
            <button onClick={onCancel}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0 transition-colors">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
          <p className="text-[13px] text-slate-600 leading-relaxed">{MESSAGE[targetMode]}</p>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* pregnancy: LMP */}
          {targetMode === 'pregnancy' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                마지막 생리 시작일 (LMP)
              </label>
              <input type="date" value={lmpDate} onChange={e => setLmpDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl text-sm text-slate-700 outline-none transition-all"
                style={inputStyle}
              />
              <p className="text-[11px] text-slate-400 mt-1">출산 예정일 자동 계산에 사용돼요</p>
            </div>
          )}

          {/* menopause: last period */}
          {targetMode === 'menopause' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                마지막 생리 날짜 (기억나는 경우)
              </label>
              <input type="date" value={menopauseDate} onChange={e => setMenopauseDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl text-sm text-slate-700 outline-none transition-all"
                style={inputStyle}
              />
              <p className="text-[11px] text-slate-400 mt-1">모르셔도 괜찮아요. 나중에 설정할 수 있어요</p>
            </div>
          )}

          {/* actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onCancel}
              className="flex-1 py-2.5 rounded-2xl text-sm text-slate-400 border border-slate-100 hover:border-slate-200 transition-colors">
              취소
            </button>
            <button onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${modeInfo.color}, ${modeInfo.color}cc)`,
                boxShadow:  `0 4px 16px ${modeInfo.color}35`,
              }}>
              전환하기
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── QuickLogPopup ────────────────────────────────────────────────────────────
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
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background:     'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(24px)',
          border:         '1px solid rgba(255,255,255,0.9)',
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
              {[{ v: true, label: '🩸 네, 생리 중' }, { v: false, label: '✓ 아니요' }].map(({ v, label }) => (
                <button key={String(v)} onClick={() => setPeriod(v)}
                  className={cn('flex-1 py-2.5 rounded-2xl text-sm font-medium transition-all border',
                    period === v
                      ? v ? 'bg-rose-500 text-white border-rose-500 shadow-sm' : 'bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-white text-slate-500 border-slate-100 hover:border-rose-200')}>
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
                  className={cn('flex-1 flex flex-col items-center py-2 rounded-2xl transition-all border',
                    mood === key ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-white border-slate-100 hover:border-amber-200')}>
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
                pain === 0 ? 'text-slate-300' : pain <= 3 ? 'text-green-500' : pain <= 6 ? 'text-amber-500' : 'text-rose-500')}>
                {pain === 0 ? '없음' : `${pain} / 10`}
              </span>
            </div>
            <div className="flex gap-1">
              {PAIN_LEVELS.map(n => (
                <button key={n} onClick={() => setPain(pain === n ? 0 : n)}
                  className={cn('flex-1 h-6 rounded-lg transition-all',
                    n <= pain && pain > 0
                      ? n <= 3 ? 'bg-green-400' : n <= 6 ? 'bg-amber-400' : 'bg-rose-500'
                      : 'bg-slate-100 hover:bg-slate-200')} />
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
