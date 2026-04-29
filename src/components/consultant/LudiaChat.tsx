'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Brain, Send, Sparkles, User, ChevronDown, Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import { askLudia, SUGGESTED_QUESTIONS } from '@/lib/ludia-engine'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { CyclePhase } from '@/types/health'
import { getPhaseLabel, getPhaseColor } from '@/lib/cycle-utils'

/* ─── Types ──────────────────────────────────────────────────── */
interface Message {
  id: string
  role: 'user' | 'ludia'
  text: string
  sources?: string[]
  confidence?: 'high' | 'medium'
  ts: Date
}

/* ─── Typewriter ─────────────────────────────────────────────── */
function useTypewriter(target: string, active: boolean, speed = 16) {
  const [out, setOut] = useState('')
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!active) { setOut(target); setDone(true); return }
    setOut(''); setDone(false)
    let i = 0
    function tick() {
      i++
      setOut(target.slice(0, i))
      if (i < target.length) timer.current = setTimeout(tick, speed)
      else setDone(true)
    }
    timer.current = setTimeout(tick, 80)
    return () => clearTimeout(timer.current)
  }, [target, active, speed])

  return { out, done }
}

/* ─── Single LUDIA bubble ────────────────────────────────────── */
function LudiaBubble({ msg, isLast }: { msg: Message; isLast: boolean }) {
  const { out, done } = useTypewriter(msg.text, msg.role === 'ludia' && isLast)

  return (
    <div className="flex items-end gap-2.5 animate-fade-in">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mb-1"
        style={{
          background: 'linear-gradient(135deg, #0f0810 0%, #2d1129 60%, #1a0a18 100%)',
          boxShadow: '0 2px 12px rgba(244,63,117,0.25)',
        }}>
        <Brain className="w-4 h-4 text-rose-300" />
      </div>

      <div className="max-w-[82%] space-y-2">
        {/* Sender label */}
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] font-black tracking-[0.15em]"
            style={{
              background: 'linear-gradient(135deg, #d4af37, #b8962e, #e8d07a)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>LUDIA</span>
          <span className="text-[10px] text-slate-400">{msg.ts.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        {/* Message bubble */}
        <div className="rounded-2xl rounded-bl-md p-4"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 4px 24px rgba(158,18,57,0.07), 0 1px 4px rgba(158,18,57,0.04), inset 0 1px 0 rgba(255,255,255,0.95)',
          }}>
          <p className="text-sm text-slate-700 leading-relaxed font-light">
            {out}
            {!done && (
              <span className="inline-block w-0.5 h-4 bg-rose-400 ml-0.5 animate-pulse align-middle rounded-full" />
            )}
          </p>
        </div>

        {/* Source pills */}
        {done && msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            <Database className="w-2.5 h-2.5 text-slate-300" />
            {msg.sources.map(src => (
              <span key={src} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#9a7d26' }}>
                {src}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── User bubble ────────────────────────────────────────────── */
function UserBubble({ msg }: { msg: Message }) {
  return (
    <div className="flex items-end gap-2.5 flex-row-reverse animate-fade-in">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mb-1 bg-rose-100">
        <User className="w-4 h-4 text-rose-500" />
      </div>
      <div className="max-w-[78%] space-y-1.5">
        <p className="text-[10px] text-slate-400 text-right px-1">
          {msg.ts.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <div className="rounded-2xl rounded-br-md px-4 py-3"
          style={{
            background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
            boxShadow: '0 4px 16px rgba(244,63,117,0.3)',
          }}>
          <p className="text-sm text-white font-medium">{msg.text}</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Typing indicator ───────────────────────────────────────── */
function ThinkingBubble() {
  return (
    <div className="flex items-end gap-2.5 animate-fade-in">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mb-1"
        style={{ background: 'linear-gradient(135deg, #0f0810 0%, #2d1129 60%, #1a0a18 100%)' }}>
        <Brain className="w-4 h-4 text-rose-300 animate-pulse" />
      </div>
      <div className="rounded-2xl rounded-bl-md px-5 py-3.5"
        style={{
          background: 'rgba(255,255,255,0.88)',
          border: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 4px 24px rgba(158,18,57,0.07)',
        }}>
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-rose-300"
              style={{ animation: `bounce 1s ${i * 0.2}s infinite` }} />
          ))}
          <span className="text-xs text-slate-400 ml-1">분석 중...</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────── */
interface Props {
  data: MultimodalData
  phase: CyclePhase
  cycleDay: number
}

const GREETING: Message = {
  id: 'greeting',
  role: 'ludia',
  text: '안녕하세요! 저는 LUDIA예요. 홍채 · 열화상 · EDA · HRV · BMI · 생리 주기 데이터를 종합 분석해서 맞춤형 건강 인사이트를 드려요. 무엇이든 물어보세요! 💬',
  sources: [],
  ts: new Date(),
}

export function LudiaChat({ data, phase, cycleDay }: Props) {
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput]       = useState('')
  const [thinking, setThinking] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const submit = useCallback((text: string) => {
    if (!text.trim() || thinking) return
    setShowSuggestions(false)
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: text.trim(), ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setThinking(true)

    // Simulate brief analysis delay
    setTimeout(() => {
      const response = askLudia(text.trim(), data, phase, cycleDay)
      const ludiaMsg: Message = {
        id: crypto.randomUUID(),
        role: 'ludia',
        text: response.text,
        sources: response.sources,
        confidence: response.confidence,
        ts: new Date(),
      }
      setMessages(prev => [...prev, ludiaMsg])
      setThinking(false)
    }, 900 + Math.random() * 600)
  }, [data, phase, cycleDay, thinking])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input) }
  }

  const lastLudiaIdx = messages.map((m, i) => m.role === 'ludia' ? i : -1).filter(i => i >= 0).at(-1) ?? -1

  return (
    <div className="flex flex-col h-full">
      {/* ── Phase context bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-rose-100/60"
        style={{ background: 'rgba(255,255,255,0.6)' }}>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: getPhaseColor(phase) + '18', border: `1px solid ${getPhaseColor(phase)}35` }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: getPhaseColor(phase) }} />
          <span className="text-xs font-semibold" style={{ color: getPhaseColor(phase) }}>
            D+{cycleDay} · {getPhaseLabel(phase)}
          </span>
        </div>
        <div className="flex gap-2 items-center ml-auto">
          {[
            { label: 'EDA', value: data.eda.stressIndex, suffix: '', hi: 65 },
            { label: '자궁', value: data.thermal.uterineTemp, suffix: '°', lo: 36.2 },
            { label: 'HRV', value: data.biosignal.hrv, suffix: 'ms', lo: 38 },
          ].map(({ label, value, suffix, hi, lo }) => {
            const warn = (hi !== undefined && value >= hi) || (lo !== undefined && value < lo)
            return (
              <span key={label} className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md',
                warn ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-100/80')}>
                {label} {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}{suffix}
              </span>
            )
          })}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scrollbar-hide">
        {messages.map((msg, i) =>
          msg.role === 'ludia'
            ? <LudiaBubble key={msg.id} msg={msg} isLast={i === lastLudiaIdx} />
            : <UserBubble  key={msg.id} msg={msg} />
        )}
        {thinking && <ThinkingBubble />}

        {/* Suggested questions */}
        {showSuggestions && !thinking && (
          <div className="space-y-2">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold px-1">추천 질문</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.slice(0, 8).map(q => (
                <button key={q} onClick={() => submit(q)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    border: '1px solid rgba(244,63,117,0.2)',
                    color: '#64748b',
                    boxShadow: '0 2px 8px rgba(158,18,57,0.05)',
                  }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {!showSuggestions && !thinking && messages.length > 2 && (
          <button onClick={() => setShowSuggestions(true)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-rose-500 transition-colors mx-auto">
            <Sparkles className="w-3 h-3" /> 추천 질문 보기
          </button>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="px-4 py-3 border-t border-rose-100/60"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{
              background: 'rgba(253,248,246,0.9)',
              border: '1.5px solid rgba(244,63,117,0.15)',
              boxShadow: 'inset 0 1px 4px rgba(244,63,117,0.04)',
            }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="LUDIA에게 물어보세요..."
              disabled={thinking}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-300 outline-none min-w-0"
            />
            {input && (
              <button onClick={() => setInput('')}
                className="text-slate-300 hover:text-rose-400 text-xs flex-shrink-0 transition-colors">✕</button>
            )}
          </div>

          <button
            onClick={() => submit(input)}
            disabled={!input.trim() || thinking}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0 disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
              boxShadow: '0 3px 14px rgba(244,63,117,0.35)',
            }}>
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-slate-300 text-center mt-2">
          LUDIA는 AI 분석 인사이트를 제공하며 의학적 진단을 대체하지 않습니다
        </p>
      </div>
    </div>
  )
}
