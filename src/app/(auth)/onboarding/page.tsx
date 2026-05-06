'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Brain } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { CARE_CASES } from '@/data/careCases'

export default function OnboardingPage() {
  const router   = useRouter()
  const { user, saveUser, startSession, ready } = useAuth()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (ready && !user) router.replace('/signup')
    if (ready && user && user.careTypes.length > 0) {
      setSelected(new Set(user.careTypes))
    }
  }, [ready, user, router])

  if (!ready || !user) return null

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
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-slate-800 mb-2">
          {user.name}님, 어떤 건강에<br />집중하고 싶으신가요?
        </h1>
        <p className="text-sm text-slate-400">해당하는 항목을 모두 선택해주세요<br />LUDIA가 맞춤 분석을 제공합니다</p>
      </div>

      {/* Care case grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl mb-8">
        {CARE_CASES.map(({ id, label, desc, icon: Icon, gradient, glow, border, bg }) => {
          const active = selected.has(id)
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
              <p className="font-semibold text-slate-800 text-sm leading-tight mb-1">{label}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">{desc}</p>
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
            언제든지 설정에서 변경할 수 있어요
          </p>
        </div>
      </div>
    </div>
  )
}
