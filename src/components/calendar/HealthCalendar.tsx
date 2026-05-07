'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Droplets, X, AlertCircle, Pencil, Check } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, addDays
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getCyclePhase, getPhaseColor, getPhaseCellBg, getPhaseLabel } from '@/lib/cycle-utils'
import type { DailyLogFormData, CyclePhase, FlowLevel, ScheduleEvent } from '@/types/health'
import { SCHEDULE_CATEGORY_COLORS, SCHEDULE_CATEGORY_LABELS } from '@/types/health'
import { useSchedule } from '@/hooks/useSchedule'
import { DailyLogModal } from './DailyLogModal'
import { DailyDetailModal } from './DailyDetailModal'

// ── Types ─────────────────────────────────────────────────────────────────────
type CycleMode       = 'normal' | 'pregnancy' | 'menopause' | 'irregular'
type IrregularType   = 'none' | 'frequent' | 'delayed' | 'amenorrhea'

interface ModeData {
  mode: CycleMode
  pregnancyLMP?: string
  menopauseDate?: string
}

const MODE_STORAGE_KEY = 'ludia_cycle_mode_v1'

const MODES: { id: CycleMode; label: string; emoji: string; color: string }[] = [
  { id: 'normal',    label: '일반 모드',   emoji: '🩸', color: '#f43f75' },
  { id: 'pregnancy', label: '임신/출산',  emoji: '🌿', color: '#10b981' },
  { id: 'menopause', label: '완경',       emoji: '🌸', color: '#8b5cf6' },
  { id: 'irregular', label: '무월경/불순', emoji: '⚡', color: '#f59e0b' },
]

// ── Cycle detection helpers ───────────────────────────────────────────────────

/** Find the most recent period start date from logs (first day of a consecutive run). */
function detectCycleStart(logs: Record<string, DailyLogFormData>): Date | undefined {
  const periodKeys = Object.keys(logs)
    .filter(k => logs[k]?.isPeriod)
    .sort()
    .reverse()

  for (const key of periodKeys) {
    const date    = new Date(key)
    const prevKey = format(new Date(date.getTime() - 86400000), 'yyyy-MM-dd')
    if (!logs[prevKey]?.isPeriod) return date
  }
  return undefined
}

/** Detect irregular cycle patterns from logs. */
function detectIrregular(
  logs: Record<string, DailyLogFormData>,
  cycleLength: number,
  lastStart?: Date,
): { type: IrregularType; days: number } {
  if (!lastStart) return { type: 'none', days: 0 }

  const today      = new Date()
  const daysSince  = Math.floor((today.getTime() - lastStart.getTime()) / 86400000)

  if (daysSince >= 90)               return { type: 'amenorrhea', days: daysSince }
  if (daysSince > cycleLength + 10)  return { type: 'delayed',    days: daysSince - cycleLength }

  // Detect all period start dates
  const starts: Date[] = []
  const sorted = Object.keys(logs).filter(k => logs[k]?.isPeriod).sort()
  for (const key of sorted) {
    const date    = new Date(key)
    const prevKey = format(new Date(date.getTime() - 86400000), 'yyyy-MM-dd')
    if (!logs[prevKey]?.isPeriod) starts.push(date)
  }

  for (let i = 1; i < starts.length; i++) {
    const interval = Math.floor((starts[i].getTime() - starts[i - 1].getTime()) / 86400000)
    if (interval < 21) return { type: 'frequent', days: interval }
  }

  return { type: 'none', days: 0 }
}

// ── Cell color helpers ────────────────────────────────────────────────────────
const PHASE_SEL_BG: Record<CyclePhase, string> = {
  menstrual:  '#FF9494',
  follicular: '#B8E0C2',
  ovulation:  '#CEB5F5',
  luteal:     '#FFE89A',
}

