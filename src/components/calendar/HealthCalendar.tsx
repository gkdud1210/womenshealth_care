'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Droplets, X, AlertCircle, Pencil, Check, Plus } from 'lucide-react'
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
  pregnancyEDD?: string   // estimated due date (display only — LMP is source of truth)
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
  fetalDev: string[]
  nutrients: { name: string; reason: string }[]
  recommendedFoods: { emoji: string; name: string; benefit: string }[]
  bodyChanges: string[]
  products: { label: string; tag: string; color: string }[]
}

const PREGNANCY_STAGES: PregnancyStageData[] = [
  {
    id: 'early', minWeek: 1, maxWeek: 12,
    emoji: '🌱', title: '임신 초기', subtitle: '1 ~ 12주',
    getMessage: (n) =>
      `${n}님, 새 생명이 싹트기 시작했어요! 아기의 뇌와 심장이 형성되는 가장 중요한 시기예요. 입덧이 힘드시더라도 엽산과 B6는 꼭 챙겨주세요 💜`,
    fetalDev: [
      '🫀 심장이 뛰기 시작해요 (4~5주)',
      '🧠 뇌·척수·신경관 형성 중',
      '🖐 작은 팔·다리 싹이 자라요 (6주)',
      '👁 눈·코·입 윤곽 생겨요 (8주)',
      '🦷 손가락·발가락이 뚜렷해져요 (10주)',
      '📏 크기 약 5~6cm, 무게 14g (12주)',
    ],
    nutrients: [
      { name: '엽산', reason: '신경관 형성' },
      { name: '비타민 B6', reason: '입덧 완화' },
      { name: '철분', reason: '혈액 생성' },
      { name: '비타민 C', reason: '면역 강화' },
    ],
    recommendedFoods: [
      { emoji: '🥬', name: '시금치·브로콜리', benefit: '엽산 풍부' },
      { emoji: '🥚', name: '달걀', benefit: '단백질 + 콜린' },
      { emoji: '🍊', name: '오렌지·귤', benefit: '비타민 C · 엽산' },
      { emoji: '🫘', name: '렌틸콩·두부', benefit: '식물성 철분' },
      { emoji: '🥜', name: '아몬드', benefit: '비타민 E · 엽산' },
      { emoji: '🍗', name: '닭가슴살', benefit: '저지방 단백질' },
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
    fetalDev: [
      '👂 엄마 목소리를 들을 수 있어요 (16주)',
      '🤸 태동을 처음 느끼게 돼요 (18~20주)',
      '🦴 뼈가 단단하게 굳어져요',
      '👁 눈꺼풀이 열리기 시작해요 (24주)',
      '💆 뇌 주름과 감각 발달이 빨라요',
      '📏 크기 약 35cm, 무게 900g (27주)',
    ],
    nutrients: [
      { name: 'DHA', reason: '아기 뇌 발달' },
      { name: '철분', reason: '빈혈 예방' },
      { name: '칼슘', reason: '골격 형성' },
      { name: '단백질', reason: '조직 성장' },
    ],
    recommendedFoods: [
      { emoji: '🐟', name: '연어·고등어', benefit: 'DHA 오메가3' },
      { emoji: '🥛', name: '우유·요거트', benefit: '칼슘 + 단백질' },
      { emoji: '🥩', name: '소고기·닭고기', benefit: '헴철 + 단백질' },
      { emoji: '🫐', name: '베리류', benefit: '항산화 비타민' },
      { emoji: '🥦', name: '브로콜리', benefit: '칼슘 · 엽산' },
      { emoji: '🌰', name: '호두', benefit: 'DHA 식물성 공급' },
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
    fetalDev: [
      '🧠 뇌 성장이 가장 빠른 시기예요',
      '🫁 폐가 호흡 연습을 시작해요',
      '🛡 엄마 항체를 받아 면역력이 생겨요',
      '🍑 피부 아래 지방이 쌓여 포동포동해져요',
      '🔄 머리가 아래쪽으로 자리를 잡아요 (36주~)',
      '📏 키 약 47~51cm, 무게 2.5~3.5kg (40주)',
    ],
    nutrients: [
      { name: '칼슘', reason: '아기 뼈 발달' },
      { name: '비타민 D', reason: '칼슘 흡수' },
      { name: '식이섬유', reason: '변비 예방' },
      { name: 'DHA', reason: '뇌 완성' },
    ],
    recommendedFoods: [
      { emoji: '🥑', name: '아보카도', benefit: '건강지방 + 엽산' },
      { emoji: '🍠', name: '고구마', benefit: '식이섬유 + 비타민 A' },
      { emoji: '🌰', name: '호두·아몬드', benefit: '오메가3 + 칼슘' },
      { emoji: '🥛', name: '두유·우유', benefit: '칼슘 + 비타민 D' },
      { emoji: '🫘', name: '검은콩', benefit: '식물성 단백질' },
      { emoji: '🍚', name: '현미밥', benefit: '식이섬유 + 철분' },
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
    fetalDev: [
      '🍼 신생아 수유 리듬 잡기가 중요해요',
      '💤 아기는 하루 16~18시간 잠을 자요',
      '👶 배꼽이 1~2주 안에 떨어져요',
      '🌡 체온 조절이 아직 미숙해요',
      '📸 시력은 30cm 전후를 가장 잘 봐요',
    ],
    nutrients: [
      { name: '단백질', reason: '회복 & 모유 생성' },
      { name: '요오드', reason: '모유 수유 지원' },
      { name: '철분', reason: '출혈 후 회복' },
      { name: '오메가3', reason: '산후 우울 완화' },
    ],
    recommendedFoods: [
      { emoji: '🍲', name: '미역국', benefit: '요오드 + 칼슘 보충' },
      { emoji: '🥩', name: '소고기·돼지족발', benefit: '단백질 + 콜라겐' },
      { emoji: '🐟', name: '가물치·잉어', benefit: '산후 회복 전통 보양식' },
      { emoji: '🫘', name: '검은깨·흑임자', benefit: '철분 + 칼슘' },
      { emoji: '🥜', name: '땅콩·견과류', benefit: '수유 중 에너지' },
      { emoji: '🥚', name: '달걀', benefit: '완전 단백질 + DHA' },
    ],
    bodyChanges: ['오로 분비', '유방 충혈', '산후 통증', '감정 기복', '호르몬 급변'],
    products: [
      { label: '루디아 산후 복합비타민', tag: '추천', color: '#8b5cf6' },
      { label: '모유 수유 지원 영양제', tag: '인기', color: '#10b981' },
    ],
  },
]

// ── Animation duration ───────────────────────────────────────────────────────
const SLIDE_MS = 360

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
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [flipState, setFlipState] = useState<{
    outgoing: Date; incoming: Date; dir: 'next' | 'prev'
  } | null>(null)
  const touchStartX = useRef<number | null>(null)

  // ── Drag-to-select ──────────────────────────────────────────────────────
  const gridRef         = useRef<HTMLDivElement>(null)
  const [selRange,      setSelRange]      = useState<{ start: Date; end: Date } | null>(null)
  const [dragHighlight, setDragHighlight] = useState<{ start: Date; end: Date } | null>(null)
  const dragAnchorRef   = useRef<Date | null>(null)
  const isDraggingRef   = useRef(false)
  const dragMovedRef    = useRef(false)

  function navigateMonth(dir: 'next' | 'prev') {
    if (flipState) return
    const outgoing = currentMonth
    const incoming = dir === 'next' ? addMonths(outgoing, 1) : subMonths(outgoing, 1)
    setCurrentMonth(incoming)
    setFlipState({ outgoing, incoming, dir })
    setTimeout(() => setFlipState(null), SLIDE_MS)
  }

  function navigateToToday() {
    const today = new Date()
    if (isSameMonth(today, currentMonth)) return
    const outgoing = currentMonth
    const dir = today > outgoing ? 'next' : 'prev'
    setCurrentMonth(today)
    setFlipState({ outgoing, incoming: today, dir })
    setTimeout(() => setFlipState(null), SLIDE_MS)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > 50 && !dragMovedRef.current) {
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

  // Sync mode from parent — re-read localStorage so pregnancyLMP/EDD etc. are not lost
  useEffect(() => {
    if (cycleMode) {
      try {
        const saved = localStorage.getItem(MODE_STORAGE_KEY)
        const parsed: ModeData = saved ? JSON.parse(saved) : { mode: cycleMode as CycleMode }
        setModeData({ ...parsed, mode: cycleMode as CycleMode })
      } catch {
        setModeData(prev => ({ ...prev, mode: cycleMode as CycleMode }))
      }
    }
  }, [cycleMode])


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
    if (modeData.mode === 'pregnancy') {
      if (!modeData.pregnancyLMP) {
        return { bg: 'rgba(16,185,129,0.12)', label: null, isWarning: false, isDue: false }
      }
      const lmp   = new Date(modeData.pregnancyLMP)
      const diff  = Math.floor((day.getTime() - lmp.getTime()) / 86400000)
      const isDue = dueDate ? isSameDay(day, dueDate) : false
      if (isDue) return { bg: 'rgba(245,158,11,0.30)', label: '🎉출산예정', isWarning: false, isDue: true }
      if (diff >= 0 && diff < 290) {
        const w = Math.floor(diff / 7) + 1
        const d = diff % 7
        return { bg: 'rgba(16,185,129,0.22)', label: `${w}주${d > 0 ? d + 'd' : ''}`, isWarning: false, isDue: false }
      }
      return { bg: 'rgba(16,185,129,0.10)', label: null, isWarning: false, isDue: false }
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
    // ── 1. Build multi-day chains ──────────────────────────────────────────
    const allInMonth: ScheduleEvent[] = []
    for (const d of days) {
      if (isSameMonth(d, forMonth)) allInMonth.push(...getEventsByDate(getKey(d)))
    }
    const groups = new Map<string, ScheduleEvent[]>()
    for (const ev of allInMonth) {
      const k = `${ev.title}||${ev.category}||${ev.startTime}||${ev.endTime}`
      const arr = groups.get(k) ?? []; arr.push(ev); groups.set(k, arr)
    }
    interface Chain { key: string; title: string; category: ScheduleEvent['category']; startDate: string; endDate: string }
    const chains: Chain[] = []
    const chainIds = new Set<string>()
    for (const [k, evts] of Array.from(groups.entries())) {
      const sorted = evts.slice().sort((a: ScheduleEvent, b: ScheduleEvent) => a.date.localeCompare(b.date))
      let run = [sorted[0]]
      const flush = () => {
        if (run.length >= 2) {
          run.forEach(e => chainIds.add(e.id))
          chains.push({ key: k + run[0].date, title: run[0].title, category: run[0].category, startDate: run[0].date, endDate: run[run.length - 1].date })
        }
      }
      for (let i = 1; i < sorted.length; i++) {
        const diff = Math.round((new Date(sorted[i].date + 'T00:00:00').getTime() - new Date(sorted[i - 1].date + 'T00:00:00').getTime()) / 86400000)
        if (diff === 1) run.push(sorted[i]); else { flush(); run = [sorted[i]] }
      }
      flush()
    }

    // ── 2. Per-week track assignment (so overlapping chains get different vertical slots) ──
    const CHAIN_TOP    = 22   // px below top of cell (below date number)
    const CHAIN_H      = 13   // bar height
    const CHAIN_STRIDE = 15   // CHAIN_H + 2px gap
    const totalWeeks = Math.ceil(days.length / 7)

    // weekTrackMap[w][chainKey] = track index (0, 1, 2 …)
    const weekTrackMaps: Map<string, number>[] = []
    for (let w = 0; w < totalWeeks; w++) {
      const weekDays = days.slice(w * 7, w * 7 + 7)
      const weekStart = weekDays[0]; const weekEnd = weekDays[weekDays.length - 1]
      const overlapping = chains
        .map(c => {
          const cs = new Date(c.startDate + 'T00:00:00'); const ce = new Date(c.endDate + 'T00:00:00')
          if (cs > weekEnd || ce < weekStart) return null
          const dispStart = cs < weekStart ? weekStart : cs
          const dispEnd   = ce > weekEnd   ? weekEnd   : ce
          const si = weekDays.findIndex(d => isSameDay(d, dispStart))
          const ei = weekDays.findIndex(d => isSameDay(d, dispEnd))
          return { ...c, startCol: si >= 0 ? si : 0, endCol: ei >= 0 ? ei : weekDays.length - 1 }
        })
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .sort((a, b) => a.startCol - b.startCol)

      const tracks: number[] = []
      const tMap = new Map<string, number>()
      for (let i = 0; i < overlapping.length; i++) {
        const used = new Set<number>()
        for (let j = 0; j < i; j++) {
          if (overlapping[j].endCol >= overlapping[i].startCol) used.add(tracks[j])
        }
        let t = 0; while (used.has(t)) t++
        tracks.push(t); tMap.set(overlapping[i].key, t)
      }
      weekTrackMaps.push(tMap)
    }

    // ── 3. Render cells (flat array — no strip rows) ───────────────────────
    const result: React.ReactNode[] = []
    for (let w = 0; w < totalWeeks; w++) {
      const weekDays  = days.slice(w * 7, w * 7 + 7)
      const weekStart = weekDays[0]; const weekEnd = weekDays[weekDays.length - 1]
      const tMap      = weekTrackMaps[w]

      result.push(
        ...weekDays.map((day, ci) => {
          const gi      = w * 7 + ci
          const inMonth = isSameMonth(day, forMonth)
          const dayKey  = getKey(day)
          const isNow   = isToday(day)

          // Chains that overlap THIS cell (for rendering a segment inside it)
          const cellChains = !inMonth ? [] : chains
            .filter(c => c.startDate <= dayKey && c.endDate >= dayKey)
            .map(c => {
              const cs = new Date(c.startDate + 'T00:00:00')
              const ce = new Date(c.endDate   + 'T00:00:00')
              const dispStart = cs < weekStart ? weekStart : cs
              const dispEnd   = ce > weekEnd   ? weekEnd   : ce
              return {
                c, track: tMap.get(c.key) ?? 0,
                isFirstInWeek: isSameDay(dispStart, day),  // show title here
                isLastInWeek:  isSameDay(dispEnd,   day),  // show rounded end
                isActualStart: c.startDate === dayKey,
                isActualEnd:   c.endDate   === dayKey,
                continuesRight: !isSameDay(ce, dispEnd),   // chain continues past this week
              }
            })
            .sort((a, b) => a.track - b.track)

          const maxTrack = cellChains.length ? Math.max(...cellChains.map(b => b.track)) : -1

          const activeRange = dragHighlight ?? selRange
          const isInRange   = inMonth && !!activeRange
            && day.getTime() >= activeRange.start.getTime()
            && day.getTime() <= activeRange.end.getTime()
          const isSel      = inMonth && (isInRange
            ? isSameDay(day, activeRange!.start) || isSameDay(day, activeRange!.end)
            : (selectedDate ? isSameDay(day, selectedDate) : false))
          const isRangeMid = isInRange && !isSel
          const log        = inMonth ? logs[dayKey] : undefined
          const phase      = modeData.mode === 'normal' ? getDayPhase(day) : undefined
          const dow        = day.getDay()
          const dayEvents  = inMonth ? getEventsByDate(dayKey).filter(ev => !chainIds.has(ev.id)) : []
          const { bg: modeBg, label: modeLabel, isWarning, isDue } = (inMonth && modeData.mode !== 'normal')
            ? getModeCellInfo(day) : { bg: undefined, label: null, isWarning: false, isDue: false }
          const isPregnancyMode = modeData.mode === 'pregnancy'
          const isPredicted = inMonth && modeData.mode === 'normal' && phase === 'menstrual' && !log?.isPeriod
          const predDayInCycle = isPredicted && effectiveCycleStart
            ? ((Math.floor((day.getTime() - effectiveCycleStart.getTime()) / 86400000)) % cycleLength) + 1 : 0
          const isPredictedStart = isPredicted && predDayInCycle === 1
          const isPredictedEnd   = isPredicted && predDayInCycle === periodLength
          // 셀 배경: 범위 선택·출산예정일만 표시, 나머지는 흰색 유지
          const background = isRangeMid ? 'rgba(168,85,247,0.12)'
            : isDue ? 'rgba(245,158,11,0.12)'
            : undefined
          const ringColor = isDue ? '#f59e0b' : isWarning ? '#ef4444'
            : isPregnancyMode ? '#10b981' : phase ? getPhaseColor(phase) : '#f43f75'

          // 날짜 숫자 원형 배경 (phase 색상 → 숫자만 색 표시)
          const numCircleBg = isNow ? undefined
            : phase ? getPhaseCellBg(phase)
            : undefined
          const numColor = isNow ? undefined
            : isDue ? '#b45309'
            : phase ? getPhaseColor(phase)
            : dow === 0 ? '#f43f75'
            : dow === 6 ? '#3b82f6'
            : isSel ? '#1e293b'
            : '#475569'

          // Top offset for single-day events (below chains)
          const singleEventTop = CHAIN_TOP + (maxTrack + 1) * CHAIN_STRIDE

          return (
            <button key={gi}
              data-date={inMonth ? dayKey : ''}
              disabled={!inMonth}
              className={cn(
                'relative flex flex-col items-center py-1 gap-0 transition-all duration-150',
                'min-h-[4.5rem] sm:min-h-[5.5rem]',
                'border-r border-b border-slate-100',
                !inMonth && 'opacity-0 pointer-events-none',
              )}
              style={{
                background: background ?? 'transparent',
                // 예상 생리일: 셀 테두리만 점선 (배경색 없음)
                outline: isPredicted && !isSel ? '1.5px dashed rgba(217,79,92,0.25)' : undefined,
                outlineOffset: '-1px',
                // 선택 시 ring만 표시 (배경색 없이도 선택 인식)
                boxShadow: isSel ? `inset 0 0 0 2px ${ringColor}` : undefined,
              }}>

              {/* Date number — 원형 배경으로 phase 색상 표시, 셀 자체는 흰색 유지 */}
              <span className={cn(
                'relative z-10 flex items-center justify-center rounded-full',
                'w-6 h-6 sm:w-7 sm:h-7 text-[11px] sm:text-xs leading-none mt-0.5',
                isNow ? 'text-white font-black' : isSel ? 'font-black' : 'font-semibold',
              )}
              style={isNow
                ? (isPregnancyMode
                    ? { background: 'linear-gradient(135deg, #10b981, #34d399)', boxShadow: '0 2px 8px rgba(16,185,129,0.50)' }
                    : { background: 'linear-gradient(135deg, #f43f75, #a855f7)', boxShadow: '0 2px 8px rgba(244,63,117,0.45)' }
                  )
                : { background: numCircleBg, color: numColor }
              }>
                {format(day, 'd')}
              </span>
              {isPredictedStart && <span className="relative z-10 text-[7px] font-semibold text-rose-400 leading-none">예상시작</span>}
              {isPredictedEnd   && <span className="relative z-10 text-[7px] font-semibold text-rose-400 leading-none">예상종료</span>}
              {modeLabel && (
                <span className={cn('relative z-10 text-[8px] font-semibold leading-none',
                  isWarning ? 'text-amber-700' : isDue ? 'text-amber-600' : 'text-emerald-700')}>
                  {modeLabel}
                </span>
              )}

              {/* Health indicators — placed at bottom of cell */}
              {log && (
                <div className="absolute bottom-1 flex flex-col items-center gap-0.5 z-10 w-full pointer-events-none">
                  {log.mood && <span className="text-[11px] leading-none">{MOODS.find(m => m.key === log.mood)?.emoji ?? '😊'}</span>}
                  {log.isPeriod && !log.mood && (
                    <span className="text-[9px] leading-none">
                      {log.periodFlow === 'heavy' || log.periodFlow === 'very_heavy' ? '💧💧' : log.periodFlow === 'medium' ? '💧💧' : '💧'}
                    </span>
                  )}
                  {log.hrv != null && (
                    <span className="leading-none px-1 rounded-md pointer-events-auto"
                      style={{ fontSize: '7px', color: '#3b82f6', background: 'rgba(59,130,246,0.12)' }}
                      onClick={e => { e.stopPropagation(); setSelectedDate(day); setShowDetailModal(true) }}>
                      ♥{log.hrv}
                    </span>
                  )}
                </div>
              )}
              {log?.painIntensity !== undefined && log.painIntensity >= 4 && (
                <div className="w-1.5 h-1.5 rounded-full absolute top-1 right-1 z-10"
                  style={{ backgroundColor: log.painIntensity >= 7 ? '#ef4444' : '#f59e0b' }} />
              )}

              {/* ── Multi-day chain bar segment ──────────────────────────── */}
              {/* Each cell renders its OWN segment. Same track = same top = visually connected across cells */}
              {cellChains.map(({ c, track, isFirstInWeek, isLastInWeek, isActualStart, isActualEnd, continuesRight }) => {
                const color = SCHEDULE_CATEGORY_COLORS[c.category]
                const rL    = isActualStart ? '4px' : '0'
                const rR    = isActualEnd   ? '4px' : '0'
                return (
                  <div key={c.key} style={{
                    position: 'absolute',
                    left: 0, right: 0,
                    top:    CHAIN_TOP + track * CHAIN_STRIDE,
                    height: CHAIN_H,
                    background:   color + '22',
                    borderRadius: `${rL} ${rR} ${rR} ${rL}`,
                    borderLeft:   isActualStart ? `3px solid ${color}` : 'none',
                    borderTop:    `1px solid ${color}2a`,
                    borderBottom: `1px solid ${color}2a`,
                    borderRight:  isActualEnd   ? `1px solid ${color}2a` : 'none',
                    display: 'flex', alignItems: 'center',
                    paddingLeft: isActualStart ? 4 : 2, paddingRight: 2,
                    zIndex: 3, pointerEvents: 'none', overflow: 'hidden',
                  }}>
                    {isFirstInWeek && (
                      <span style={{ fontSize: '9px', fontWeight: 700, color, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.title}
                      </span>
                    )}
                    {/* › only at the last visible cell in the week when chain continues */}
                    {isLastInWeek && continuesRight && (
                      <span style={{ fontSize: '8px', color: color + '99', flexShrink: 0, marginLeft: 'auto' }}>›</span>
                    )}
                  </div>
                )
              })}

              {/* Single-day event bars — positioned below chains */}
              {dayEvents.slice(0, 2).map((ev, ei) => (
                <div key={ev.id} style={{
                  position: 'absolute', left: 2, right: 2,
                  top: singleEventTop + ei * 15,
                  zIndex: 4, pointerEvents: 'none',
                }}>
                  <div className="rounded-[3px] text-[7px] sm:text-[8px] font-semibold px-1 py-0.5 truncate leading-tight"
                    style={{ background: SCHEDULE_CATEGORY_COLORS[ev.category] + '28', color: SCHEDULE_CATEGORY_COLORS[ev.category] }}>
                    {ev.title}
                  </div>
                </div>
              ))}
              {dayEvents.length > 2 && (
                <span style={{ position: 'absolute', bottom: 1, left: 2, fontSize: '7px', fontWeight: 700, color: '#a855f7', zIndex: 4 }}>
                  +{dayEvents.length - 2}
                </span>
              )}
            </button>
          )
        })
      )
    }
    return result
  }

  return (
    <>
      <div className="glass-card p-3 sm:p-4 lg:p-5">

        {/* ── Month nav ── */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">
              {format(currentMonth, 'M월', { locale: ko })}
              <span className="text-slate-400 font-medium text-base sm:text-lg ml-1.5">
                {format(currentMonth, 'yyyy', { locale: ko })}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigateMonth('prev')}
              className="w-8 h-8 rounded-2xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: 'rgba(244,63,117,0.08)', border: '1px solid rgba(244,63,117,0.15)' }}>
              <ChevronLeft className="w-4 h-4 text-rose-500" />
            </button>
            <button onClick={navigateToToday}
              className="px-3 py-1.5 rounded-2xl text-xs font-bold transition-all active:scale-95"
              style={{ background: 'rgba(244,63,117,0.08)', color: '#f43f75', border: '1px solid rgba(244,63,117,0.15)' }}>
              오늘
            </button>
            <button onClick={() => navigateMonth('next')}
              className="w-8 h-8 rounded-2xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: 'rgba(244,63,117,0.08)', border: '1px solid rgba(244,63,117,0.15)' }}>
              <ChevronRight className="w-4 h-4 text-rose-500" />
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

        {/* ── Calendar grid — slide animation ── */}
        <div
          ref={gridRef}
          style={{ position: 'relative', overflow: 'hidden', userSelect: 'none', touchAction: isDraggingRef.current ? 'none' : 'pan-y' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onPointerDown={e => {
            const dateStr = (e.target as HTMLElement).closest('[data-date]')?.getAttribute('data-date')
            if (!dateStr) return
            const d = new Date(dateStr + 'T00:00:00')
            isDraggingRef.current = true
            dragMovedRef.current  = false
            dragAnchorRef.current = d
            setDragHighlight({ start: d, end: d })
            gridRef.current?.setPointerCapture(e.pointerId)
          }}
          onPointerMove={e => {
            if (!isDraggingRef.current || !dragAnchorRef.current) return
            const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
            const dateStr = el?.closest('[data-date]')?.getAttribute('data-date')
            if (!dateStr) return
            const d      = new Date(dateStr + 'T00:00:00')
            const anchor = dragAnchorRef.current
            if (!isSameDay(d, anchor)) dragMovedRef.current = true
            const start  = d < anchor ? d : anchor
            const end    = d < anchor ? anchor : d
            setDragHighlight({ start, end })
          }}
          onPointerUp={e => {
            if (!isDraggingRef.current) return
            gridRef.current?.releasePointerCapture(e.pointerId)
            isDraggingRef.current = false
            const anchor = dragAnchorRef.current
            dragAnchorRef.current = null
            setDragHighlight(null)
            if (!anchor) return

            const el      = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
            const dateStr = el?.closest('[data-date]')?.getAttribute('data-date')
            const endDay  = dateStr ? new Date(dateStr + 'T00:00:00') : anchor
            const start   = endDay < anchor ? endDay : anchor
            const end     = endDay < anchor ? anchor : endDay

            if (!dragMovedRef.current) {
              const isSameAsPrev = selRange
                && isSameDay(selRange.start, start) && isSameDay(selRange.end, start)
              if (isSameAsPrev) {
                setSelRange(null); setSelectedDate(null); setDayMode(null)
              } else {
                setSelRange({ start, end: start })
                setSelectedDate(start); setDayMode('action')
              }
            } else {
              setSelRange({ start, end })
              setSelectedDate(start); setDayMode('action')
            }
          }}
          onPointerCancel={() => {
            isDraggingRef.current = false
            dragAnchorRef.current = null
            setDragHighlight(null)
          }}
        >
          <style>{`
            @keyframes cal-slide-in-next  { from { transform: translateX(100%) } to { transform: translateX(0) } }
            @keyframes cal-slide-out-next { from { transform: translateX(0)    } to { transform: translateX(-100%) } }
            @keyframes cal-slide-in-prev  { from { transform: translateX(-100%) } to { transform: translateX(0) } }
            @keyframes cal-slide-out-prev { from { transform: translateX(0)    } to { transform: translateX(100%) } }
          `}</style>

          {/* Incoming page */}
          <div
            className="grid grid-cols-7 border-l border-t border-slate-100"
            style={flipState ? {
              animation: `cal-slide-in-${flipState.dir} ${SLIDE_MS}ms cubic-bezier(0.32,0,0.18,1) both`,
            } : undefined}
          >
            {renderCalGrid(calendarDays, currentMonth)}
          </div>

          {/* Outgoing page — absolutely positioned on top while animating out */}
          {flipState && (
            <div
              className="grid grid-cols-7 border-l border-t border-slate-100"
              style={{
                position: 'absolute', inset: 0, backgroundColor: '#ffffff',
                animation: `cal-slide-out-${flipState.dir} ${SLIDE_MS}ms cubic-bezier(0.32,0,0.18,1) both`,
              }}
            >
              {renderCalGrid(outgoingDays, flipState.outgoing)}
            </div>
          )}
        </div>

        {/* ── Phase legend ── */}
        {modeData.mode === 'normal' && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
            {(['menstrual','follicular','ovulation','luteal'] as CyclePhase[]).map(p => (
              <div key={p}
                className="flex items-center gap-1 px-2 py-1 rounded-full"
                style={{ background: getPhaseCellBg(p), border: `1px solid ${getPhaseColor(p)}22` }}>
                <div className="w-1.5 h-1.5 rounded-full flex-none"
                  style={{ background: getPhaseColor(p) }} />
                <span className="text-[10px] font-medium" style={{ color: getPhaseColor(p) }}>
                  {getPhaseLabel(p)}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full ml-auto"
              style={{ background: 'rgba(244,63,117,0.06)', border: '1px solid rgba(244,63,117,0.15)' }}>
              <Droplets className="w-2.5 h-2.5 text-rose-400" />
              <span className="text-[10px] font-medium text-rose-400">생리일</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Pregnancy stage info card ── */}
      {modeData.mode === 'pregnancy' && modeData.pregnancyLMP && (
        <PregnancyInfoCard lmpDate={modeData.pregnancyLMP} userName={userName} />
      )}

      {/* ── Day event panel ── */}
      {selectedDate && dayMode === 'action' && selRange && (
        <DayEventPanel
          selRange={selRange}
          events={
            isSameDay(selRange.start, selRange.end)
              ? getEventsByDate(getKey(selRange.start))
              : eachDayOfInterval({ start: selRange.start, end: selRange.end })
                  .flatMap(d => getEventsByDate(getKey(d)))
          }
          log={selectedLog}
          phase={selectedPhase}
          onDeleteEvent={deleteEvent}
          onUpdateEvent={updateEvent}
          onAddEvents={addEvents}
          onHealthLog={() => setDayMode('health')}
          onClose={() => { setSelRange(null); setSelectedDate(null); setDayMode(null) }}
        />
      )}

      {/* ── Quick health log popup ── */}
      {selectedDate && dayMode === 'health' && !showModal && (
        <QuickLogPopup
          date={selectedDate}
          log={selectedLog}
          logs={logs}
          phase={selectedPhase}
          onSave={(data) => { onLogSave(data); setSelectedDate(null); setDayMode(null) }}
          onClose={() => setDayMode('action')}
          onOpenFull={() => { setShowDetailModal(true); setDayMode(null) }}
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
  const [eddDate,       setEddDate]       = useState(currentModeData.pregnancyEDD    ?? '')
  const [dateInputMode, setDateInputMode] = useState<'lmp' | 'edd'>('lmp')
  const [menopauseDate, setMenopauseDate] = useState(currentModeData.menopauseDate   ?? '')

  const modeInfo = MODES.find(m => m.id === targetMode)!

  // Sync LMP ↔ EDD when one changes
  function handleLmpChange(val: string) {
    setLmpDate(val)
    if (val) {
      const edd = new Date(val + 'T00:00:00')
      edd.setDate(edd.getDate() + 280)
      setEddDate(edd.toISOString().split('T')[0])
    } else {
      setEddDate('')
    }
  }
  function handleEddChange(val: string) {
    setEddDate(val)
    if (val) {
      const lmp = new Date(val + 'T00:00:00')
      lmp.setDate(lmp.getDate() - 280)
      setLmpDate(lmp.toISOString().split('T')[0])
    } else {
      setLmpDate('')
    }
  }

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
      pregnancyEDD:  targetMode === 'pregnancy' ? (eddDate || undefined) : undefined,
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
            <div className="space-y-2.5">
              {/* Tab toggle */}
              <div className="flex rounded-xl overflow-hidden border"
                style={{ borderColor: modeInfo.color + '30' }}>
                {(['lmp', 'edd'] as const).map(tab => (
                  <button key={tab}
                    onClick={() => setDateInputMode(tab)}
                    className="flex-1 py-2 text-xs font-semibold transition-all"
                    style={dateInputMode === tab
                      ? { background: modeInfo.color, color: '#fff' }
                      : { background: modeInfo.color + '08', color: '#64748b' }
                    }>
                    {tab === 'lmp' ? '마지막 생리일' : '출산 예정일'}
                  </button>
                ))}
              </div>

              {dateInputMode === 'lmp' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">마지막 생리 시작일 (LMP)</label>
                  <input type="date" value={lmpDate} onChange={e => handleLmpChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl text-sm text-slate-700 outline-none transition-all"
                    style={{ background: modeInfo.color + '0a', border: `1.5px solid ${modeInfo.color}35` }} />
                  {eddDate && (
                    <p className="text-[11px] mt-1.5 font-semibold" style={{ color: modeInfo.color }}>
                      출산 예정일: {new Date(eddDate + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">출산 예정일 (EDD)</label>
                  <input type="date" value={eddDate} onChange={e => handleEddChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl text-sm text-slate-700 outline-none transition-all"
                    style={{ background: modeInfo.color + '0a', border: `1.5px solid ${modeInfo.color}35` }} />
                  {lmpDate && (
                    <p className="text-[11px] mt-1.5 font-semibold" style={{ color: modeInfo.color }}>
                      마지막 생리일: {new Date(lmpDate + 'T00:00:00').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
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

function calcAvgPeriodLength(logs: Record<string, DailyLogFormData>): number | null {
  const periodKeys = Object.keys(logs).filter(k => logs[k]?.isPeriod).sort()
  if (periodKeys.length === 0) return null

  // Find all period runs (consecutive days)
  const runs: number[] = []
  let runStart: string | null = null
  let runLen = 0

  for (const key of periodKeys) {
    const prev = format(new Date(new Date(key).getTime() - 86400000), 'yyyy-MM-dd')
    if (logs[prev]?.isPeriod) {
      runLen++
    } else {
      if (runStart !== null) runs.push(runLen)
      runStart = key
      runLen = 1
    }
  }
  if (runStart !== null) runs.push(runLen)

  if (runs.length === 0) return null
  return Math.round(runs.reduce((a, b) => a + b, 0) / runs.length)
}

function QuickLogPopup({ date, log, logs, phase, onSave, onClose, onOpenFull }: {
  date: Date
  log?: DailyLogFormData
  logs: Record<string, DailyLogFormData>
  phase?: CyclePhase
  onSave: (data: DailyLogFormData) => void
  onClose: () => void
  onOpenFull: () => void
}) {
  const [period,      setPeriod]      = useState(log?.isPeriod    ?? false)
  const [isPeriodEnd, setIsPeriodEnd] = useState(log?.isPeriodEnd ?? false)
  const [flow,        setFlow]        = useState<FlowLevel | ''>(log?.periodFlow ?? '')
  const [mood,        setMood]        = useState(log?.mood ?? '')
  const [pain,        setPain]        = useState(log?.painIntensity ?? 0)
  const [hrv,         setHrv]         = useState(log?.hrv != null ? String(log.hrv) : '')
  const [bmi,         setBmi]         = useState(log?.bmi != null ? String(log.bmi) : '')

  const phaseColor = phase ? getPhaseColor(phase) : '#f43f75'
  const avgPeriodLen = calcAvgPeriodLength(logs)

  function handleSave() {
    onSave({
      ...(log ?? {}),
      date:          format(date, 'yyyy-MM-dd'),
      isPeriod:      period,
      isPeriodEnd:   period ? isPeriodEnd : false,
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
              <>
                <div className="flex gap-1.5 mb-2.5">
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

                {/* Period end toggle */}
                <button
                  onClick={() => setIsPeriodEnd(v => !v)}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all border text-sm',
                    isPeriodEnd
                      ? 'bg-rose-50 border-rose-300'
                      : 'bg-white border-slate-100 hover:border-rose-200',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔴</span>
                    <span className={cn('font-medium', isPeriodEnd ? 'text-rose-600' : 'text-slate-600')}>
                      이 날이 생리 마지막 날이에요
                    </span>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                    isPeriodEnd ? 'bg-rose-500' : 'border-2 border-slate-200',
                  )}>
                    {isPeriodEnd && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
                {avgPeriodLen !== null && (
                  <p className="text-[11px] text-slate-400 text-right mt-1 pr-1">
                    평균 생리 기간: <span className="font-semibold text-rose-400">{avgPeriodLen}일</span>
                  </p>
                )}
              </>
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

        {/* ── Fetal development ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">👶 태아 발달 이야기</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: `${accent}07`, border: `1px solid ${accent}18` }}>
            {stage.fetalDev.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 px-3 py-2 border-b last:border-b-0"
                style={{ borderColor: `${accent}12` }}>
                <span className="text-sm leading-none mt-0.5">{item.slice(0, 2)}</span>
                <span className="text-[11px] text-slate-700 leading-snug">{item.slice(2).trim()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recommended foods ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">🥗 이 시기 좋은 음식</p>
          <div className="grid grid-cols-3 gap-1.5">
            {stage.recommendedFoods.map(({ emoji, name, benefit }) => (
              <div key={name} className="flex flex-col items-center text-center gap-0.5 px-2 py-2.5 rounded-2xl"
                style={{ background: `${accent}08`, border: `1px solid ${accent}18` }}>
                <span className="text-xl leading-none">{emoji}</span>
                <p className="text-[10px] font-bold text-slate-700 mt-0.5">{name}</p>
                <p className="text-[9px] text-slate-400 leading-tight">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

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

// ── DayEventPanel ─────────────────────────────────────────────────────────────
function DayEventPanel({
  selRange, events, log, phase,
  onDeleteEvent, onUpdateEvent, onAddEvents, onHealthLog, onClose,
}: {
  selRange: { start: Date; end: Date }
  events: ScheduleEvent[]
  log?: DailyLogFormData
  phase?: CyclePhase
  onDeleteEvent: (id: string) => void
  onUpdateEvent: (id: string, patch: Partial<ScheduleEvent>) => void
  onAddEvents: (evs: ScheduleEvent[]) => void
  onHealthLog: () => void
  onClose: () => void
}) {
  const isSingleDay = isSameDay(selRange.start, selRange.end)
  const dayCount    = Math.round((selRange.end.getTime() - selRange.start.getTime()) / 86400000) + 1
  const dateLabel   = isSingleDay
    ? format(selRange.start, 'M월 d일 EEEE', { locale: ko })
    : `${format(selRange.start, 'M월 d일', { locale: ko })} ~ ${format(selRange.end, 'M월 d일', { locale: ko })} (${dayCount}일)`
  const phaseColor = phase ? getPhaseColor(phase) : '#f43f75'

  const [showAddForm, setShowAddForm] = useState(false)
  const [title,       setTitle]       = useState('')
  const [startTime,   setStartTime]   = useState('09:00')
  const [endTime,     setEndTime]     = useState('10:00')
  const [endDateStr,  setEndDateStr]  = useState(format(selRange.end, 'yyyy-MM-dd'))
  const [category,    setCategory]    = useState<ScheduleEvent['category']>('other')
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editForm,    setEditForm]    = useState<Partial<ScheduleEvent>>({})

  // reset endDateStr when selRange changes
  const startDateStr = format(selRange.start, 'yyyy-MM-dd')

  function handleAdd() {
    if (!title.trim()) return
    const rangeEnd  = endDateStr >= startDateStr ? endDateStr : startDateStr
    const days      = eachDayOfInterval({
      start: new Date(startDateStr + 'T00:00:00'),
      end:   new Date(rangeEnd    + 'T00:00:00'),
    })
    const now = new Date().toISOString()
    onAddEvents(days.map((d, i) => ({
      id:        `manual-${Date.now()}-${i}`,
      date:      format(d, 'yyyy-MM-dd'),
      startTime,
      endTime,
      title:     title.trim(),
      category,
      intensity: 'medium' as const,
      source:    'manual' as const,
      createdAt: now,
    })))
    setTitle(''); setShowAddForm(false)
  }

  function startEdit(ev: ScheduleEvent) {
    setEditingId(ev.id)
    setEditForm({ title: ev.title, startTime: ev.startTime, endTime: ev.endTime, category: ev.category })
  }

  function saveEdit(id: string) {
    if (!editForm.title?.trim()) return
    onUpdateEvent(id, editForm)
    setEditingId(null)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed z-50 bottom-0 left-0 right-0 rounded-t-3xl shadow-2xl flex flex-col"
        style={{ background: 'rgba(255,251,255,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(168,85,247,0.12)', maxHeight: '88dvh' }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-slate-100">
          <div>
            <p className="text-base font-bold text-slate-800">{dateLabel}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {phase && isSingleDay && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: getPhaseCellBg(phase), color: phaseColor }}>
                  {getPhaseLabel(phase)}
                </span>
              )}
              {!isSingleDay && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
                  📅 {dayCount}일 선택됨
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 pb-6">

          {/* ── Quick add ── */}
          {showAddForm ? (
            <div className="rounded-2xl border border-purple-200 overflow-hidden"
              style={{ background: 'rgba(168,85,247,0.04)' }}>
              <div className="p-3.5 space-y-2.5">
                <input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                  placeholder="일정 이름..."
                  className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-purple-400 transition-colors placeholder-slate-300"
                />
                {/* 기간: 시작일 ~ 종료일 */}
                <div className="flex items-center gap-1.5">
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 mb-1">시작일</p>
                    <input type="date" value={startDateStr} readOnly
                      className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none" />
                  </div>
                  <span className="text-slate-300 mt-4">~</span>
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 mb-1">종료일</p>
                    <input type="date" value={endDateStr} min={startDateStr}
                      onChange={e => setEndDateStr(e.target.value)}
                      className="w-full text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-2.5 py-2 outline-none focus:border-purple-400" />
                  </div>
                </div>
                {endDateStr > startDateStr && (
                  <p className="text-[10px] text-purple-500 font-semibold -mt-1">
                    ✓ {Math.round((new Date(endDateStr + 'T00:00:00').getTime() - new Date(startDateStr + 'T00:00:00').getTime()) / 86400000) + 1}일간 동일 일정이 생성됩니다
                  </p>
                )}
                {/* 시간 */}
                <div className="flex items-center gap-1.5">
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                    className="flex-1 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400" />
                  <span className="text-slate-300 text-sm">–</span>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                    className="flex-1 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_OPTIONS.map(o => {
                    const c = SCHEDULE_CATEGORY_COLORS[o.value]
                    const on = category === o.value
                    return (
                      <button key={o.value} onClick={() => setCategory(o.value)}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                        style={{ background: on ? c + '18' : '#f1f5f9', border: `1.5px solid ${on ? c + '55' : 'transparent'}`, color: on ? c : '#94a3b8' }}>
                        {o.label}
                      </button>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddForm(false)}
                    className="flex-1 py-2 rounded-xl text-xs text-slate-400 border border-slate-100 hover:bg-slate-50">취소</button>
                  <button onClick={handleAdd} disabled={!title.trim()}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
                    추가하기 ✓
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: 'rgba(168,85,247,0.06)', border: '1.5px dashed rgba(168,85,247,0.3)', color: '#a855f7' }}>
              <Plus className="w-4 h-4" />일정 추가하기
            </button>
          )}

          {/* ── Events ── */}
          {events.length > 0 && (
            <div className="space-y-2">
              {events
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                .map(ev => {
                  const c = SCHEDULE_CATEGORY_COLORS[ev.category]
                  const isEditing = editingId === ev.id
                  return (
                    <div key={ev.id} className="rounded-2xl overflow-hidden transition-all"
                      style={{ background: c + '0d', border: `1.5px solid ${isEditing ? c + '55' : c + '28'}` }}>
                      {isEditing ? (
                        <div className="p-3 space-y-2.5">
                          <input autoFocus value={editForm.title ?? ''}
                            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                            className="w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400" />
                          <div className="flex items-center gap-1.5">
                            <input type="time" value={editForm.startTime ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                              className="flex-1 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none" />
                            <span className="text-slate-300">–</span>
                            <input type="time" value={editForm.endTime ?? ''}
                              onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))}
                              className="flex-1 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none" />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {CATEGORY_OPTIONS.map(o => {
                              const oc = SCHEDULE_CATEGORY_COLORS[o.value]
                              const on = editForm.category === o.value
                              return (
                                <button key={o.value} onClick={() => setEditForm(f => ({ ...f, category: o.value }))}
                                  className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                                  style={{ background: on ? oc + '18' : '#f1f5f9', border: `1.5px solid ${on ? oc + '55' : 'transparent'}`, color: on ? oc : '#94a3b8' }}>
                                  {o.label}
                                </button>
                              )
                            })}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingId(null)}
                              className="flex-1 py-2 rounded-xl text-xs text-slate-400 border border-slate-100">취소</button>
                            <button onClick={() => saveEdit(ev.id)}
                              className="flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1 active:scale-95"
                              style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>
                              <Check className="w-3.5 h-3.5" />저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-3">
                          <div className="w-1 self-stretch rounded-full flex-none" style={{ background: c }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {!isSingleDay && (
                                <span className="mr-1.5 font-medium text-slate-500">
                                  {format(new Date(ev.date + 'T00:00:00'), 'M/d')}
                                </span>
                              )}
                              {fmtHHMM(ev.startTime)} – {fmtHHMM(ev.endTime)}
                              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ background: c + '18', color: c }}>
                                {SCHEDULE_CATEGORY_LABELS[ev.category]}
                              </span>
                            </p>
                          </div>
                          <button onClick={() => startEdit(ev)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-purple-50 transition-colors">
                            <Pencil className="w-3.5 h-3.5 text-slate-300 hover:text-purple-400" />
                          </button>
                          <button onClick={() => onDeleteEvent(ev.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors">
                            <X className="w-3.5 h-3.5 text-slate-300 hover:text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
          {events.length === 0 && !showAddForm && (
            <p className="text-xs text-slate-300 text-center py-1">이 날 등록된 일정이 없어요</p>
          )}

          {/* ── Health log divider ── */}
          <div className="border-t border-slate-100 pt-3 mt-1">
            <p className="text-xs font-semibold text-slate-500 mb-2">건강 기록</p>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {log?.isPeriod && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(244,63,117,0.1)', color: '#f43f75' }}>🩸 생리 중</span>
              )}
              {log?.mood && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-600">
                  {MOODS.find(m => m.key === log.mood)?.emoji} {MOODS.find(m => m.key === log.mood)?.label}
                </span>
              )}
              {log?.painIntensity != null && log.painIntensity > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: log.painIntensity >= 7 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: log.painIntensity >= 7 ? '#ef4444' : '#d97706' }}>
                  💊 통증 {log.painIntensity}/10
                </span>
              )}
              {!log?.isPeriod && !log?.mood && !log?.painIntensity && (
                <span className="text-xs text-slate-300">기록 없음</span>
              )}
            </div>
            <button onClick={onHealthLog}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: 'rgba(244,63,117,0.06)', border: '1.5px solid rgba(244,63,117,0.18)', color: '#f43f75' }}>
              <span>{log ? '✏️' : '📝'}</span>
              {log ? '건강 기록 수정하기' : '건강 기록하기'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function _ScheduleSheet({
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
