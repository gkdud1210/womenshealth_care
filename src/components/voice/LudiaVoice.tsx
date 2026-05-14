'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Volume2, CalendarCheck, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { askLudia } from '@/lib/ludia-engine'
import { useOnboardingProfile } from '@/lib/onboarding-profile'
import { usePersistedLogs } from '@/hooks/usePersistedLogs'
import { useSchedule } from '@/hooks/useSchedule'
import { getPhaseLabel, getPhaseColor } from '@/lib/cycle-utils'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { CyclePhase, ScheduleEvent } from '@/types/health'

/* ─── Keyframes ───────────────────────────────────────────────────────── */
const ANIMATION_CSS = `
@keyframes ludia-ring {
  0%   { transform: scale(1);   opacity: 0.55; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes ludia-dot {
  0%, 100% { transform: translateY(0);    opacity: 0.4; }
  50%       { transform: translateY(-7px); opacity: 1; }
}
@keyframes ludia-msg {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

/* ─── Types ───────────────────────────────────────────────────────────── */
type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface RecurringPending {
  weekday: number                        // 0=일, 1=월, ..., 6=토
  title: string
  category: ScheduleEvent['category']
  startTime: string | null
  endTime: string | null
}

interface Message {
  id: string
  role: 'user' | 'ludia'
  text: string
  pendingEvent?: ParsedEvent
  event?: { title: string; date: string; startTime: string | null }
  pendingRecurring?: {
    events: ScheduleEvent[]
    weekday: number
    startMonth: number
    endMonth: number
    title: string
  }
  savedRecurring?: { count: number; title: string; weekday: number }
}
interface ParsedEvent {
  hasEvent: boolean
  title: string | null
  date: string | null
  startTime: string | null
  endTime: string | null
  category: string | null
}
interface Props {
  data: MultimodalData
  phase: CyclePhase
  cycleDay: number
  userName: string
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

const RECURRING_KEYWORDS: { pattern: RegExp; category: ScheduleEvent['category'] }[] = [
  { pattern: /과외|수업|강의|레슨|강습|공부/, category: 'study' },
  { pattern: /회의|미팅|업무|발표|출장|면접/, category: 'work' },
  { pattern: /운동|헬스|요가|필라테스|수영|달리기/, category: 'exercise' },
  { pattern: /병원|검진|진료|치과/, category: 'medical' },
  { pattern: /약속|모임|파티|데이트|만남/, category: 'social' },
]

function parseRecurringPattern(text: string) {
  const none = { isRecurring: false, weekday: null as number | null, title: '일정', category: 'other' as ScheduleEvent['category'], startTime: null as string | null, endTime: null as string | null, startMonth: null as number | null, endMonth: null as number | null }
  if (!/매주|주마다|마다/.test(text)) return none

  const WEEKDAY_MAP: Record<string, number> = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, 일: 0 }
  let weekday: number | null = null
  for (const [k, v] of Object.entries(WEEKDAY_MAP)) {
    if (new RegExp(k + '요일?').test(text)) { weekday = v; break }
  }
  if (weekday === null) return none

  const matched = RECURRING_KEYWORDS.find(k => k.pattern.test(text))
  const titleMatch = text.match(matched?.pattern ?? /일정/)
  const title = titleMatch?.[0] ?? '일정'
  const category = matched?.category ?? 'other'

  let startTime: string | null = null
  const pmMatch = text.match(/오후\s*(\d+)시(?:\s*(\d+)분)?/)
  const amMatch = text.match(/오전\s*(\d+)시(?:\s*(\d+)분)?/)
  if (pmMatch) {
    const h = parseInt(pmMatch[1]) + (parseInt(pmMatch[1]) < 12 ? 12 : 0)
    startTime = `${String(h).padStart(2,'0')}:${String(parseInt(pmMatch[2] ?? '0')).padStart(2,'0')}`
  } else if (amMatch) {
    startTime = `${String(parseInt(amMatch[1])).padStart(2,'0')}:${String(parseInt(amMatch[2] ?? '0')).padStart(2,'0')}`
  }
  const endTime = startTime
    ? (() => { const [h,m] = startTime!.split(':').map(Number); return `${String(Math.min(h+1,23)).padStart(2,'0')}:${String(m).padStart(2,'0')}` })()
    : null

  let startMonth: number | null = null
  let endMonth: number | null = null
  const rangeMatch = text.match(/(\d{1,2})월(?:부터|에서|-|~)?\s*(\d{1,2})월/)
  if (rangeMatch) { startMonth = parseInt(rangeMatch[1]); endMonth = parseInt(rangeMatch[2]) }

  return { isRecurring: true, weekday, title, category, startTime, endTime, startMonth, endMonth }
}

function parseDateRange(text: string): { startMonth: number; endMonth: number } | null {
  const m = text.match(/(\d{1,2})월(?:부터|에서|-|~)?\s*(\d{1,2})월/)
    ?? text.match(/(\d{1,2})월.*?(\d{1,2})월/)
  if (m) {
    const s = parseInt(m[1]); const e = parseInt(m[2])
    if (s >= 1 && s <= 12 && e >= 1 && e <= 12) return { startMonth: s, endMonth: e }
  }
  const single = text.match(/(\d{1,2})월까지/)
  if (single) {
    const end = parseInt(single[1])
    if (end >= 1 && end <= 12) return { startMonth: new Date().getMonth() + 1, endMonth: end }
  }
  return null
}

function generateWeeklyEvents(
  weekday: number, startMonth: number, endMonth: number,
  title: string, category: ScheduleEvent['category'],
  startTime: string | null, endTime: string | null,
): ScheduleEvent[] {
  const year = new Date().getFullYear()
  const st = startTime ?? '09:00'
  const et = endTime ?? (() => { const [h,m] = st.split(':').map(Number); return `${String(Math.min(h+1,23)).padStart(2,'0')}:${String(m).padStart(2,'0')}` })()
  const cur = new Date(year, startMonth - 1, 1)
  const endDate = new Date(year, endMonth, 0)
  while (cur.getDay() !== weekday) cur.setDate(cur.getDate() + 1)
  const events: ScheduleEvent[] = []
  while (cur <= endDate) {
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`
    events.push({
      id: `ludia-recur-${Date.now()}-${events.length}-${Math.random().toString(36).slice(2,5)}`,
      date: dateStr,
      startTime: st, endTime: et,
      title, category,
      intensity: 'medium', source: 'voice', createdAt: new Date().toISOString(),
    })
    cur.setDate(cur.getDate() + 7)
  }
  return events
}

function fmtTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (h === 0)  return `오전 12:${String(m).padStart(2,'0')}`
  if (h < 12)   return `오전 ${h}:${String(m).padStart(2,'0')}`
  if (h === 12) return `오후 12:${String(m).padStart(2,'0')}`
  return `오후 ${h-12}:${String(m).padStart(2,'0')}`
}
const todayStr = () => new Date().toISOString().split('T')[0]

function fmtDateKo(dateStr: string): string {
  const today = todayStr()
  if (dateStr === today) return '오늘'
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === tomorrow.toISOString().split('T')[0]) return '내일'
  const d = new Date(dateStr)
  const days = ['일','월','화','수','목','금','토']
  return `${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

function makeConfirmReply(ev: ParsedEvent): string {
  const datePart = fmtDateKo(ev.date ?? todayStr())
  const timePart = ev.startTime ? ` ${fmtTime(ev.startTime)}` : ''
  return `📅 ${datePart}${timePart}에 ${ev.title} 일정이 맞나요?`
}

function addDaysToStr(base: string, n: number): string {
  const d = new Date(base); d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

/* Local schedule parser — runs when Gemini API is unavailable */
function parseEventLocally(text: string): ParsedEvent {
  const base = { hasEvent: false, title: null, date: null, startTime: null, endTime: null, category: null }
  const today = todayStr()

  const SCHEDULE_KEYWORDS: { pattern: RegExp; category: string }[] = [
    { pattern: /과외|수업|강의|레슨|강습|공부/, category: 'study' },
    { pattern: /회의|미팅|업무|발표|출장|면접/, category: 'work' },
    { pattern: /운동|헬스|요가|필라테스|수영|달리기/, category: 'exercise' },
    { pattern: /병원|검진|진료|치과|약속/, category: 'medical' },
    { pattern: /약속|모임|파티|데이트|만남/, category: 'social' },
    { pattern: /미용실|헤어|네일|마사지/, category: 'other' },
  ]

  const matched = SCHEDULE_KEYWORDS.find(k => k.pattern.test(text))
  if (!matched) return base

  // Extract title: matched keyword
  const titleMatch = text.match(matched.pattern)
  const title = titleMatch?.[0] ?? '일정'

  // Date parsing
  let date = today
  if (/내일/.test(text)) date = addDaysToStr(today, 1)
  else if (/모레/.test(text)) date = addDaysToStr(today, 2)
  else if (/글피/.test(text)) date = addDaysToStr(today, 3)
  else {
    const weekdays: Record<string, number> = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, 일: 0 }
    for (const [k, v] of Object.entries(weekdays)) {
      if (new RegExp(k + '요일?').test(text)) {
        const d = new Date(); const cur = d.getDay()
        const diff = (v - cur + 7) % 7 || 7
        date = addDaysToStr(today, diff); break
      }
    }
  }

  // Time parsing
  let startTime: string | null = null
  const pmMatch = text.match(/오후\s*(\d+)시(?:\s*(\d+)분)?/)
  const amMatch = text.match(/오전\s*(\d+)시(?:\s*(\d+)분)?/)
  const numMatch = text.match(/(\d+)시(?:\s*(\d+)분)?/)
  if (pmMatch) {
    const h = parseInt(pmMatch[1]) + (parseInt(pmMatch[1]) < 12 ? 12 : 0)
    startTime = `${String(h).padStart(2,'0')}:${String(parseInt(pmMatch[2] ?? '0')).padStart(2,'0')}`
  } else if (amMatch) {
    startTime = `${String(parseInt(amMatch[1])).padStart(2,'0')}:${String(parseInt(amMatch[2] ?? '0')).padStart(2,'0')}`
  } else if (numMatch) {
    const h = parseInt(numMatch[1])
    startTime = `${String(h < 9 ? h + 12 : h).padStart(2,'0')}:${String(parseInt(numMatch[2] ?? '0')).padStart(2,'0')}`
  }

  const endTime = startTime
    ? (() => { const [h,m] = startTime!.split(':').map(Number); return `${String(Math.min(h+1,23)).padStart(2,'0')}:${String(m).padStart(2,'0')}` })()
    : null

  return { hasEvent: true, title, date, startTime, endTime, category: matched.category }
}

function pickKoreanFemaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const korean = voices.filter(v => v.lang.startsWith('ko'))
  for (const name of ['Yuna','Google 한국의','미나','Heami','Nari','Sora','Hyuna']) {
    const m = korean.find(v => v.name.includes(name))
    if (m) return m
  }
  return korean[0] ?? null
}

function speak(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ko-KR'; u.rate = 1.05; u.pitch = 1.15
  const go = () => {
    const v = pickKoreanFemaleVoice()
    if (v) u.voice = v
    if (onEnd) u.onend = onEnd
    window.speechSynthesis.speak(u)
  }
  window.speechSynthesis.getVoices().length > 0
    ? go()
    : window.speechSynthesis.addEventListener('voiceschanged', go, { once: true })
}

function makeWelcome(name: string, cycleDay: number, phase: CyclePhase): Message {
  const info: Record<CyclePhase, string> = {
    menstrual:  '몸을 따뜻하게 챙기고 계신가요?',
    follicular: '에너지가 올라오는 시기예요!',
    ovulation:  '활력이 넘치는 시기예요.',
    luteal:     'PMS 관리가 중요한 시기예요.',
  }
  return {
    id: 'welcome', role: 'ludia',
    text: `안녕하세요, ${name}님! 현재 D+${cycleDay}일 ${getPhaseLabel(phase)}이에요. ${info[phase]} 건강에 대해 무엇이든 물어보세요.`,
  }
}

const SUGGESTION_BANK = [
  // 주기·생리
  '다음 생리 언제야?', '지금 어떤 주기야?', '생리 예정일 알려줘', '생리통이 심해',
  // 컨디션
  '오늘 컨디션 어때?', '몸이 너무 무거워', '요즘 너무 피곤해', '기력이 없어',
  // 증상
  '두통이 심해', '배가 자주 아파', '부종이 있어', '허리가 아파', '가슴이 두근거려', '소화가 안 돼',
  // 스트레스·감정
  '스트레스가 너무 심해', '요즘 예민해진 것 같아', '감정 기복이 심한데', '불안감이 심해',
  '요즘 우울해', '집중이 안 돼', '의욕이 없어',
  // 수면
  '수면이 부족해', '잠을 잘 못 자', '잠이 너무 많이 와', '밤에 자꾸 깨',
  // 영양·식단
  '지금 단계에 뭐 먹으면 좋아?', '철분이 부족한 것 같아', '비타민 뭘 먹어야 해?',
  '카페인 먹어도 돼?', '술 마셔도 괜찮아?',
  // 피부
  '피부 트러블이 심해', '피부가 건조해', '얼굴이 푸석해',
  // 운동
  '운동해도 괜찮아?', '어떤 운동이 좋을까?', '요즘 운동하기 싫어',
  // 호르몬
  '호르몬이 불균형한 것 같아', '배란일은 언제야?', '에스트로겐이 뭐야?',
]

function pickSuggestions(exclude: Set<string>, count: number): string[] {
  let pool = SUGGESTION_BANK.filter(s => !exclude.has(s))
  if (pool.length < count) pool = [...SUGGESTION_BANK]
  const shuffled = pool.slice().sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

const PHASE_ACCENT: Record<CyclePhase, { badge: string; text: string }> = {
  menstrual:  { badge: 'rgba(244,63,117,0.12)', text: '#d94f5c' },
  follicular: { badge: 'rgba(251,146,60,0.12)',  text: '#3d8b56' },
  ovulation:  { badge: 'rgba(168,85,247,0.12)', text: '#7048c0' },
  luteal:     { badge: 'rgba(245,158,11,0.12)', text: '#b8870b' },
}

/* ─── Component ───────────────────────────────────────────────────────── */
export function LudiaVoice({ data, phase, cycleDay, userName }: Props) {
  const profile          = useOnboardingProfile()
  const { setLogs }      = usePersistedLogs()
  const { addEvents }    = useSchedule()
  const phaseColor  = getPhaseColor(phase)
  const accent      = PHASE_ACCENT[phase]

  const [vs, setVs]                           = useState<VoiceState>('idle')
  const [messages, setMessages]               = useState<Message[]>(() => [makeWelcome(userName, cycleDay, phase)])
  const [interim, setInterim]                 = useState('')
  const [inputText, setInputText]             = useState('')
  const [recurringPending, setRecurringPending] = useState<RecurringPending | null>(null)
  const [suggestions, setSuggestions]         = useState<string[]>(() => pickSuggestions(new Set(), 10))

  const vsRef          = useRef<VoiceState>('idle')
  const recogRef       = useRef<any>(null)
  const chatRef        = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const usedSugRef     = useRef<Set<string>>(new Set())

  const setVsSync = useCallback((s: VoiceState) => { vsRef.current = s; setVs(s) }, [])

  /* auto-scroll chat */
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, interim, vs])

  /* auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }, [inputText])

  useEffect(() => () => {
    recogRef.current?.stop()
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [])

  /* 새 LUDIA 답변이 오면 제안 칩 갱신 */
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'ludia') return
    const isFirst = messages.filter(m => m.role === 'ludia').length <= 1
    const count = isFirst ? 10 : 6
    const next = pickSuggestions(usedSugRef.current, count)
    next.forEach(s => usedSugRef.current.add(s))
    if (usedSugRef.current.size > SUGGESTION_BANK.length * 0.7) usedSugRef.current.clear()
    setSuggestions(next)
  }, [messages])

  /* save calendar event as proper ScheduleEvent */
  const saveEvent = useCallback((ev: ParsedEvent) => {
    if (!ev.hasEvent || !ev.title) return
    const date = ev.date ?? todayStr()
    const startTime = ev.startTime ?? '09:00'
    let endTime = ev.endTime
    if (!endTime) {
      const [h, m] = startTime.split(':').map(Number)
      endTime = `${String(Math.min(h + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    const validCategories: ScheduleEvent['category'][] = ['work','study','exercise','social','rest','medical','other']
    const category: ScheduleEvent['category'] = validCategories.includes(ev.category as ScheduleEvent['category'])
      ? (ev.category as ScheduleEvent['category'])
      : 'other'
    addEvents([{
      id: `ludia-${Date.now()}`,
      date,
      startTime,
      endTime,
      title: ev.title,
      category,
      intensity: 'medium',
      source: 'voice',
      createdAt: new Date().toISOString(),
    }])
  }, [addEvents])

  const confirmEvent = useCallback((msgId: string, ev: ParsedEvent) => {
    saveEvent(ev)
    setMessages(prev => prev.map(m => m.id !== msgId ? m : {
      ...m,
      pendingEvent: undefined,
      event: { title: ev.title!, date: ev.date ?? todayStr(), startTime: ev.startTime },
    }))
  }, [saveEvent])

  const dismissEvent = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m => m.id !== msgId ? m : { ...m, pendingEvent: undefined }))
  }, [])

  const confirmRecurring = useCallback((msgId: string, events: ScheduleEvent[], weekday: number, title: string) => {
    addEvents(events)
    setMessages(prev => prev.map(m => m.id !== msgId ? m : {
      ...m, pendingRecurring: undefined,
      savedRecurring: { count: events.length, title, weekday },
    }))
  }, [addEvents])

  const dismissRecurring = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m => m.id !== msgId ? m : { ...m, pendingRecurring: undefined }))
  }, [])

  /* build history */
  const buildHistory = useCallback(() =>
    messages.filter(m => m.id !== 'welcome').slice(-10).map(m => ({
      role: m.role === 'ludia' ? ('assistant' as const) : ('user' as const),
      content: m.text,
    })), [messages])

  /* core: send to API */
  const processText = useCallback(async (text: string) => {
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', text }])

    // ── 정기 스케줄: 날짜 범위 대기 중 ──────────────────────────────
    if (recurringPending) {
      const range = parseDateRange(text)
      if (range) {
        const { startMonth, endMonth } = range
        const events = generateWeeklyEvents(
          recurringPending.weekday, startMonth, endMonth,
          recurringPending.title, recurringPending.category,
          recurringPending.startTime, recurringPending.endTime,
        )
        const dayName = WEEKDAY_NAMES[recurringPending.weekday]
        const reply = `📅 매주 ${dayName}요일 ${recurringPending.title}을(를) ${startMonth}월부터 ${endMonth}월까지, 총 ${events.length}회 캘린더에 등록할까요?`
        setRecurringPending(null)
        setMessages(prev => [...prev, {
          id: `l-${Date.now()}`, role: 'ludia', text: reply,
          pendingRecurring: { events, weekday: recurringPending.weekday, startMonth, endMonth, title: recurringPending.title },
        }])
        setVsSync('speaking'); speak(reply, () => setVsSync('idle'))
      } else {
        const reply = '날짜 범위를 다시 알려주세요. 예: "1월부터 5월까지"'
        setMessages(prev => [...prev, { id: `l-${Date.now()}`, role: 'ludia', text: reply }])
        setVsSync('speaking'); speak(reply, () => setVsSync('idle'))
      }
      return
    }

    // ── 정기 스케줄: 새 메시지에서 감지 ─────────────────────────────
    const recurring = parseRecurringPattern(text)
    if (recurring.isRecurring && recurring.weekday !== null) {
      const dayName = WEEKDAY_NAMES[recurring.weekday]
      let reply: string
      let pendingRec: Message['pendingRecurring']

      if (recurring.startMonth !== null && recurring.endMonth !== null) {
        const events = generateWeeklyEvents(
          recurring.weekday, recurring.startMonth, recurring.endMonth,
          recurring.title, recurring.category,
          recurring.startTime, recurring.endTime,
        )
        reply = `📅 매주 ${dayName}요일 ${recurring.title}을(를) ${recurring.startMonth}월부터 ${recurring.endMonth}월까지, 총 ${events.length}회 캘린더에 등록할까요?`
        pendingRec = { events, weekday: recurring.weekday, startMonth: recurring.startMonth, endMonth: recurring.endMonth, title: recurring.title }
      } else {
        reply = `📅 매주 ${dayName}요일 ${recurring.title}이군요! 몇 월부터 몇 월까지 있나요?`
        setRecurringPending({
          weekday: recurring.weekday,
          title: recurring.title,
          category: recurring.category,
          startTime: recurring.startTime,
          endTime: recurring.endTime,
        })
      }

      setMessages(prev => [...prev, {
        id: `l-${Date.now()}`, role: 'ludia', text: reply,
        ...(pendingRec ? { pendingRecurring: pendingRec } : {}),
      }])
      setVsSync('speaking'); speak(reply, () => setVsSync('idle'))
      return
    }

    setVsSync('thinking')

    let reply = ''
    let ev: ParsedEvent = { hasEvent: false, title: null, date: null, startTime: null, endTime: null, category: null }

    try {
      const res = await fetch('/api/ludia/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text, history: buildHistory(),
          context: {
            phase, cycleDay, careTypes: profile.careTypes ?? [],
            stressIndex: data.eda.stressIndex, hrv: data.biosignal.hrv,
            sleepHours: data.biosignal.sleepHours, uterineTemp: data.thermal.uterineTemp,
            today: todayStr(), userName,
          },
        }),
      })
      if (res.ok) { const j = await res.json(); reply = j.reply ?? ''; ev = { ...ev, ...(j.event ?? {}) } }
      else { ev = parseEventLocally(text); reply = ev.hasEvent ? makeConfirmReply(ev) : askLudia(text, data, phase, cycleDay, profile).text }
    } catch {
      ev = parseEventLocally(text); reply = ev.hasEvent ? makeConfirmReply(ev) : askLudia(text, data, phase, cycleDay, profile).text
    }

    setMessages(prev => [...prev, {
      id: `l-${Date.now()}`, role: 'ludia', text: reply,
      pendingEvent: ev.hasEvent && ev.title ? ev : undefined,
    }])
    setVsSync('speaking')
    speak(reply, () => setVsSync('idle'))
  }, [data, phase, cycleDay, userName, profile, buildHistory, saveEvent, setVsSync, recurringPending])

  /* text send */
  const handleTextSend = useCallback(() => {
    const t = inputText.trim()
    if (!t) return
    setInputText('')
    processText(t)
  }, [inputText, processText])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend() }
  }, [handleTextSend])

  /* STT */
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) { processText('오늘 내 컨디션 어때'); return }
    const recog = new SR()
    recog.lang = 'ko-KR'; recog.continuous = false; recog.interimResults = true
    recogRef.current = recog
    recog.onresult = (e: any) => {
      const r = e.results[e.results.length - 1]
      r.isFinal ? (setInterim(''), processText(r[0].transcript)) : setInterim(r[0].transcript)
    }
    recog.onerror = () => { setInterim(''); setVsSync('idle') }
    recog.onend   = () => { setInterim(''); if (vsRef.current === 'listening') setVsSync('idle') }
    setVsSync('listening')
    try { recog.start() } catch {}
  }, [processText, setVsSync])

  const handleMic = useCallback(() => {
    if (vs === 'idle')           startListening()
    else if (vs === 'listening') recogRef.current?.stop()
    else if (vs === 'speaking')  { window.speechSynthesis.cancel(); setVsSync('idle') }
  }, [vs, startListening, setVsSync])

  /* button style */
  const hasText = inputText.trim().length > 0
  const isBusy  = vs === 'thinking'

  const btnBg = hasText || vs === 'listening'
    ? 'linear-gradient(135deg, #f43f75, #e11d5a)'
    : vs === 'thinking' || vs === 'speaking'
      ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
      : 'linear-gradient(145deg, #160b20, #2d1240)'

  const btnShadow = hasText || vs === 'listening'
    ? '0 4px 16px rgba(244,63,117,0.45)'
    : vs === 'thinking' || vs === 'speaking'
      ? '0 4px 16px rgba(168,85,247,0.4)'
      : '0 4px 16px rgba(244,63,117,0.2), 0 0 0 1px rgba(244,63,117,0.1)'

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <>
      <style>{ANIMATION_CSS}</style>

      {/*
        h-full fills AppShell main's content height (= 100dvh - pb-safe-nav).
        flex-col: header | scrollable chat | input bar — no fixed positioning needed.
        max-w-lg + mx-auto: centers on wide screens consistently.
      */}
      <div className="h-full flex flex-col max-w-lg mx-auto w-full">

        {/* ── Header ───────────────────────────────────────────────── */}
        <header className="flex-none flex items-center justify-between px-5 pt-4 pb-3 border-b border-rose-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #f43f75, #a855f7)',
                boxShadow: '0 4px 16px rgba(244,63,117,0.3)',
              }}>
              <span className="text-sm font-black text-white tracking-tight">L</span>
            </div>
            <div className="leading-none">
              <p className="text-[13px] font-black tracking-widest text-slate-800">LUDIA</p>
              <p className="text-[10px] text-slate-400 mt-0.5 tracking-wide">AI Health</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: accent.badge, border: `1px solid ${phaseColor}30` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: phaseColor }} />
            <span className="text-xs font-semibold" style={{ color: accent.text }}>
              D+{cycleDay} {getPhaseLabel(phase)}
            </span>
          </div>
        </header>

        {/* ── Chat area — flex-1 + min-h-0 lets it shrink and scroll ── */}
        <div
          ref={chatRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-2 space-y-3"
        >
          {messages.map(msg => (
            <div key={msg.id}
              className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              style={{ animation: 'ludia-msg 0.28s ease-out both' }}>

              {msg.role === 'ludia' && (
                <div className="w-7 h-7 rounded-xl flex-none flex items-center justify-center self-end mb-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #f43f75, #a855f7)',
                    boxShadow: '0 2px 8px rgba(244,63,117,0.25)',
                  }}>
                  <span className="text-[9px] font-black text-white">L</span>
                </div>
              )}

              <div className={cn('max-w-[78%] flex flex-col gap-1.5',
                msg.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cn('px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'rounded-3xl rounded-br-lg text-slate-700 bg-white border border-rose-100'
                      : 'rounded-3xl rounded-bl-lg text-slate-700')}
                  style={msg.role === 'ludia' ? {
                    background: 'linear-gradient(135deg, rgba(255,241,245,0.97), rgba(253,240,255,0.97))',
                    border: '1px solid rgba(244,63,117,0.13)',
                    boxShadow: '0 2px 14px rgba(244,63,117,0.06)',
                  } : { boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  {msg.text}
                </div>

                {/* Pending confirmation card */}
                {msg.pendingEvent && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ border: '1px solid rgba(168,85,247,0.22)', background: 'rgba(168,85,247,0.05)' }}>
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 2px 8px rgba(168,85,247,0.3)' }}>
                        <CalendarCheck className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{msg.pendingEvent.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {fmtDateKo(msg.pendingEvent.date ?? todayStr())}
                          {msg.pendingEvent.startTime ? ` · ${fmtTime(msg.pendingEvent.startTime)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex" style={{ borderTop: '1px solid rgba(168,85,247,0.15)' }}>
                      <button
                        onClick={() => dismissEvent(msg.id)}
                        className="flex-1 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 active:bg-slate-100">
                        아니요
                      </button>
                      <div style={{ width: 1, background: 'rgba(168,85,247,0.15)' }} />
                      <button
                        onClick={() => confirmEvent(msg.id, msg.pendingEvent!)}
                        className="flex-1 py-2.5 text-xs font-bold transition-colors hover:bg-purple-50 active:bg-purple-100"
                        style={{ color: '#7c3aed' }}>
                        맞아요 ✓
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirmed & saved badge */}
                {msg.event && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px]"
                    style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)' }}>
                    <CalendarCheck className="w-3 h-3 flex-none" style={{ color: '#a855f7' }} />
                    <span className="font-semibold" style={{ color: '#7c3aed' }}>
                      {msg.event.title}{msg.event.startTime ? ` · ${fmtTime(msg.event.startTime)}` : ''} 캘린더에 저장됨 ✓
                    </span>
                  </div>
                )}

                {/* 정기 일정 확인 카드 */}
                {msg.pendingRecurring && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ border: '1px solid rgba(168,85,247,0.22)', background: 'rgba(168,85,247,0.05)' }}>
                    <div className="flex items-center gap-3 px-3.5 py-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 2px 8px rgba(168,85,247,0.3)' }}>
                        <CalendarCheck className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">
                          매주 {WEEKDAY_NAMES[msg.pendingRecurring.weekday]}요일 {msg.pendingRecurring.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {msg.pendingRecurring.startMonth}월 ~ {msg.pendingRecurring.endMonth}월 · 총 {msg.pendingRecurring.events.length}회
                        </p>
                      </div>
                    </div>
                    <div className="flex" style={{ borderTop: '1px solid rgba(168,85,247,0.15)' }}>
                      <button onClick={() => dismissRecurring(msg.id)}
                        className="flex-1 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 active:bg-slate-100">
                        아니요
                      </button>
                      <div style={{ width: 1, background: 'rgba(168,85,247,0.15)' }} />
                      <button
                        onClick={() => confirmRecurring(msg.id, msg.pendingRecurring!.events, msg.pendingRecurring!.weekday, msg.pendingRecurring!.title)}
                        className="flex-1 py-2.5 text-xs font-bold transition-colors hover:bg-purple-50 active:bg-purple-100"
                        style={{ color: '#7c3aed' }}>
                        저장하기 ✓
                      </button>
                    </div>
                  </div>
                )}

                {/* 정기 일정 저장 완료 배지 */}
                {msg.savedRecurring && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px]"
                    style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)' }}>
                    <CalendarCheck className="w-3 h-3 flex-none" style={{ color: '#a855f7' }} />
                    <span className="font-semibold" style={{ color: '#7c3aed' }}>
                      매주 {WEEKDAY_NAMES[msg.savedRecurring.weekday]}요일 {msg.savedRecurring.title} · {msg.savedRecurring.count}회 저장됨 ✓
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Thinking dots */}
          {vs === 'thinking' && (
            <div className="flex gap-2 items-end" style={{ animation: 'ludia-msg 0.18s ease-out both' }}>
              <div className="w-7 h-7 rounded-xl flex-none flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f43f75, #a855f7)' }}>
                <span className="text-[9px] font-black text-white">L</span>
              </div>
              <div className="px-4 py-3.5 rounded-3xl rounded-bl-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,241,245,0.97), rgba(253,240,255,0.97))',
                  border: '1px solid rgba(244,63,117,0.13)',
                }}>
                <div className="flex items-center gap-1.5">
                  {[0, 0.18, 0.36].map((d, i) => (
                    <div key={i} className="w-2 h-2 rounded-full"
                      style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)', animation: `ludia-dot 0.8s ease-in-out ${d}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Input bar — flex-none, always at the bottom of flex column ── */}
        <div className="flex-none px-3 pt-2 pb-3 border-t border-rose-50">

          {/* ── 제안 칩 — 항상 표시, LUDIA 답변 후 자동 교체 ── */}
          {vs !== 'thinking' && vs !== 'listening' && (
            <div
              className={suggestions.length >= 8 ? 'flex flex-wrap gap-1.5 mb-2' : 'flex gap-2 overflow-x-auto mb-2 pb-0.5'}
              style={{ scrollbarWidth: 'none' }}
            >
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => processText(s)}
                  className="flex-none text-xs px-3 py-1.5 rounded-full transition-all active:scale-95"
                  style={{
                    background: 'rgba(244,63,117,0.07)',
                    border: '1px solid rgba(244,63,117,0.18)',
                    color: '#c0395e',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Interim / status label */}
          {(interim || vs !== 'idle') && (
            <p className="text-[11px] text-center mb-1.5 font-medium"
              style={{ color: vs === 'thinking' || vs === 'speaking' ? '#a855f7' : '#f43f75' }}>
              {interim
                ? `${interim}…`
                : vs === 'listening' ? '듣고 있어요...'
                : vs === 'thinking'  ? '분석 중이에요...'
                : '말하고 있어요...'}
            </p>
          )}

          {/* Row: textarea + action button */}
          <div className="flex items-end gap-2 px-3 py-2 rounded-3xl"
            style={{
              background: 'rgba(255,255,255,0.97)',
              border: '1px solid rgba(244,63,117,0.15)',
              boxShadow: '0 2px 16px rgba(244,63,117,0.08), 0 1px 4px rgba(0,0,0,0.04)',
            }}>

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={vs === 'listening' ? '말하고 있어요...' : '메시지를 입력하거나 🎤 로 말해보세요'}
              rows={1}
              disabled={isBusy || vs === 'listening'}
              className="flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none leading-relaxed py-1.5"
              style={{ maxHeight: '96px', scrollbarWidth: 'none', minHeight: '24px' }}
            />

            <button
              onClick={hasText ? handleTextSend : handleMic}
              disabled={isBusy}
              aria-label={hasText ? '전송' : vs === 'listening' ? '듣기 중지' : '음성 입력'}
              className={cn(
                'relative flex-none w-10 h-10 rounded-2xl flex items-center justify-center',
                'transition-all duration-300 select-none',
                vs === 'listening' && !hasText ? 'scale-110' : 'hover:scale-105 active:scale-95',
                isBusy && 'opacity-60 cursor-not-allowed',
              )}
              style={{ background: btnBg, boxShadow: btnShadow }}>

              {/* Pulse rings when listening */}
              {vs === 'listening' && !hasText && [0, 0.7].map((delay, i) => (
                <div key={i} className="absolute w-10 h-10 rounded-2xl pointer-events-none"
                  style={{ background: 'rgba(244,63,117,0.25)', animation: `ludia-ring 1.8s ease-out ${delay}s infinite` }} />
              ))}

              {isBusy ? (
                <Loader2 className="w-4 h-4 text-white/80 animate-spin" />
              ) : hasText ? (
                <Send className="w-4 h-4 text-white" />
              ) : vs === 'listening' ? (
                <MicOff className="w-4 h-4 text-white" />
              ) : vs === 'speaking' ? (
                <Volume2 className="w-4 h-4 text-white animate-pulse" />
              ) : (
                <Mic className="w-4 h-4 text-rose-300" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
