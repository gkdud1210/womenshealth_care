'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Brain, Sparkles, RotateCcw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { CARE_CASES } from '@/data/careCases'
import {
  INTAKE_STEPS, scoreCareCards, autoSelectCareCards, saveIntake, loadIntake,
  type CareRecommendation,
} from '@/lib/care-recommend'

export default function OnboardingPage() {
  const router   = useRouter()
  const { user, saveUser, startSession, ready } = useAuth()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // 처음 가입한 사용자는 "뭐가 불편하세요?" 문진부터, 케어카드를 이미 고른 사용자(설정에서 재선택)는 카드 화면부터
  const [phase, setPhase]       = useState<'intake' | 'cards' | null>(null)
  const [stepIdx, setStepIdx]   = useState(0)
  const [answers, setAnswers]   = useState<Set<string>>(new Set())
  const [recs, setRecs]         = useState<CareRecommendation[]>([])

  useEffect(() => {
    if (!ready) return
    if (!user) { router.replace('/signup'); return }
    if (phase !== null) return
    const prevIntake = loadIntake()
    setAnswers(new Set(prevIntake))
    setRecs(scoreCareCards(prevIntake))
    if (user.careTypes.length > 0) {
      setSelected(new Set(user.careTypes))
      setPhase('cards')
    } else {
      setPhase('intake')
    }
  }, [ready, user, router, phase])

  if (!ready || !user || phase === null) return null

  if (phase === 'intake') {
    return (
      <IntakeScreen
        userName={user.name}
        stepIdx={stepIdx}
        answers={answers}
        onToggle={id => setAnswers(prev => {
          const next = new Set(prev)
          next.has(id) ? next.delete(id) : next.add(id)
          return next
        })}
        onBack={() => setStepIdx(i => Math.max(0, i - 1))}
        onNext={() => {
          if (stepIdx + 1 < INTAKE_STEPS.length) { setStepIdx(i => i + 1); return }
          const ids = Array.from(answers)
          const scored = scoreCareCards(ids)
          saveIntake(ids)
          setRecs(scored)
          setSelected(new Set(autoSelectCareCards(scored)))
          setPhase('cards')
          window.scrollTo(0, 0)
        }}
      />
    )
  }

  const recById = Object.fromEntries(recs.map(r => [r.id, r]))
  const autoPicked = new Set(autoSelectCareCards(recs))
  // 추천 카드를 위로 올려서 보여줘요
  const orderedCards = [...CARE_CASES].sort((a, b) =>
    (recById[b.id]?.score ?? 0) - (recById[a.id]?.score ?? 0))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleStart() {
    if (selected.size === 0) return
    saveUser({ ...user!, careTypes: Array.from(selected) })
    startSession()
    router.push('/onboarding/questions')
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-10 sm:py-14">

      {/* Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: 'linear-gradient(135deg, #0f0810 0%, #2d1129 55%, #1a0a18 100%)',
            boxShadow: '0 6px 24px rgba(244,63,117,0.3)',
          }}>
          <Brain className="w-6 h-6 text-rose-300" />
        </div>
        {recs.length > 0 ? (
          <>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-800 mb-2">
              {user.name}님께 꼭 맞는<br />케어카드를 골라봤어요
            </h1>
            <p className="text-sm text-slate-400">
              답변을 바탕으로 루디아가 먼저 선택해 두었어요<br />
              필요한 카드는 더 추가하거나 빼도 괜찮아요
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-800 mb-2">
              {user.name}님, 어떤 건강에<br />집중하고 싶으신가요?
            </h1>
            <p className="text-sm text-slate-400">해당하는 항목을 모두 선택해주세요<br />LUDIA가 맞춤 분석을 제공합니다</p>
          </>
        )}
        <button onClick={() => { setStepIdx(0); setPhase('intake') }}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
          <RotateCcw className="w-3 h-3" /> 불편한 점 {recs.length > 0 ? '다시 답하기' : '답하고 추천받기'}
        </button>
      </div>

      {/* Care case grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl mb-8">
        {orderedCards.map(({ id, label, desc, icon: Icon, gradient, glow, border, bg }) => {
          const active = selected.has(id)
          const rec = recById[id]
          const recommended = autoPicked.has(id)
          return (
            <button key={id} onClick={() => toggle(id)}
              className={cn(
                'relative text-left p-4 sm:p-5 rounded-2xl transition-all duration-200 active:scale-95',
                active ? 'shadow-lg' : 'hover:scale-[1.02]'
              )}
              style={{
                background: active ? bg : 'rgba(255,255,255,0.82)',
                border: `1.5px solid ${active ? border : 'rgba(255,255,255,0.95)'}`,
                boxShadow: active
                  ? `0 6px 24px ${glow}, inset 0 1px 0 rgba(255,255,255,0.9)`
                  : '0 2px 12px rgba(158,18,57,0.07)',
                backdropFilter: 'blur(12px)',
              }}>

              {active && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: gradient, boxShadow: `0 2px 8px ${glow}` }}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 flex-shrink-0"
                style={{ background: gradient, boxShadow: `0 4px 14px ${glow}` }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              {recommended && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 text-white"
                  style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)' }}>
                  <Sparkles className="w-2.5 h-2.5" /> 루디아 추천
                </span>
              )}
              <p className="font-semibold text-slate-800 text-sm leading-tight mb-1">{label}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
              {rec && (
                <p className="text-[11px] font-medium text-rose-500 leading-relaxed mt-1.5">
                  “{rec.reasons[0]}”{rec.reasons.length > 1 && ` 외 ${rec.reasons.length - 1}개`} 답변과 관련 있어요
                </p>
              )}
            </button>
          )
        })}
      </div>

      {selected.size > 0 && <div className="h-28" />}

      <div
        className="fixed bottom-0 left-0 right-0 transition-all duration-300 ease-out"
        style={{
          transform: selected.size > 0 ? 'translateY(0)' : 'translateY(110%)',
          pointerEvents: selected.size > 0 ? 'auto' : 'none',
        }}
      >
        <div className="px-4 pb-6 pt-3"
          style={{
            background: 'linear-gradient(to top, rgba(255,248,250,0.98) 70%, transparent)',
            backdropFilter: 'blur(12px)',
          }}>
          <button onClick={handleStart}
            className="w-full max-w-2xl mx-auto block py-4 rounded-2xl text-sm font-semibold text-white active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #f43f75, #e11d5a)',
              boxShadow: '0 6px 28px rgba(244,63,117,0.45)',
            }}>
            {selected.size}개 선택 완료 · LUDIA 시작하기 →
          </button>
          <p className="text-[11px] text-slate-300 text-center mt-2">
            선택한 케어카드로 피드·모임을 먼저 추천해 드려요 · 설정에서 언제든 변경할 수 있어요
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── "요즘 뭐가 불편하세요?" 문진 ──────────────────────────────────── */
function IntakeScreen({ userName, stepIdx, answers, onToggle, onBack, onNext }: {
  userName: string
  stepIdx: number
  answers: Set<string>
  onToggle: (id: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const step = INTAKE_STEPS[stepIdx]
  const picked = step.options.filter(o => answers.has(o.id)).length
  const isLast = stepIdx + 1 >= INTAKE_STEPS.length

  return (
    <div className="min-h-[100dvh] flex flex-col px-5 py-8 sm:py-12 max-w-xl mx-auto w-full">
      {stepIdx === 0 && (
        <div className="mb-5 px-4 py-3.5 rounded-2xl text-sm text-slate-600 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(168,85,247,0.15)' }}>
          <p className="font-semibold text-purple-600 mb-1">반가워요, {userName}님!</p>
          몇 가지만 알려주시면 <span className="font-semibold text-purple-600">꼭 맞는 케어카드</span>를 루디아가 골라드릴게요.
        </div>
      )}

      {/* 진행 바 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-500">루디아가 {userName}님을 알아가는 중이에요 💜</span>
          <span className="text-xs font-semibold text-purple-500">{stepIdx + 1} / {INTAKE_STEPS.length}</span>
        </div>
        <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((stepIdx + 1) / INTAKE_STEPS.length) * 100}%`, background: 'linear-gradient(90deg, #f43f75, #a855f7)' }} />
        </div>
      </div>

      <div className="flex-1 rounded-3xl p-6 mb-4"
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.95)',
          boxShadow: '0 8px 40px rgba(158,18,57,0.08)',
        }}>
        <h2 className="text-[18px] font-semibold text-slate-800 leading-snug mb-1">{step.title}</h2>
        <p className="text-xs text-slate-400 mb-5">{step.subtitle}</p>
        <div className="flex flex-wrap gap-2">
          {step.options.map(o => {
            const sel = answers.has(o.id)
            return (
              <button key={o.id} onClick={() => onToggle(o.id)}
                className={cn(
                  'px-3.5 py-2.5 rounded-full text-sm font-medium transition-all border active:scale-95',
                  sel ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-100 hover:border-purple-200',
                )}
                style={sel ? { background: 'linear-gradient(135deg, #f43f75, #a855f7)', boxShadow: '0 2px 12px rgba(168,85,247,0.3)' } : {}}>
                <span className="mr-1">{o.emoji}</span>{o.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2.5 pb-4">
        <button onClick={onNext}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #f43f75, #a855f7)', boxShadow: '0 4px 20px rgba(168,85,247,0.3)' }}>
          {isLast ? '케어카드 추천받기 ✨' : picked > 0 ? `${picked}개 선택 · 다음 →` : '다음 →'}
        </button>
        <div className="flex">
          {stepIdx > 0 && (
            <button onClick={onBack} className="flex-1 py-2.5 text-sm text-slate-400 hover:text-slate-500">← 이전</button>
          )}
          {picked === 0 && !isLast && (
            <button onClick={onNext} className="flex-1 py-2.5 text-sm text-slate-400 hover:text-slate-500">해당 없어요</button>
          )}
        </div>
      </div>
    </div>
  )
}