function cellBgFor(phase: CyclePhase | undefined, selected: boolean): string | undefined {
  if (!phase) return selected ? 'rgba(244,63,117,0.1)' : undefined
  return selected ? PHASE_SEL_BG[phase] : getPhaseCellBg(phase)
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  logs: Record<string, DailyLogFormData>
  lastPeriodStart?: Date
  cycleLength?: number
  periodLength?: number
  onLogSave: (data: DailyLogFormData) => void
  userName?: string
  cycleMode?: string
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

// ── Pregnancy stage data ──────────────────────────────────────────────────────
interface PregnancyStageData {
  id: string
  minWeek: number
  maxWeek: number
  emoji: string
  title: string
  subtitle: string
  getMessage: (name: string) => string
  nutrients: { name: string; reason: string }[]
  bodyChanges: string[]
  products: { label: string; tag: string; color: string }[]
}

const PREGNANCY_STAGES: PregnancyStageData[] = [
  {
    id: 'early', minWeek: 1, maxWeek: 12,
    emoji: '🌱', title: '임신 초기', subtitle: '1 ~ 12주',
    getMessage: (n) =>
      `${n}님, 새 생명이 싹트기 시작했어요! 아기의 뇌와 심장이 형성되는 가장 중요한 시기예요. 입덧이 힘드시더라도 엽산과 B6는 꼭 챙겨주세요 💜`,
    nutrients: [
      { name: '엽산', reason: '신경관 형성' },
      { name: '비타민 B6', reason: '입덧 완화' },
      { name: '철분', reason: '혈액 생성' },
      { name: '비타민 C', reason: '면역 강화' },
    ],
    bodyChanges: ['입덧', '유방 민감도 ↑', '잦은 소변', '극심한 피로', '감정 기복'],
    products: [
      { label: '루디아 임산부 엽산', tag: '필수', color: '#10b981' },
      { label: '산전 복합비타민', tag: '추천', color: '#6366f1' },
    ],
  },
  {
    id: 'mid', minWeek: 13, maxWeek: 27,
    emoji: '🌿', title: '임신 중기', subtitle: '13 ~ 27주',
    getMessage: (n) =>
      `${n}님, 이제 안정기예요! 입덧도 줄고 에너지가 돌아오는 시기예요. 아기 뇌 발달을 위한 DHA를 놓치지 마세요. 곧 태동을 느끼는 설레는 순간이 다가오고 있어요 🌿`,
    nutrients: [
      { name: 'DHA', reason: '아기 뇌 발달' },
      { name: '철분', reason: '빈혈 예방' },
      { name: '칼슘', reason: '골격 형성' },
      { name: '단백질', reason: '조직 성장' },
    ],
    bodyChanges: ['배가 뚜렷이 커짐', '태동 시작', '허리 통증', '다리 붓기', '피부 변화'],
    products: [
      { label: '루디아 DHA 오메가3', tag: '뇌 발달', color: '#10b981' },
      { label: '임산부 철분제', tag: '필수', color: '#ef4444' },
    ],
  },
  {
    id: 'late', minWeek: 28, maxWeek: 40,
    emoji: '🍃', title: '임신 후기', subtitle: '28 ~ 40주',
    getMessage: (n) =>
      `${n}님, 거의 다 왔어요! 아기도 ${n}님도 마지막 준비를 하고 있어요. 칼슘과 비타민 D로 아기 뼈를 튼튼히 하고 충분한 휴식을 취해주세요 🌙`,
    nutrients: [
      { name: '칼슘', reason: '아기 뼈 발달' },
      { name: '비타민 D', reason: '칼슘 흡수' },
      { name: '식이섬유', reason: '변비 예방' },
      { name: 'DHA', reason: '뇌 완성' },
    ],
    bodyChanges: ['잦은 태동', '골반 압박감', '수면 어려움', '가진통', '부종 심화'],
    products: [
      { label: '루디아 칼슘+D', tag: '추천', color: '#f59e0b' },
      { label: '출산 준비 패키지', tag: 'NEW', color: '#10b981' },
    ],
  },
  {
    id: 'postpartum', minWeek: 41, maxWeek: Infinity,
    emoji: '🌸', title: '산후조리기', subtitle: '출산 후',
    getMessage: (n) =>
      `정말 수고하셨어요, ${n}님! 이제 회복이 가장 중요한 시기예요. 모유 수유 중이시라면 단백질과 요오드를 충분히 챙겨주세요. 루디아가 회복 과정을 함께 지켜볼게요 💜`,
    nutrients: [
      { name: '단백질', reason: '회복 & 모유 생성' },
      { name: '요오드', reason: '모유 수유 지원' },
      { name: '철분', reason: '출혈 후 회복' },
      { name: '오메가3', reason: '산후 우울 완화' },
    ],
    bodyChanges: ['오로 분비', '유방 충혈', '산후 통증', '감정 기복', '호르몬 급변'],
    products: [
      { label: '루디아 산후 복합비타민', tag: '추천', color: '#8b5cf6' },
      { label: '모유 수유 지원 영양제', tag: '인기', color: '#10b981' },
    ],
  },
]

// ── Animation constant ────────────────────────────────────────────────────────
const N_STRIPS = 6

// ── HealthCalendar ────────────────────────────────────────────────────────────
export function HealthCalendar({
  logs, lastPeriodStart, cycleLength = 28, periodLength = 5, onLogSave, userName = '님', cycleMode,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showModal,       setShowModal]       = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [dayMode, setDayMode] = useState<'action' | 'health' | 'schedule' | null>(null)
  const [modeData,     setModeData]     = useState<ModeData>({ mode: 'normal' })
  const [pendingMode,  setPendingMode]  = useState<CycleMode | null>(null)

  // ── Voice schedule state ──
  const { addEvents, getEventsByDate, deleteEvent, updateEvent } = useSchedule()
  const [scheduleSheetDate, setScheduleSheetDate] = useState<Date | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [flipState, setFlipState] = useState<{
    outgoing: Date; incoming: Date; dir: 'next' | 'prev'
  } | null>(null)
  const touchStartX = useRef<number | null>(null)
  const stripRefs   = useRef<(HTMLDivElement | null)[]>(Array(N_STRIPS).fill(null))
  const frontRefs   = useRef<(HTMLDivElement | null)[]>(Array(N_STRIPS).fill(null))
  const shadowRefs  = useRef<(HTMLDivElement | null)[]>(Array(N_STRIPS).fill(null))
  const backRefs    = useRef<(HTMLDivElement | null)[]>(Array(N_STRIPS).fill(null))
  const rafRef      = useRef<number | null>(null)

  function navigateMonth(dir: 'next' | 'prev') {
    if (flipState) return
    const outgoing = currentMonth
    const incoming = dir === 'next' ? addMonths(outgoing, 1) : subMonths(outgoing, 1)
    setCurrentMonth(incoming)
    setFlipState({ outgoing, incoming, dir })
    setTimeout(() => setFlipState(null), 980)
  }

  function navigateToToday() {
    const today = new Date()
    if (isSameMonth(today, currentMonth)) return
    const outgoing = currentMonth
    const dir = today > outgoing ? 'next' : 'prev'
    setCurrentMonth(today)
    setFlipState({ outgoing, incoming: today, dir })
    setTimeout(() => setFlipState(null), 980)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 50) {
      navigateMonth(delta < 0 ? 'next' : 'prev')
    }
    touchStartX.current = null
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY)
      if (saved) setModeData(JSON.parse(saved))
    } catch {}
  }, [])

  // Sync mode from parent (user profile) — takes precedence over localStorage
  useEffect(() => {
    if (cycleMode) {
      setModeData(prev => ({ ...prev, mode: cycleMode as CycleMode }))
    }
  }, [cycleMode])

  // RAF-driven paper curl animation — full 0°→170° with front/back face switching
  useEffect(() => {
    if (!flipState) return

    const dir        = flipState.dir
    const STRIP_ANIM = 700  // ms per strip (0° → ±170°)
    const DELAY_STEP = 50   // ms stagger between strips
    const MAX_ANGLE  = 170
    const start      = performance.now()

    function easeInOut(t: number) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    }

    function tick(now: number) {
      const elapsed = now - start

      for (let i = 0; i < N_STRIPS; i++) {
        const el  = stripRefs.current[i]
        const fnt = frontRefs.current[i]
        const shd = shadowRefs.current[i]
        const bck = backRefs.current[i]
        if (!el) continue

        // rightmost strip leads on 'next'; leftmost leads on 'prev'
        const delay    = dir === 'next' ? (N_STRIPS - 1 - i) * DELAY_STEP : i * DELAY_STEP
        const t        = Math.max(0, elapsed - delay)
        const progress = Math.min(1, t / STRIP_ANIM)
        const eased    = easeInOut(progress)
        const angle    = dir === 'next' ? -MAX_ANGLE * eased : MAX_ANGLE * eased
        const absAngle = Math.abs(angle)

        el.style.transform = `rotateY(${angle}deg)`
        // fade out strip in the final 15° of travel
        el.style.opacity = absAngle > 155 ? String(Math.max(0, 1 - (absAngle - 155) / 15)) : '1'

        if (absAngle < 90) {
          // ── Front face: outgoing content darkens toward the fold ──
          if (fnt) fnt.style.display = 'block'
          if (bck) bck.style.display = 'none'
          if (shd) {
            // shadow gradient deepens on the fold-axis edge
            const dark = (absAngle / 90) * 0.62
            shd.style.background = dir === 'next'
              ? `linear-gradient(to right, rgba(0,0,0,${dark.toFixed(3)}), rgba(0,0,0,${(dark * 0.22).toFixed(3)}))`
              : `linear-gradient(to left,  rgba(0,0,0,${dark.toFixed(3)}), rgba(0,0,0,${(dark * 0.22).toFixed(3)}))`
          }
        } else {
          // ── Back face: translucent paper — incoming calendar shines through ──
          if (fnt) fnt.style.display = 'none'
          if (bck) bck.style.display = 'block'
          if (shd) shd.style.background = 'transparent'
        }
      }

      if (elapsed < STRIP_ANIM + (N_STRIPS - 1) * DELAY_STEP + 16) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [flipState])

  function saveMode(data: ModeData) {
    setModeData(data)
    try { localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(data)) } catch {}
  }

  // Effective cycle start: only from actual logged period data.
  // Colors stay hidden until the user logs their first period day.
  const effectiveCycleStart = useMemo(
    () => detectCycleStart(logs),
    [logs],
  )

  const selectedCycleDay = useMemo(() => {
    if (!selectedDate || !effectiveCycleStart) return 1
    const diff = Math.floor((selectedDate.getTime() - effectiveCycleStart.getTime()) / 86400000)
    return Math.max(1, (diff % cycleLength) + 1)
  }, [selectedDate, effectiveCycleStart, cycleLength])

  // Irregular pattern detection (normal mode only)
  const irregularStatus = useMemo(() => {
    if (modeData.mode !== 'normal') return { type: 'none' as IrregularType, days: 0 }
    return detectIrregular(logs, cycleLength, effectiveCycleStart)
  }, [logs, cycleLength, modeData.mode, effectiveCycleStart])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end   = endOfWeek(endOfMonth(currentMonth),     { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const outgoingDays = useMemo(() => {
    if (!flipState) return []
    const m = flipState.outgoing
    const start = startOfWeek(startOfMonth(m), { weekStartsOn: 0 })
    const end   = endOfWeek(endOfMonth(m),     { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [flipState])

  function getDayPhase(date: Date): CyclePhase | undefined {
    if (!effectiveCycleStart) return undefined
    // Use local-midnight comparison to avoid timezone drift
    const startMidnight = new Date(effectiveCycleStart)
    startMidnight.setHours(0, 0, 0, 0)
    const dayMidnight = new Date(date)
    dayMidnight.setHours(0, 0, 0, 0)
    const diff = Math.round((dayMidnight.getTime() - startMidnight.getTime()) / 86400000)
    // Wrap negative diffs so previous cycles also show phases
    const dayInCycle = ((diff % cycleLength) + cycleLength) % cycleLength
    return getCyclePhase(dayInCycle + 1, cycleLength, periodLength)
  }

  function getKey(date: Date) { return format(date, 'yyyy-MM-dd') }

  const dueDate = modeData.mode === 'pregnancy' && modeData.pregnancyLMP
    ? addDays(new Date(modeData.pregnancyLMP), 280) : null

  const expectedPeriod = effectiveCycleStart ? addDays(effectiveCycleStart, cycleLength) : null

  // Per-cell info for non-normal modes
  function getModeCellInfo(day: Date): {
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
        return { bg: 'rgba(16,185,129,0.13)', label: `${w}주${d > 0 ? d + 'd' : ''}`, isWarning: false, isDue: false }
      }
      return { bg: 'rgba(16,185,129,0.06)', label: null, isWarning: false, isDue: false }
    }
    if (modeData.mode === 'menopause') {
      return { bg: 'rgba(139,92,246,0.10)', label: null, isWarning: false, isDue: false }
    }
    if (modeData.mode === 'irregular' && expectedPeriod) {
      const overdue = Math.floor((day.getTime() - expectedPeriod.getTime()) / 86400000)
      if (overdue > 0) return {
        bg: overdue > 15 ? 'rgba(239,68,68,0.13)' : 'rgba(245,158,11,0.13)',
        label: `D+${overdue}`, isWarning: true, isDue: false,
      }
    }
    return { bg: undefined, label: null, isWarning: false, isDue: false }
  }

  const selectedLog   = selectedDate ? logs[getKey(selectedDate)] : undefined
  const selectedPhase = selectedDate ? getDayPhase(selectedDate) : undefined

  function renderCalGrid(days: Date[], forMonth: Date) {
    return days.map((day, i) => {
      const inMonth    = isSameMonth(day, forMonth)
      const isNow      = isToday(day)
      const isSel      = selectedDate ? isSameDay(day, selectedDate) : false
      const log        = inMonth ? logs[getKey(day)] : undefined
      const phase      = modeData.mode === 'normal' ? getDayPhase(day) : undefined
      const dow        = day.getDay()
      const dayEvents  = inMonth ? getEventsByDate(getKey(day)) : []

      const { bg: modeBg, label: modeLabel, isWarning, isDue } =
        (inMonth && modeData.mode !== 'normal')
          ? getModeCellInfo(day)
          : { bg: undefined, label: null, isWarning: false, isDue: false }

      const isPredicted = inMonth && modeData.mode === 'normal'
        && phase === 'menstrual' && !log?.isPeriod
      const predDayInCycle = isPredicted && effectiveCycleStart
        ? ((Math.floor((day.getTime() - effectiveCycleStart.getTime()) / 86400000)) % cycleLength) + 1
        : 0
      const isPredictedStart = isPredicted && predDayInCycle === 1
      const isPredictedEnd   = isPredicted && predDayInCycle === periodLength

      const background = modeData.mode === 'normal'
        ? isPredicted && !isSel ? 'rgba(255,179,179,0.38)' : cellBgFor(phase, isSel)
        : isSel ? (modeBg?.replace(/[\d.]+\)$/, '0.32)') ?? 'rgba(244,63,117,0.1)') : modeBg

      const ringColor = isDue ? '#f59e0b' : isWarning ? '#ef4444'
        : phase ? getPhaseColor(phase) : '#f43f75'

      return (
        <button key={i}
          onClick={() => {
            if (!inMonth) return
            if (isSel) { setSelectedDate(null); setDayMode(null) }
            else { setSelectedDate(day); setDayMode('action') }
          }}
          disabled={!inMonth}
          className={cn(
            'relative flex flex-col items-center py-1 gap-0.5 transition-all duration-150',
            'min-h-[3.5rem] sm:min-h-[5rem] active:scale-95',
            'border-r border-b border-slate-100',
            !inMonth && 'opacity-0 pointer-events-none',
          )}
          style={{
            background: background ?? 'transparent',
            outline: isPredicted && !isSel ? '1.5px dashed rgba(217,79,92,0.3)' : undefined,
            outlineOffset: '-1px',
            boxShadow: isSel
              ? `inset 0 0 0 2px ${ringColor}`
              : isNow   ? 'inset 0 0 0 2px #f43f75'
                : isDue ? `inset 0 0 0 1.5px #f59e0b88`
                  : undefined,
          }}>
          <span className={cn(
            'text-xs sm:text-sm font-semibold leading-none mt-0.5 z-10',
            isNow
              ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold'
              : isDue  ? 'text-amber-600 font-bold'
                : dow === 0 ? 'text-rose-700'
                  : dow === 6 ? 'text-blue-600'
                    : 'text-slate-700'
          )}>
            {format(day, 'd')}
          </span>
          {isPredictedStart && <span className="text-[7px] font-semibold text-rose-400 leading-none">예상시작</span>}
          {isPredictedEnd   && <span className="text-[7px] font-semibold text-rose-400 leading-none">예상종료</span>}
          {modeLabel && (
            <span className={cn('text-[8px] font-semibold leading-none',
              isWarning ? 'text-amber-700' : isDue ? 'text-amber-600' : 'text-emerald-700')}>
              {modeLabel}
            </span>
          )}
          {log && (
            <>
              <div className="flex items-center gap-0.5 z-10">
                {log.isPeriod && (
                  <span className="text-[10px] leading-none">
                    {log.periodFlow === 'heavy' || log.periodFlow === 'very_heavy' ? '💧💧💧'
                      : log.periodFlow === 'medium' ? '💧💧'
                      : '💧'}
                  </span>
                )}
                {log.mood && (
                  <span className="text-[11px] leading-none">
                    {MOODS.find(m => m.key === log.mood)?.emoji ?? '😊'}
                  </span>
                )}
              </div>
              {(log.hrv != null || log.bmi != null) && (
                <div className="flex flex-col items-center gap-0.5 z-10 w-full">
                  {log.hrv != null && (
                    <span
                      onClick={e => { e.stopPropagation(); setSelectedDate(day); setShowDetailModal(true) }}
                      className="leading-none px-1 rounded cursor-pointer"
                      style={{ fontSize: '8px', color: '#3b82f6', background: 'rgba(59,130,246,0.1)' }}>
                      ♥{log.hrv}ms
                    </span>
                  )}
                  {log.bmi != null && (
                    <span
                      onClick={e => { e.stopPropagation(); setSelectedDate(day); setShowDetailModal(true) }}
                      className="leading-none px-1 rounded cursor-pointer"
                      style={{ fontSize: '8px', color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>
                      ⚖{log.bmi.toFixed(1)}
                    </span>
                  )}
                </div>
              )}
            </>
          )}
          {log?.painIntensity !== undefined && log.painIntensity >= 4 && (
            <div className="w-1.5 h-1.5 rounded-full absolute bottom-1 right-1.5 z-10"
              style={{ backgroundColor: log.painIntensity >= 7 ? '#ef4444' : '#f59e0b' }} />
          )}

          {/* ── Schedule event dots — separate tap target ── */}
          {dayEvents.length > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setScheduleSheetDate(day) }}
              className="flex items-center justify-center gap-0.5 mt-auto z-10 w-full px-0.5 py-0.5 rounded-md transition-colors"
              style={{ background: 'rgba(168,85,247,0.08)' }}
              aria-label="일정 보기"
            >
              {dayEvents.length <= 3
                ? dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.id}
                      className="w-1.5 h-1.5 rounded-full flex-none"
                      style={{ background: SCHEDULE_CATEGORY_COLORS[ev.category] }} />
                  ))
                : (
                  <span className="text-[8px] font-bold"
                    style={{ color: '#a855f7' }}>
                    +{dayEvents.length}
                  </span>
                )
              }
            </button>
          )}
        </button>
      )
    })
  }

  return (
    <>
      <div className="glass-card p-3 sm:p-4 lg:p-5">

        {/* ── Month nav ── */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-lg sm:text-2xl font-semibold text-slate-800">
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </h2>
          <div className="flex gap-1">
            <button onClick={() => navigateMonth('prev')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
            </button>
            <button onClick={navigateToToday}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-medium text-rose-500 transition-colors">
              오늘
            </button>
            <button onClick={() => navigateMonth('next')}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-50 hover:bg-rose-100 flex items-center justify-center transition-colors">
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
            </button>
          </div>
        </div>

        {/* ── Mode info banner ── */}
        <ModeBanner
          modeData={modeData}
          dueDate={dueDate}
          expectedPeriod={expectedPeriod}
          effectiveCycleStart={effectiveCycleStart}
          irregularStatus={irregularStatus}
          userName={userName}
          onSwitchIrregular={() => setPendingMode('irregular')}
        />

        {/* ── Weekday headers ── */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKDAYS.map((day, i) => (
            <div key={day} className={cn('text-center text-[11px] sm:text-xs font-semibold py-1',
              i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400')}>
              {day}
            </div>
          ))}
        </div>

        {/* ── Calendar grid — book page-turn layer ── */}
        <div style={{ position: 'relative', overflow: 'hidden', perspective: '2200px' }}>

          {/* Incoming page — always rendered beneath, sets container height */}
          <div
            className="grid grid-cols-7 border-l border-t border-slate-100"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {renderCalGrid(calendarDays, currentMonth)}
          </div>

          {flipState && (
            <>
              {/* Shadow cast on incoming page */}
              <div style={{
                position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none',
                background: flipState.dir === 'next'
                  ? 'linear-gradient(to left, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.05) 55%, transparent 85%)'
                  : 'linear-gradient(to right, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.05) 55%, transparent 85%)',
                animation: `${flipState.dir === 'next' ? 'book-shadow-next' : 'book-shadow-prev'} 870ms ease-out forwards`,
              }} />

              {/* Paper curl — N_STRIPS strips, each with front/back face */}
              {Array.from({ length: N_STRIPS }, (_, i) => {
                const clipLeft  = (i / N_STRIPS) * 100
                const clipRight = ((N_STRIPS - i - 1) / N_STRIPS) * 100
                return (
                  <div
                    key={i}
                    ref={el => { stripRefs.current[i] = el }}
                    style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: `${(i / N_STRIPS) * 100}%`,
                      width: `${100 / N_STRIPS}%`,
                      zIndex: 10,
                      transformOrigin: flipState.dir === 'next' ? 'left center' : 'right center',
                      pointerEvents: 'none',
                    }}
                  >
                    {/* ── Front face: outgoing month content ── */}
                    <div
                      ref={el => { frontRefs.current[i] = el }}
                      style={{ position: 'absolute', inset: 0 }}
                    >
                      {/* Full-width grid, clipped to this strip's horizontal slice */}
                      <div style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${-i * 100}%`,
                        width: `${N_STRIPS * 100}%`,
                        clipPath: `inset(0 ${clipRight}% 0 ${clipLeft}%)`,
                      }}>
                        <div
                          className="grid grid-cols-7 border-l border-t border-slate-100"
                          style={{ position: 'absolute', inset: 0, backgroundColor: '#ffffff' }}
                        >
                          {renderCalGrid(outgoingDays, flipState.outgoing)}
                        </div>
                      </div>
                      {/* Fold shadow — animated in RAF loop */}
                      <div
                        ref={el => { shadowRefs.current[i] = el }}
                        style={{ position: 'absolute', inset: 0 }}
                      />
                    </div>

                    {/* ── Back face: translucent paper, incoming calendar shines through ── */}
                    <div
                      ref={el => { backRefs.current[i] = el }}
                      style={{
                        position: 'absolute', inset: 0,
                        display: 'none',
                        background: 'linear-gradient(to bottom, rgba(255,252,249,0.60) 0%, rgba(250,247,244,0.56) 100%)',
                        boxShadow: 'inset 0 0 20px rgba(200,190,180,0.25)',
                      }}
                    />
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* ── Phase legend ── */}
        {modeData.mode === 'normal' && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-x-2 gap-y-1">
            {(['menstrual','follicular','ovulation','luteal'] as CyclePhase[]).map(p => (
              <div key={p} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border border-slate-200"
                  style={{ background: getPhaseCellBg(p) }} />
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

      {/* ── Pregnancy stage info card ── */}
      {modeData.mode === 'pregnancy' && modeData.pregnancyLMP && (
        <PregnancyInfoCard lmpDate={modeData.pregnancyLMP} userName={userName} />
      )}

      {/* ── Day action sheet ── */}
      {selectedDate && dayMode === 'action' && (
        <DayActionSheet
          date={selectedDate}
          onHealthLog={() => setDayMode('health')}
          onAddSchedule={() => setDayMode('schedule')}
          onClose={() => { setSelectedDate(null); setDayMode(null) }}
        />
      )}

      {/* ── Quick health log popup ── */}
      {selectedDate && dayMode === 'health' && !showModal && (
        <QuickLogPopup
          date={selectedDate}
          log={selectedLog}
          phase={selectedPhase}
          onSave={(data) => { onLogSave(data); setSelectedDate(null); setDayMode(null) }}
          onClose={() => setDayMode('action')}
          onOpenFull={() => { setShowDetailModal(true); setDayMode(null) }}
        />
      )}

      {/* ── Add schedule sheet ── */}
      {selectedDate && dayMode === 'schedule' && (
        <AddScheduleSheet
          date={selectedDate}
          onSave={(ev) => { addEvents([ev]); setSelectedDate(null); setDayMode(null) }}
          onBack={() => setDayMode('action')}
          onClose={() => { setSelectedDate(null); setDayMode(null) }}
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

      {/* ── Detail / Analysis modal ── */}
      {showDetailModal && selectedDate && (
        <DailyDetailModal
          date={selectedDate}
          log={selectedLog}
          phase={selectedPhase}
          cycleDay={selectedCycleDay}
          logs={logs}
          onSave={(data) => { onLogSave(data); setShowDetailModal(false); setSelectedDate(null) }}
          onClose={() => setShowDetailModal(false)}
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

      {/* ── Schedule sheet ── */}
      {scheduleSheetDate && (
        <ScheduleSheet
          date={scheduleSheetDate}
          events={getEventsByDate(getKey(scheduleSheetDate))}
          onDelete={deleteEvent}
          onUpdate={updateEvent}
          onClose={() => setScheduleSheetDate(null)}
        />
      )}

      {/* ── Toast ── */}
      {toastMsg && (
        <div
          className="fixed bottom-above-nav inset-x-4 mx-auto max-w-sm z-[60] px-4 py-3 rounded-2xl text-sm font-medium text-center shadow-modal pointer-events-none"
          style={{
            background:     'rgba(255,255,255,0.97)',
            border:         '1px solid rgba(244,63,117,0.2)',
            color:          '#64748b',
            backdropFilter: 'blur(16px)',
            animation:      'ludia-msg 0.25s ease-out both',
          }}>
          {toastMsg}
        </div>
      )}
    </>
  )
}

// ── ModeBanner ────────────────────────────────────────────────────────────────
function ModeBanner({ modeData, dueDate, expectedPeriod, effectiveCycleStart,
  irregularStatus, userName, onSwitchIrregular }: {
  modeData: ModeData
  dueDate: Date | null
  expectedPeriod: Date | null
  effectiveCycleStart?: Date
  irregularStatus: { type: IrregularType; days: number }
  userName: string
  onSwitchIrregular: () => void
}) {
  const today = new Date()

  /* ── normal mode: show irregular warning if detected ── */
  if (modeData.mode === 'normal' && irregularStatus.type !== 'none') {
    const MSGS: Record<Exclude<IrregularType, 'none'>, string> = {
      frequent:   `주기가 ${irregularStatus.days}일로 짧아졌어요 (빈발월경)`,
      delayed:    `예정일보다 ${irregularStatus.days}일 늦어지고 있어요 (희발월경)`,
      amenorrhea: `마지막 생리 후 ${irregularStatus.days}일 경과 (무월경)`,
    }
    const msg = MSGS[irregularStatus.type as Exclude<IrregularType, 'none'>]
    return (
      <div className="mb-3 px-3 py-2.5 rounded-2xl"
        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.28)' }}>
        <div className="flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-amber-700">{msg}</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              {userName}님, 몸이 조금 지쳤나 봐요. 호르몬 리듬을 함께 살펴볼게요.
            </p>
          </div>
          <button onClick={onSwitchIrregular}
            className="flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#b45309' }}>
            불순 모드 →
          </button>
        </div>
      </div>
    )
  }

  /* ── pregnancy ── */
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

  /* ── menopause ── */
  if (modeData.mode === 'menopause') {
    const since    = modeData.menopauseDate ? new Date(modeData.menopauseDate) : null
    const months   = since ? Math.floor((today.getTime() - since.getTime()) / (86400000 * 30)) : null
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

  /* ── irregular ── */
  if (modeData.mode === 'irregular') {
    const overdue = expectedPeriod
      ? Math.floor((today.getTime() - expectedPeriod.getTime()) / 86400000)
      : null
    const daysSince = effectiveCycleStart
      ? Math.floor((today.getTime() - effectiveCycleStart.getTime()) / 86400000)
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
    if (daysSince !== null) {
      return (
        <div className="mb-3 px-3 py-2.5 rounded-2xl text-xs leading-relaxed"
          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span className="font-bold text-amber-600">⚡ 마지막 생리 후 {daysSince}일 경과</span>
          <span className="text-amber-500 ml-2">· 호르몬 리듬을 모니터링 중이에요</span>
        </div>
      )
    }
  }

  return null
}

// ── ModeDialog ────────────────────────────────────────────────────────────────
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
      pregnancyLMP:  targetMode === 'pregnancy' ? (lmpDate || undefined) : undefined,
      menopauseDate: targetMode === 'menopause' ? (menopauseDate || undefined) : undefined,
    })
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

        <div className="px-5 pt-5 pb-4"
          style={{ background: modeInfo.color + '0d', borderBottom: `1.5px solid ${modeInfo.color}18` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{modeInfo.emoji}</span>
              <span className="font-bold text-slate-800 text-[15px]">{modeInfo.label}</span>
            </div>
            <button onClick={onCancel}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
          <p className="text-[13px] text-slate-600 leading-relaxed">{MESSAGE[targetMode]}</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {targetMode === 'pregnancy' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">마지막 생리 시작일 (LMP)</label>
              <input type="date" value={lmpDate} onChange={e => setLmpDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl text-sm text-slate-700 outline-none transition-all"
                style={{ background: modeInfo.color + '0a', border: `1.5px solid ${modeInfo.color}35` }} />
              <p className="text-[11px] text-slate-400 mt-1">출산 예정일 자동 계산에 사용돼요</p>
            </div>
          )}
          {targetMode === 'menopause' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">마지막 생리 날짜 (기억나는 경우)</label>
              <input type="date" value={menopauseDate} onChange={e => setMenopauseDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl text-sm text-slate-700 outline-none transition-all"
                style={{ background: modeInfo.color + '0a', border: `1.5px solid ${modeInfo.color}35` }} />
              <p className="text-[11px] text-slate-400 mt-1">모르셔도 괜찮아요. 나중에 설정할 수 있어요</p>
            </div>
          )}
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

// ── QuickLogPopup ─────────────────────────────────────────────────────────────
const FLOW_OPTIONS: { val: FlowLevel; label: string; dots: string }[] = [
  { val: 'light',  label: '라이트', dots: '💧' },
  { val: 'medium', label: '보통',   dots: '💧💧' },
  { val: 'heavy',  label: '많음',   dots: '💧💧💧' },
]

function QuickLogPopup({ date, log, phase, onSave, onClose, onOpenFull }: {
  date: Date
  log?: DailyLogFormData
  phase?: CyclePhase
  onSave: (data: DailyLogFormData) => void
  onClose: () => void
  onOpenFull: () => void
}) {
  const [period, setPeriod] = useState(log?.isPeriod ?? false)
  const [flow,   setFlow]   = useState<FlowLevel | ''>(log?.periodFlow ?? '')
  const [mood,   setMood]   = useState(log?.mood ?? '')
  const [pain,   setPain]   = useState(log?.painIntensity ?? 0)
  const [hrv,    setHrv]    = useState(log?.hrv   != null ? String(log.hrv)   : '')
  const [bmi,    setBmi]    = useState(log?.bmi   != null ? String(log.bmi)   : '')

  const phaseColor = phase ? getPhaseColor(phase) : '#f43f75'

  function handleSave() {
    onSave({
      ...(log ?? {}),
      date:          format(date, 'yyyy-MM-dd'),
      isPeriod:      period,
      periodFlow:    period && flow ? flow as FlowLevel : undefined,
      mood:          mood || undefined,
      painIntensity: pain,
      cyclePhase:    phase,
      hrv:           hrv ? Number(hrv) : undefined,
      bmi:           bmi ? Number(bmi) : undefined,
    } as DailyLogFormData)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.9)' }}>

        {/* Header */}
        <div className="px-5 pt-5 pb-3.5 flex items-start justify-between"
          style={{ borderBottom: `1.5px solid ${phaseColor}20` }}>
          <div>
            <p className="font-semibold text-slate-800 text-[15px]">
              {format(date, 'M월 d일 EEEE', { locale: ko })}
            </p>
            {phase && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-1"
                style={{ background: getPhaseCellBg(phase), color: getPhaseColor(phase) }}>
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

          {/* ── Period ── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">생리 중인가요?</p>
            <div className="flex gap-2 mb-2.5">
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
            {period && (
              <div className="flex gap-1.5">
                {FLOW_OPTIONS.map(({ val, label, dots }) => (
                  <button key={val} onClick={() => setFlow(flow === val ? '' : val)}
                    className={cn('flex-1 flex flex-col items-center py-2 rounded-2xl transition-all border',
                      flow === val ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-100 hover:border-rose-200')}>
                    <span className="text-[13px] leading-none mb-0.5">{dots}</span>
                    <span className={cn('text-[10px]', flow === val ? 'text-rose-500 font-semibold' : 'text-slate-400')}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Mood ── */}
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

          {/* ── Pain ── */}
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

          {/* ── HRV / BMI ── */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">HRV</p>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
                <input
                  type="number" inputMode="decimal" min="0" max="200" step="1"
                  value={hrv}
                  onChange={e => setHrv(e.target.value)}
                  placeholder="기기 입력"
                  className="flex-1 w-0 min-w-0 text-sm font-semibold text-blue-700 bg-transparent outline-none placeholder-blue-300"
                />
                <span className="text-[10px] text-blue-400 flex-shrink-0">ms</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">BMI</p>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <input
                  type="number" inputMode="decimal" min="10" max="60" step="0.1"
                  value={bmi}
                  onChange={e => setBmi(e.target.value)}
                  placeholder="22.1"
                  className="flex-1 w-0 min-w-0 text-sm font-semibold text-emerald-700 bg-transparent outline-none placeholder-emerald-300"
                />
              </div>
            </div>
          </div>

          {/* ── Buttons ── */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-2xl text-sm text-slate-400 border border-slate-100 hover:border-slate-200 transition-colors">
              취소
            </button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #f43f75, #e11d5a)', boxShadow: '0 4px 16px rgba(244,63,117,0.35)' }}>
              저장하기 ✓
            </button>
          </div>

          <button onClick={onOpenFull}
            className="w-full text-center text-[11px] text-slate-300 hover:text-rose-400 transition-colors pb-1">
            정밀 분석 보기 →
          </button>
        </div>
      </div>
    </>
  )
}

// ── PregnancyInfoCard ─────────────────────────────────────────────────────────
function PregnancyInfoCard({ lmpDate, userName }: { lmpDate: string; userName: string }) {
  const lmp   = new Date(lmpDate)
  const today = new Date()
  const diff  = Math.floor((today.getTime() - lmp.getTime()) / 86400000)
  const week  = Math.max(1, Math.floor(diff / 7) + 1)

  const stage = PREGNANCY_STAGES.find(s => week >= s.minWeek && week <= s.maxWeek)
    ?? PREGNANCY_STAGES[PREGNANCY_STAGES.length - 1]

  const accent = stage.id === 'postpartum' ? '#8b5cf6' : '#10b981'

  return (
    <div className="mt-3 rounded-3xl overflow-hidden"
      style={{
        background:  'rgba(255,255,255,0.92)',
        border:      `1px solid ${accent}28`,
        boxShadow:   `0 4px 20px ${accent}10`,
      }}>

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3"
        style={{ background: `${accent}0b`, borderBottom: `1px solid ${accent}18` }}>
        <div className="flex items-start gap-2.5">
          <span className="text-3xl leading-none mt-0.5">{stage.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-800 text-[15px] leading-none">{stage.title}</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${accent}18`, color: accent }}>
                {stage.subtitle}
              </span>
            </div>
            {week < 41 && (
              <p className="text-[11px] font-semibold mt-1" style={{ color: accent }}>
                현재 {week}주차
              </p>
            )}
          </div>
        </div>
        <p className="text-[12px] text-slate-600 leading-relaxed mt-2.5">
          {stage.getMessage(userName)}
        </p>
      </div>

      <div className="px-4 py-3 space-y-3.5">

        {/* ── Nutrients ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">💊 주요 영양소</p>
          <div className="grid grid-cols-2 gap-1.5">
            {stage.nutrients.map(({ name, reason }) => (
              <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: `${accent}0d` }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: accent }} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-700 leading-none">{name}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-none">{reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Body changes ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">🌡 이 시기 몸의 변화</p>
          <div className="flex flex-wrap gap-1.5">
            {stage.bodyChanges.map(change => (
              <span key={change}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(148,163,184,0.12)', color: '#64748b' }}>
                {change}
              </span>
            ))}
          </div>
        </div>

        {/* ── Product recs ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">✨ 루디아 추천</p>
          <div className="flex gap-2">
            {stage.products.map(({ label, tag, color }) => (
              <button key={label}
                className="flex-1 py-2.5 px-3 rounded-2xl text-left transition-all active:scale-95"
                style={{ background: `${color}10`, border: `1px solid ${color}2e` }}>
                <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1"
                  style={{ background: color, color: '#fff' }}>
                  {tag}
                </span>
                <p className="text-[11px] font-semibold text-slate-700 leading-snug">{label}</p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── DayActionSheet ────────────────────────────────────────────────────────────
function DayActionSheet({
  date, onHealthLog, onAddSchedule, onClose,
}: {
  date: Date
  onHealthLog: () => void
  onAddSchedule: () => void
  onClose: () => void
}) {
  const dateLabel = format(date, 'M월 d일 (eee)', { locale: ko })
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed z-50 bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl"
        style={{ background: 'rgba(255,248,252,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(244,63,117,0.1)' }}>
        <div className="px-5 pt-5 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-base font-bold text-slate-800">{dateLabel}</p>
              <p className="text-xs text-slate-400 mt-0.5">무엇을 하시겠어요?</p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onHealthLog}
              className="flex flex-col items-center gap-2.5 py-5 rounded-2xl transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, rgba(244,63,117,0.08), rgba(225,29,90,0.06))', border: '1.5px solid rgba(244,63,117,0.2)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f43f75, #e11d5a)', boxShadow: '0 4px 14px rgba(244,63,117,0.35)' }}>
                <span className="text-xl">🩸</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">생리 체크하기</p>
                <p className="text-[10px] text-slate-400 mt-0.5">몸 상태 기록</p>
              </div>
            </button>

            <button onClick={onAddSchedule}
              className="flex flex-col items-center gap-2.5 py-5 rounded-2xl transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(124,58,237,0.06))', border: '1.5px solid rgba(168,85,247,0.2)' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 4px 14px rgba(168,85,247,0.35)' }}>
                <span className="text-xl">📅</span>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">일정 추가하기</p>
                <p className="text-[10px] text-slate-400 mt-0.5">스케줄 등록</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── AddScheduleSheet ──────────────────────────────────────────────────────────
function AddScheduleSheet({
  date, onSave, onBack, onClose,
}: {
  date: Date
  onSave: (ev: ScheduleEvent) => void
  onBack: () => void
  onClose: () => void
}) {
  const dateStr   = format(date, 'yyyy-MM-dd')
  const dateLabel = format(date, 'M월 d일 (eee)', { locale: ko })
  const [title, setTitle]         = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime]     = useState('10:00')
  const [category, setCategory]   = useState<ScheduleEvent['category']>('other')

  function handleSave() {
    if (!title.trim()) return
    onSave({
      id: `manual-${Date.now()}`,
      date: dateStr,
      startTime,
      endTime,
      title: title.trim(),
      category,
      intensity: 'medium',
      source: 'manual',
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed z-50 bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl"
        style={{ background: 'rgba(255,248,255,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(168,85,247,0.14)' }}>
        <div className="px-5 pt-5 pb-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={onBack}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <div>
                <p className="text-sm font-bold text-slate-800">일정 추가</p>
                <p className="text-xs text-slate-400">{dateLabel}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">일정 이름</p>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="예: 병원 예약, 운동, 회의..."
              className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-purple-400 transition-colors placeholder-slate-300"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">시작 시간</p>
              <input type="time" value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-purple-400 transition-colors" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">종료 시간</p>
              <input type="time" value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-purple-400 transition-colors" />
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2">카테고리</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map(o => {
                const c = SCHEDULE_CATEGORY_COLORS[o.value]
                const active = category === o.value
                return (
                  <button key={o.value} onClick={() => setCategory(o.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
                    style={{
                      background: active ? c + '18' : 'rgba(248,248,250,0.9)',
                      border: `1.5px solid ${active ? c + '55' : 'rgba(200,200,210,0.5)'}`,
                      color: active ? c : '#94a3b8',
                      boxShadow: active ? `0 2px 8px ${c}22` : undefined,
                    }}>
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, #a855f7, #7c3aed)`, boxShadow: title.trim() ? '0 4px 16px rgba(168,85,247,0.4)' : 'none' }}>
            일정 저장하기 ✓
          </button>
        </div>
      </div>
    </>
  )
}

// ── ScheduleSheet ─────────────────────────────────────────────────────────────
function fmtHHMM(t: string) {
  const [h, m] = t.split(':').map(Number)
  if (h === 0)  return `오전 12:${String(m).padStart(2,'0')}`
  if (h < 12)   return `오전 ${h}:${String(m).padStart(2,'0')}`
  if (h === 12) return `오후 12:${String(m).padStart(2,'0')}`
  return `오후 ${h-12}:${String(m).padStart(2,'0')}`
}

const CATEGORY_OPTIONS: { value: ScheduleEvent['category']; label: string }[] = [
  { value: 'work',     label: '업무' },
  { value: 'study',    label: '공부' },
  { value: 'exercise', label: '운동' },
  { value: 'social',   label: '약속' },
  { value: 'medical',  label: '의료' },
  { value: 'rest',     label: '휴식' },
  { value: 'other',    label: '기타' },
]

function ScheduleSheet({
  date, events, onDelete, onUpdate, onClose,
}: {
  date: Date
  events: ScheduleEvent[]
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<ScheduleEvent>) => void
  onClose: () => void
}) {
  const dateLabel = format(date, 'M월 d일 (eee)', { locale: ko })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<ScheduleEvent>>({})

  function startEdit(ev: ScheduleEvent) {
    setEditingId(ev.id)
    setEditForm({ title: ev.title, startTime: ev.startTime, endTime: ev.endTime, category: ev.category })
  }

  function saveEdit(id: string) {
    if (!editForm.title?.trim()) return
    onUpdate(id, editForm)
    setEditingId(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="fixed z-50 bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl"
        style={{
          background: 'rgba(255,248,255,0.98)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(168,85,247,0.14)',
          maxHeight: '80dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 2px 10px rgba(168,85,247,0.3)' }}>
              <span className="text-sm">📅</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{dateLabel} 일정</p>
              <p className="text-xs text-slate-400">{events.length}개의 일정</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center transition-colors hover:bg-slate-200">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">이 날에 등록된 일정이 없어요</p>
          ) : events.map(ev => {
            const color = SCHEDULE_CATEGORY_COLORS[ev.category]
            const isEditing = editingId === ev.id

            return (
              <div key={ev.id}
                className="rounded-2xl overflow-hidden transition-all"
                style={{ background: `${color}0d`, border: `1.5px solid ${isEditing ? color + '55' : color + '2a'}` }}>

                {isEditing ? (
                  /* ── Edit form ── */
                  <div className="px-4 py-3.5 space-y-3">
                    {/* Title */}
                    <input
                      autoFocus
                      value={editForm.title ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="일정 이름"
                      className="w-full text-sm font-semibold text-slate-800 bg-white/80 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 transition-colors"
                    />
                    {/* Time row */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 mb-1 font-medium">시작</p>
                        <input
                          type="time"
                          value={editForm.startTime ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                          className="w-full text-sm text-slate-700 bg-white/80 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 transition-colors"
                        />
                      </div>
                      <span className="text-slate-300 mt-4">–</span>
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 mb-1 font-medium">종료</p>
                        <input
                          type="time"
                          value={editForm.endTime ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))}
                          className="w-full text-sm text-slate-700 bg-white/80 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 transition-colors"
                        />
                      </div>
                    </div>
                    {/* Category */}
                    <select
                      value={editForm.category ?? 'other'}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value as ScheduleEvent['category'] }))}
                      className="w-full text-sm text-slate-700 bg-white/80 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 transition-colors"
                    >
                      {CATEGORY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-2 rounded-xl text-xs text-slate-400 border border-slate-200 transition-colors hover:bg-slate-50">
                        취소
                      </button>
                      <button
                        onClick={() => saveEdit(ev.id)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 transition-all active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 3px 12px rgba(168,85,247,0.35)' }}>
                        <Check className="w-3.5 h-3.5" /> 저장
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── View row ── */
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="w-1 self-stretch rounded-full flex-none" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fmtHHMM(ev.startTime)} – {fmtHHMM(ev.endTime)}
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: `${color}18`, color }}>
                          {SCHEDULE_CATEGORY_LABELS[ev.category]}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => startEdit(ev)}
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-none transition-colors hover:bg-purple-50"
                      aria-label="수정">
                      <Pencil className="w-3.5 h-3.5 text-slate-300 hover:text-purple-400" />
                    </button>
                    <button
                      onClick={() => onDelete(ev.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-none transition-colors hover:bg-red-50"
                      aria-label="삭제">
                      <X className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
