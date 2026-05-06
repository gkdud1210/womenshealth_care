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

interface Message {
  id: string
  role: 'user' | 'ludia'
  text: string
  event?: { title: string; date: string; startTime: string | null }
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
function fmtTime(t: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (h === 0)  return `오전 12:${String(m).padStart(2,'0')}`
  if (h < 12)   return `오전 ${h}:${String(m).padStart(2,'0')}`
  if (h === 12) return `오후 12:${String(m).padStart(2,'0')}`
  return `오후 ${h-12}:${String(m).padStart(2,'0')}`
}
const todayStr = () => new Date().toISOString().split('T')[0]

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

const EXAMPLES = ['오늘 컨디션 어때?','스트레스가 너무 심해','다음 생리 언제야?','수면이 부족해','지금 단계에 뭐 먹으면 좋아?','피부 트러블이 심해']

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

  const [vs, setVs]               = useState<VoiceState>('idle')
  const [messages, setMessages]   = useState<Message[]>(() => [makeWelcome(userName, cycleDay, phase)])
  const [interim, setInterim]     = useState('')
  const [inputText, setInputText] = useState('')

  const vsRef       = useRef<VoiceState>('idle')
  const recogRef    = useRef<any>(null)
  const chatRef     = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  /* build history */
  const buildHistory = useCallback(() =>
    messages.filter(m => m.id !== 'welcome').slice(-10).map(m => ({
      role: m.role === 'ludia' ? ('assistant' as const) : ('user' as const),
      content: m.text,
    })), [messages])

  /* core: send to API */
  const processText = useCallback(async (text: string) => {
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', text }])
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
      else { reply = askLudia(text, data, phase, cycleDay, profile).text; ev = parseEventLocally(text) }
    } catch {
      reply = askLudia(text, data, phase, cycleDay, profile).text; ev = parseEventLocally(text)
    }

    if (ev.hasEvent && ev.title) saveEvent(ev)

    setMessages(prev => [...prev, {
      id: `l-${Date.now()}`, role: 'ludia', text: reply,
      event: ev.hasEvent && ev.title ? { title: ev.title, date: ev.date ?? todayStr(), startTime: ev.startTime } : undefined,
    }])
    setVsSync('speaking')
    speak(reply, () => setVsSync('idle'))
  }, [data, phase, cycleDay, userName, profile, buildHistory, saveEvent, setVsSync])

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

                {msg.event && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px]"
                    style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)' }}>
                    <CalendarCheck className="w-3 h-3 flex-none" style={{ color: '#a855f7' }} />
                    <span className="font-semibold" style={{ color: '#7c3aed' }}>
                      {msg.event.title}{msg.event.startTime ? ` · ${fmtTime(msg.event.startTime)}` : ''} 캘린더에 저장됨
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

          {/* Example chips */}
          {vs === 'idle' && messages.length <= 1 && (
            <div className="pt-3 pb-2" style={{ animation: 'ludia-msg 0.35s ease-out both' }}>
              <p className="text-[11px] text-slate-400 text-center mb-3 leading-relaxed">
                아래 예시를 탭하거나 직접 입력해보세요
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => processText(ex)}
                    className="text-xs px-3.5 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'rgba(244,63,117,0.07)', border: '1px solid rgba(244,63,117,0.2)', color: '#c0395e' }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Input bar — flex-none, always at the bottom of flex column ── */}
        <div className="flex-none px-3 pt-1.5 pb-3 border-t border-rose-50">

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
