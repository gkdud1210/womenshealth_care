'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, MicOff, Volume2, CalendarCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { askLudia } from '@/lib/ludia-engine'
import { useOnboardingProfile } from '@/lib/onboarding-profile'
import { usePersistedLogs } from '@/hooks/usePersistedLogs'
import { getPhaseLabel, getPhaseColor } from '@/lib/cycle-utils'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { CyclePhase, DailyLogFormData } from '@/types/health'

/* ─── Keyframe styles ─────────────────────────────────────────────────── */
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
  event?: { title: string; date: string; time: string | null }
}

interface ParsedEvent {
  hasEvent: boolean
  title: string | null
  date: string | null
  time: string | null
}

interface Props {
  data: MultimodalData
  phase: CyclePhase
  cycleDay: number
  userName: string
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function fmtTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (h === 0)  return `오전 12:${String(m).padStart(2, '0')}`
  if (h < 12)   return `오전 ${h}:${String(m).padStart(2, '0')}`
  if (h === 12) return `오후 12:${String(m).padStart(2, '0')}`
  return `오후 ${h - 12}:${String(m).padStart(2, '0')}`
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function pickKoreanFemaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const korean = voices.filter(v => v.lang.startsWith('ko'))
  // Prefer known female voice names across platforms
  const femaleNames = ['Yuna', 'Google 한국의', '미나', 'Heami', 'Nari', 'Sora', 'Hyuna']
  for (const name of femaleNames) {
    const match = korean.find(v => v.name.includes(name))
    if (match) return match
  }
  // Fall back to first Korean voice available
  return korean[0] ?? null
}

function speak(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ko-KR'
  u.rate = 1.05
  u.pitch = 1.15

  const doSpeak = () => {
    const voice = pickKoreanFemaleVoice()
    if (voice) u.voice = voice
    if (onEnd) u.onend = onEnd
    window.speechSynthesis.speak(u)
  }

  // voices may not be loaded yet on first call
  if (window.speechSynthesis.getVoices().length > 0) {
    doSpeak()
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
  }
}

function welcome(name: string, cycleDay: number, phase: CyclePhase): Message {
  const phaseInfo: Record<CyclePhase, string> = {
    menstrual:  '몸을 따뜻하게 챙기고 계신가요?',
    follicular: '에너지가 올라오는 시기예요!',
    ovulation:  '활력이 넘치는 시기예요.',
    luteal:     'PMS 관리가 중요한 시기예요.',
  }
  return {
    id: 'welcome',
    role: 'ludia',
    text: `안녕하세요, ${name}님! 현재 D+${cycleDay}일 ${getPhaseLabel(phase)}이에요. ${phaseInfo[phase]} 건강에 대해 무엇이든 물어보세요.`,
  }
}

const EXAMPLES = [
  '오늘 컨디션 어때?',
  '스트레스가 너무 심해',
  '다음 생리 언제야?',
  '수면이 부족해',
  '지금 단계에 뭐 먹으면 좋아?',
  '피부 트러블이 심해',
]

/* ─── Phase accent colors ─────────────────────────────────────────────── */
const PHASE_ACCENT: Record<CyclePhase, { ring: string; badge: string; text: string }> = {
  menstrual:  { ring: '#f43f75', badge: 'rgba(244,63,117,0.12)', text: '#d94f5c' },
  follicular: { ring: '#fb923c', badge: 'rgba(251,146,60,0.12)',  text: '#3d8b56' },
  ovulation:  { ring: '#a855f7', badge: 'rgba(168,85,247,0.12)', text: '#7048c0' },
  luteal:     { ring: '#f59e0b', badge: 'rgba(245,158,11,0.12)', text: '#b8870b' },
}

