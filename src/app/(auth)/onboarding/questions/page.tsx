'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { getQuestionsForCards, type Question } from '@/data/onboardingQuestions'
import { Bluetooth, CheckCircle2 } from 'lucide-react'

const ANSWERS_KEY = 'ludia_answers_v1'

type Answer = string | string[] | number

const ENCOURAGE: { threshold: number; msg: string }[] = [
  { threshold: 0,   msg: '루디아가 당신을 이해하기 시작했어요 💜' },
  { threshold: 26,  msg: '좋아요! 루디아가 점점 알아가고 있어요 🌸' },
  { threshold: 51,  msg: '절반 왔어요! 거의 다 왔어요 ✨' },
  { threshold: 76,  msg: '루디아가 당신을 거의 다 이해했어요 💪' },
  { threshold: 91,  msg: '마지막 질문이에요!' },
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
  const [step, setStep]                 = useState<'questions' | 'done' | 'device' | 'bluetooth'>('questions')
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
        setStep('done')
      } else {
        setIdx(i => i + 1)
      }
      setAnimating(false)
    }, 180)
  }, [questions, idx, answers])

  if (!ready || (step === 'questions' && questions.length === 0)) return null

  if (step === 'done') {
    return <CompletionScreen userName={user!.name} onFinish={() => setStep('device')} />
  }

  if (step === 'device') {
    return (
      <DeviceScreen
        onHasDevice={() => setStep('bluetooth')}
        onNoDevice={() => router.push('/calendar')}
      />
    )
  }

  if (step === 'bluetooth') {
    return <BluetoothScreen onFinish={() => router.push('/diagnostic/scan')} />
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
          <p className="font-semibold text-purple-600 mb-1">반가워요, {user!.name}님!</p>
          선택하신 카드들을 보니 평소에 어떤 부분을 소중히 관리하고 싶으신지 루디아가 잘 알 것 같아요.
          더 정확한 <span className="font-semibold text-purple-600">'호르몬 지도'</span>를 그려드리기 위해,
          루디아에게만 살짝 들려주실 이야기가 있나요?
          <span className="block text-[11px] text-slate-400 mt-1">아는 만큼만 편하게 답해주세요 💜</span>
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
          다음 →
        </button>
      </div>
    </div>
  )
}

/* ── 기기 선택 화면 ─────────────────────────────────────────── */
function DeviceScreen({ onHasDevice, onNoDevice }: {
  onHasDevice: () => void
  onNoDevice: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(145deg, #fdf6f9, #fce9f0, #f8eeff)' }}>
      <div className="space-y-8 max-w-sm w-full">

        {/* 아이콘 */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              boxShadow: '0 8px 32px rgba(139,92,246,0.4)',
            }}>
            <Bluetooth className="w-10 h-10 text-white" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-3">
            LUDIA 기기가 있으신가요?
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            LUDIA 기기를 연결하면 체온 · 홍채 데이터를 기반으로<br />
            <span className="font-semibold text-purple-600">정밀 진단</span>을 바로 시작할 수 있어요.
          </p>
        </div>

        <div className="space-y-3 w-full">
          <button onClick={onHasDevice}
            className="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              boxShadow: '0 6px 24px rgba(139,92,246,0.4)',
            }}>
            📲 기기 있어요 — Bluetooth 연결하기
          </button>
          <button onClick={onNoDevice}
            className="w-full py-3.5 rounded-2xl text-sm font-medium text-slate-500 transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: '1.5px solid rgba(200,200,210,0.6)',
            }}>
            기기가 없어요 — 캘린더로 바로 가기
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Bluetooth 연결 화면 ────────────────────────────────────── */
function BluetoothScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'scanning' | 'found' | 'connecting' | 'connected'>('scanning')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('found'),      1600)
    const t2 = setTimeout(() => setPhase('connecting'), 2800)
    const t3 = setTimeout(() => setPhase('connected'),  4400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const connected = phase === 'connected'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'linear-gradient(145deg, #f0f0ff, #ede8ff, #f5eeff)' }}>
      <div className="space-y-8 max-w-sm w-full">

        {connected ? (
          /* 연결 완료 */
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
                }}>
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-800 mb-2">연결 완료! 🎉</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                <span className="font-semibold text-emerald-600">LUDIA-001</span>과 연결됐어요.<br />
                이제 홍채·열화상·EDA·HRV 정밀 진단을 바로 시작할 수 있어요.<br />
                <span className="text-xs text-slate-400 mt-1 block">진단 완료 후 LUDIA AI가 맞춤 분석을 드립니다.</span>
              </p>
            </div>
            <button onClick={onFinish}
              className="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
                boxShadow: '0 6px 24px rgba(244,63,117,0.4)',
              }}>
              진단 시작하기 →
            </button>
          </>
        ) : (
          /* 검색 / 연결 중 */
          <>
            {/* 펄스 애니메이션 */}
            <div className="flex justify-center">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: 'rgba(139,92,246,0.15)', animationDuration: '1.4s' }} />
                <div className="absolute inset-3 rounded-full animate-ping"
                  style={{ background: 'rgba(139,92,246,0.2)', animationDuration: '1.4s', animationDelay: '0.35s' }} />
                <div className="absolute inset-6 rounded-full animate-ping"
                  style={{ background: 'rgba(139,92,246,0.25)', animationDuration: '1.4s', animationDelay: '0.7s' }} />
                <div className="absolute inset-9 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
                  }}>
                  <Bluetooth className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                {phase === 'scanning'   && 'LUDIA 기기 검색 중...'}
                {phase === 'found'      && 'LUDIA-001 발견!'}
                {phase === 'connecting' && 'LUDIA-001 연결 중...'}
              </h2>
              <p className="text-sm text-slate-400">
                {phase === 'scanning'   && '기기 전원이 켜져 있는지 확인해주세요'}
                {phase === 'found'      && '기기를 인식했어요. 연결을 시작할게요'}
                {phase === 'connecting' && '잠시만 기다려주세요'}
              </p>
            </div>

            {/* 단계 인디케이터 */}
            <div className="flex justify-center gap-2">
              {(['scanning', 'found', 'connecting', 'connected'] as const).map((p, i) => {
                const phases = ['scanning', 'found', 'connecting', 'connected']
                const done   = phases.indexOf(phase) >= i
                return (
                  <div key={p} className="w-2 h-2 rounded-full transition-all duration-500"
                    style={{ background: done ? '#8b5cf6' : 'rgba(139,92,246,0.2)' }} />
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
