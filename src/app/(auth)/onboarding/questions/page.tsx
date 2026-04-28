'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { getQuestionsForCards, type Question } from '@/data/onboardingQuestions'

const ANSWERS_KEY = 'ludia_answers_v1'

type Answer = string | string[] | number

const ENCOURAGE: { threshold: number; msg: string }[] = [
  { threshold: 0,   msg: '루디아가 당신을 이해하기 시작했어요 💜' },
  { threshold: 26,  msg: '좋아요! 루디아가 점점 알아가고 있어요 🌸' },
  { threshold: 51,  msg: '절반 왔어요! 거의 다 왔어요 ✨' },
  { threshold: 76,  msg: '루디아가 당신을 거의 다 이해했어요 💪' },
  { threshold: 91,  msg: '마지막 질문이에요! 조금만 더 🎉' },
]

function getEncourageMsg(pct: number) {
  return [...ENCOURAGE].reverse().find(e => pct >= e.threshold)?.msg ?? ENCOURAGE[0].msg
}

export default function QuestionsPage() {
  const router = useRouter()
  const { user, ready } = useAuth()

  const [questions, setQuestions]       = useState<Question[]>([])
  const [idx, setIdx]                   = useState(0)
  const [answers, setAnswers]           = useState<Record<string, Answer>>({})
  const [current, setCurrent]           = useState<Answer | null>(null)
  const [done, setDone]                 = useState(false)
  const [animating, setAnimating]       = useState(false)

  useEffect(() => {
    if (!ready) return
    if (!user) { router.replace('/signup'); return }
    setQuestions(getQuestionsForCards(user.careTypes))
  }, [ready, user, router])

  const saveAndAdvance = useCallback((answer: Answer | null) => {
    const q = questions[idx]
    const newAnswers = answer !== null
      ? { ...answers, [q.id]: answer }
      : answers

    setAnimating(true)
    setTimeout(() => {
      setAnswers(newAnswers)
      setCurrent(null)
      if (idx + 1 >= questions.length) {
        try { localStorage.setItem(ANSWERS_KEY, JSON.stringify(newAnswers)) } catch {}
        setDone(true)
      } else {
        setIdx(i => i + 1)
      }
      setAnimating(false)
    }, 180)
  }, [questions, idx, answers])

  if (!ready || (!done && questions.length === 0)) return null

  if (done) {
    return <CompletionScreen userName={user!.name} onFinish={() => router.push('/')} />
  }

  const q        = questions[idx]
  const total    = questions.length
  const pct      = Math.round((idx / total) * 100)
  const isFirst  = idx === 0
  const isLast   = idx + 1 >= total
  const canNext  = q.type === 'slider' || current !== null

  return (
    <div className="min-h-screen flex flex-col px-5 py-8 sm:py-12"
      style={{ background: 'linear-gradient(145deg, #fdf6f9 0%, #fce9f0 35%, #f8eeff 70%, #fdf0f8 100%)' }}>

      {/* ── 오프닝 메시지 (첫 질문만) ── */}
      {isFirst && (
        <div className="mb-5 px-4 py-3.5 rounded-2xl text-sm text-slate-600 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(168,85,247,0.15)' }}>
          <p className="font-semibold text-purple-600 mb-1">{user!.name}님,</p>
          고민되는 부분을 선택해 주셔서 감사해요. 루디아가 당신의 몸을 더 깊이 이해하고,
          홍채와 자궁 온도를 분석할 때 정확한 단서를 찾을 수 있도록 몇 가지만 더 물어볼게요.
          <span className="block text-[11px] text-slate-400 mt-1">기억나는 만큼만 편하게 답해 주세요 💜</span>
        </div>
      )}

      {/* ── 진행 바 ── */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-500">{getEncourageMsg(pct)}</span>
          <span className="text-xs font-semibold text-purple-500">{idx + 1} / {total}</span>
        </div>
        <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(4, pct)}%`,
              background: 'linear-gradient(90deg, #f43f75, #a855f7)',
            }} />
        </div>
      </div>

      {/* ── 질문 카드 ── */}
      <div className={cn('flex-1 flex flex-col transition-opacity duration-180', animating && 'opacity-0')}>
        <div className="rounded-3xl p-6 sm:p-7 mb-4 flex-1"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.95)',
            boxShadow: '0 8px 40px rgba(158,18,57,0.08)',
          }}>

          {/* 카테고리 배지 */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{q.emoji}</span>
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">{q.category}</span>
          </div>

          {/* 질문 텍스트 */}
          <h2 className="text-[17px] font-semibold text-slate-800 leading-snug mb-7">{q.text}</h2>

          {/* 답변 UI */}
          {q.type === 'slider' && (
            <SliderInput
              min={q.min!} max={q.max!}
              value={typeof current === 'number' ? current : Math.ceil((q.min! + q.max!) / 2)}
              onChange={setCurrent}
            />
          )}
          {q.type === 'radio' && (
            <RadioInput
              options={q.options!}
              value={typeof current === 'string' ? current : null}
              onChange={setCurrent}
            />
          )}
          {q.type === 'multiselect' && (
            <MultiSelectInput
              options={q.options!}
              value={Array.isArray(current) ? current : []}
              onChange={setCurrent}
            />
          )}
        </div>

        {/* ── 버튼 ── */}
        <div className="space-y-2.5 pb-4">
          <button
            onClick={() => saveAndAdvance(q.type === 'slider'
              ? (typeof current === 'number' ? current : Math.ceil((q.min! + q.max!) / 2))
              : current)}
            disabled={!canNext}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-35"
            style={{
              background: canNext
                ? 'linear-gradient(135deg, #f43f75, #a855f7)'
                : 'rgba(200,200,210,0.6)',
              boxShadow: canNext ? '0 4px 20px rgba(168,85,247,0.3)' : 'none',
            }}>
            {isLast ? '완료 — 루디아 시작하기 ✓' : '다음 →'}
          </button>
          <button
            onClick={() => saveAndAdvance(null)}
            className="w-full py-2.5 rounded-2xl text-sm text-slate-400 text-center hover:text-slate-500 transition-colors">
            지금은 잘 모르겠어요
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 슬라이더 ──────────────────────────────────────────────────── */
function SliderInput({ min, max, value, onChange }: {
  min: number; max: number; value: number; onChange: (v: Answer) => void
}) {
  const pct   = ((value - min) / (max - min)) * 100
  const emoji = value <= 3 ? '😌' : value <= 6 ? '😣' : value <= 8 ? '😖' : '😭'

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-5xl mb-2">{emoji}</div>
        <span className="text-4xl font-bold text-rose-500">{value}</span>
        <span className="text-slate-400 text-sm"> / {max}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-rose-400"
        style={{
          background: `linear-gradient(to right, #f43f75 0%, #f43f75 ${pct}%, #fce7f3 ${pct}%, #fce7f3 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>통증 없음</span><span>매우 심함</span>
      </div>
    </div>
  )
}

/* ── 라디오 ──────────────────────────────────────────────────── */
function RadioInput({ options, value, onChange }: {
  options: string[]; value: string | null; onChange: (v: Answer) => void
}) {
  return (
    <div className="space-y-2.5">
      {options.map(opt => {
        const sel = value === opt
        return (
          <button key={opt} onClick={() => onChange(opt)}
            className={cn(
              'w-full py-3 px-4 rounded-2xl text-sm font-medium text-left transition-all border',
              sel ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-100 hover:border-rose-200',
            )}
            style={sel ? {
              background: 'linear-gradient(135deg, #f43f75, #a855f7)',
              boxShadow: '0 4px 16px rgba(168,85,247,0.3)',
            } : {}}>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/* ── 멀티셀렉트 ───────────────────────────────────────────────── */
function MultiSelectInput({ options, value, onChange }: {
  options: string[]; value: string[]; onChange: (v: Answer) => void
}) {
  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const sel = value.includes(opt)
        return (
          <button key={opt} onClick={() => toggle(opt)}
            className={cn(
              'px-4 py-2.5 rounded-full text-sm font-medium transition-all border',
              sel ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-100 hover:border-purple-200',
            )}
            style={sel ? {
              background: 'linear-gradient(135deg, #f43f75, #a855f7)',
              boxShadow: '0 2px 12px rgba(168,85,247,0.3)',
            } : {}}>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/* ── 완료 화면 ──────────────────────────────────────────────── */
function CompletionScreen({ userName, onFinish }: { userName: string; onFinish: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(145deg, #fdf6f9, #fce9f0, #f8eeff)' }}>
      <div className="space-y-6 max-w-sm">
        <div className="text-6xl animate-bounce">🌸</div>
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-3">
            좋아요, {userName}님!
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            입력해 주신 정보를 바탕으로<br />
            <span className="font-semibold text-purple-600">당신만의 호르몬 지도</span>를 그리기 시작할게요.
            <br /><br />
            곧 당신을 위한 첫 번째 맞춤 조언을 드릴게요!
          </p>
        </div>
        <button onClick={onFinish}
          className="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
            boxShadow: '0 6px 24px rgba(244,63,117,0.4)',
          }}>
          LUDIA 시작하기 →
        </button>
      </div>
    </div>
  )
}