/* ─── Component ───────────────────────────────────────────────────────── */
export function LudiaVoice({ data, phase, cycleDay, userName }: Props) {
  const profile       = useOnboardingProfile()
  const { setLogs }   = usePersistedLogs()
  const phaseColor    = getPhaseColor(phase)
  const phaseAccent   = PHASE_ACCENT[phase]

  const [vs, setVs]           = useState<VoiceState>('idle')
  const [messages, setMessages] = useState<Message[]>(() => [welcome(userName, cycleDay, phase)])
  const [interim, setInterim]   = useState('')

  const vsRef    = useRef<VoiceState>('idle')
  const recogRef = useRef<any>(null)
  const chatRef  = useRef<HTMLDivElement>(null)

  const updateVs = useCallback((s: VoiceState) => {
    vsRef.current = s
    setVs(s)
  }, [])

  useEffect(() => {
    const el = chatRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, interim, vs])

  useEffect(() => () => {
    recogRef.current?.stop()
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [])

  /* Save a parsed calendar event to localStorage */
  const saveEvent = useCallback((ev: ParsedEvent) => {
    if (!ev.hasEvent || !ev.title) return
    const dateKey = ev.date ?? today()
    setLogs(prev => {
      const existing: Partial<DailyLogFormData> = prev[dateKey] ?? {}
      const note = `📅 ${ev.title}${ev.time ? ` ${fmtTime(ev.time)}` : ''}`
      return {
        ...prev,
        [dateKey]: {
          ...existing,
          date: dateKey,
          notes: existing.notes ? `${existing.notes}\n${note}` : note,
        } as DailyLogFormData,
      }
    })
  }, [setLogs])

  /* Build conversation history for Claude API */
  const buildHistory = useCallback(() =>
    messages
      .filter(m => m.id !== 'welcome')
      .slice(-10)
      .map(m => ({
        role: m.role === 'ludia' ? ('assistant' as const) : ('user' as const),
        content: m.text,
      })),
  [messages])

  /* Process user speech/text */
  const processText = useCallback(async (text: string) => {
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    updateVs('thinking')

    let reply = ''
    let parsedEvent: ParsedEvent = {
      hasEvent: false, title: null, date: null, time: null,
    }

    try {
      const res = await fetch('/api/ludia/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: buildHistory(),
          context: {
            phase,
            cycleDay,
            careTypes: profile.careTypes ?? [],
            stressIndex: data.eda.stressIndex,
            hrv: data.biosignal.hrv,
            sleepHours: data.biosignal.sleepHours,
            uterineTemp: data.thermal.uterineTemp,
            today: today(),
            userName,
          },
        }),
      })

      if (res.ok) {
        const json = await res.json()
        reply = json.reply ?? ''
        parsedEvent = json.event ?? parsedEvent
      } else {
        reply = askLudia(text, data, phase, cycleDay, profile).text
      }
    } catch {
      reply = askLudia(text, data, phase, cycleDay, profile).text
    }

    if (parsedEvent.hasEvent && parsedEvent.title) {
      saveEvent(parsedEvent)
    }

    const ludiaMsg: Message = {
      id: `l-${Date.now()}`,
      role: 'ludia',
      text: reply,
      event: parsedEvent.hasEvent && parsedEvent.title
        ? {
            title: parsedEvent.title,
            date: parsedEvent.date ?? today(),
            time: parsedEvent.time,
          }
        : undefined,
    }
    setMessages(prev => [...prev, ludiaMsg])
    updateVs('speaking')
    speak(reply, () => updateVs('idle'))
  }, [data, phase, cycleDay, userName, profile, buildHistory, saveEvent, updateVs])

  /* STT */
  const startListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ??
      (window as any).webkitSpeechRecognition
    if (!SR) {
      processText('오늘 내 컨디션 어때')
      return
    }
    const recog = new SR()
    recog.lang = 'ko-KR'
    recog.continuous = false
    recog.interimResults = true
    recogRef.current = recog

    recog.onresult = (e: any) => {
      const r = e.results[e.results.length - 1]
      if (r.isFinal) {
        setInterim('')
        processText(r[0].transcript)
      } else {
        setInterim(r[0].transcript)
      }
    }
    recog.onerror = () => { setInterim(''); updateVs('idle') }
    recog.onend   = () => {
      setInterim('')
      if (vsRef.current === 'listening') updateVs('idle')
    }

    updateVs('listening')
    try { recog.start() } catch {}
  }, [processText, updateVs])

  const handleMic = useCallback(() => {
    if (vs === 'idle')      { startListening() }
    else if (vs === 'listening') { recogRef.current?.stop() }
    else if (vs === 'speaking')  {
      window.speechSynthesis.cancel()
      updateVs('idle')
    }
    // 'thinking' → do nothing (wait for response)
  }, [vs, startListening, updateVs])

  /* ─── Mic button visual state ────────────────────────────────── */
  const micBg = {
    idle:      'linear-gradient(145deg, #160b20, #2d1240)',
    listening: 'linear-gradient(135deg, #f43f75, #e11d5a)',
    thinking:  'linear-gradient(135deg, #7c3aed, #a855f7)',
    speaking:  'linear-gradient(135deg, #f43f75, #a855f7)',
  }[vs]

  const micShadow = {
    idle:      '0 8px 32px rgba(244,63,117,0.2), 0 0 0 1px rgba(244,63,117,0.12)',
    listening: '0 8px 32px rgba(244,63,117,0.5)',
    thinking:  '0 8px 32px rgba(168,85,247,0.5)',
    speaking:  '0 8px 32px rgba(168,85,247,0.4)',
  }[vs]

  const statusText = {
    idle:      '마이크 버튼을 눌러 말씀해보세요',
    listening: '듣고 있어요...',
    thinking:  '분석 중이에요...',
    speaking:  '말하고 있어요...',
  }[vs]

  return (
    <>
      <style>{ANIMATION_CSS}</style>

      {/* ─── Full-page container ──────────────────────────────────── */}
      <div className="flex flex-col max-w-lg mx-auto"
        style={{ minHeight: '100dvh' }}>

        {/* ─── Header ────────────────────────────────────────────── */}
        <header className="flex-none flex items-center justify-between px-5 pt-5 pb-4">

          {/* LUDIA wordmark */}
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

          {/* Cycle badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: phaseAccent.badge,
              border: `1px solid ${phaseColor}30`,
            }}>
            <div className="w-2 h-2 rounded-full" style={{ background: phaseColor }} />
            <span className="text-xs font-semibold" style={{ color: phaseAccent.text }}>
              D+{cycleDay} {getPhaseLabel(phase)}
            </span>
          </div>
        </header>

        {/* ─── Scrollable chat area ──────────────────────────────── */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto px-4 space-y-3"
          style={{ paddingBottom: '220px' }}
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
              style={{ animation: 'ludia-msg 0.28s ease-out both' }}
            >
              {/* LUDIA avatar */}
              {msg.role === 'ludia' && (
                <div
                  className="w-7 h-7 rounded-xl flex-none flex items-center justify-center self-end mb-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #f43f75, #a855f7)',
                    boxShadow: '0 2px 8px rgba(244,63,117,0.25)',
                  }}>
                  <span className="text-[9px] font-black text-white">L</span>
                </div>
              )}

              <div
                className={cn(
                  'max-w-[78%] flex flex-col gap-1.5',
                  msg.role === 'user' ? 'items-end' : 'items-start',
                )}>

                {/* Chat bubble */}
                <div
                  className={cn(
                    'px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'rounded-3xl rounded-br-lg text-slate-700 bg-white border border-rose-100'
                      : 'rounded-3xl rounded-bl-lg text-slate-700',
                  )}
                  style={msg.role === 'ludia' ? {
                    background:
                      'linear-gradient(135deg, rgba(255,241,245,0.97), rgba(253,240,255,0.97))',
                    border: '1px solid rgba(244,63,117,0.13)',
                    boxShadow: '0 2px 14px rgba(244,63,117,0.06)',
                  } : {
                    boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
                  }}>
                  {msg.text}
                </div>

                {/* Saved event chip */}
                {msg.event && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px]"
                    style={{
                      background: 'rgba(168,85,247,0.08)',
                      border: '1px solid rgba(168,85,247,0.22)',
                    }}>
                    <CalendarCheck
                      className="w-3 h-3 flex-none"
                      style={{ color: '#a855f7' }}
                    />
                    <span className="font-semibold" style={{ color: '#7c3aed' }}>
                      {msg.event.title}
                      {msg.event.time ? ` · ${fmtTime(msg.event.time)}` : ''} 저장됨
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Interim speech (real-time) */}
          {interim && (
            <div className="flex justify-end"
              style={{ animation: 'ludia-msg 0.18s ease-out both' }}>
              <div
                className="max-w-[78%] px-4 py-3 rounded-3xl rounded-br-lg text-sm text-slate-400 italic"
                style={{
                  background: 'rgba(255,255,255,0.75)',
                  border: '1px solid rgba(244,63,117,0.08)',
                }}>
                {interim}…
              </div>
            </div>
          )}

          {/* Thinking indicator */}
          {vs === 'thinking' && (
            <div className="flex gap-2 items-end"
              style={{ animation: 'ludia-msg 0.18s ease-out both' }}>
              <div
                className="w-7 h-7 rounded-xl flex-none flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #f43f75, #a855f7)' }}>
                <span className="text-[9px] font-black text-white">L</span>
              </div>
              <div
                className="px-4 py-3.5 rounded-3xl rounded-bl-lg"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,241,245,0.97), rgba(253,240,255,0.97))',
                  border: '1px solid rgba(244,63,117,0.13)',
                }}>
                <div className="flex items-center gap-1.5">
                  {[0, 0.18, 0.36].map((delay, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: 'linear-gradient(135deg,#f43f75,#a855f7)',
                        animation: `ludia-dot 0.8s ease-in-out ${delay}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Example chips — only when idle with no conversation */}
          {vs === 'idle' && messages.length <= 1 && (
            <div
              className="pt-3 pb-2"
              style={{ animation: 'ludia-msg 0.35s ease-out both' }}>
              <p className="text-[11px] text-slate-400 text-center mb-3 leading-relaxed">
                마이크 버튼을 눌러 말하거나 아래 예시를 탭해보세요
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex}
                    onClick={() => processText(ex)}
                    className="text-xs px-3.5 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: 'rgba(244,63,117,0.07)',
                      border: '1px solid rgba(244,63,117,0.2)',
                      color: '#c0395e',
                    }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Fixed mic section (above mobile nav) ─────────────────── */}
      <div
        className="fixed bottom-above-nav inset-x-0 flex flex-col items-center gap-3 pb-1 z-50"
        style={{ pointerEvents: 'none' }}>

        {/* Status label */}
        <p
          className={cn(
            'text-xs font-medium transition-all duration-300',
            vs === 'idle' ? 'text-slate-400' : 'text-rose-500',
          )}
          style={{ pointerEvents: 'none' }}>
          {statusText}
        </p>

        {/* Mic button + pulse rings */}
        <div
          className="relative flex items-center justify-center"
          style={{ pointerEvents: 'auto' }}>

          {/* Listening rings */}
          {vs === 'listening' && [0, 0.5, 1].map((delay, i) => (
            <div
              key={i}
              className="absolute w-20 h-20 rounded-full"
              style={{
                background: 'rgba(244,63,117,0.22)',
                animation: `ludia-ring 1.8s ease-out ${delay}s infinite`,
              }}
            />
          ))}

          {/* Speaking ring */}
          {vs === 'speaking' && (
            <div
              className="absolute w-20 h-20 rounded-full"
              style={{
                background: 'rgba(168,85,247,0.18)',
                animation: 'ludia-ring 2s ease-out 0s infinite',
              }}
            />
          )}

          <button
            onClick={handleMic}
            aria-label="루디아 음성 대화"
            className={cn(
              'relative w-20 h-20 rounded-full flex flex-col items-center justify-center gap-0.5',
              'transition-all duration-300 select-none',
              vs === 'listening' ? 'scale-110' : 'hover:scale-105 active:scale-95',
            )}
            style={{ background: micBg, boxShadow: micShadow }}>

            {vs === 'listening' ? (
              <MicOff className="w-7 h-7 text-white" />
            ) : vs === 'speaking' ? (
              <Volume2 className="w-7 h-7 text-white animate-pulse" />
            ) : vs === 'thinking' ? (
              <div className="flex gap-1">
                {[0, 0.18, 0.36].map((d, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-white/70"
                    style={{ animation: `ludia-dot 0.8s ease-in-out ${d}s infinite` }}
                  />
                ))}
              </div>
            ) : (
              <Mic className="w-7 h-7 text-rose-300" />
            )}

            <span
              className="text-[7px] font-bold tracking-widest"
              style={{
                color: vs === 'idle' ? 'rgba(255,180,200,0.5)' : 'rgba(255,255,255,0.7)',
              }}>
              LUDIA
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
