'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Droplets, Zap, Sparkles, Activity, Leaf, Shield, Check, Brain, Scale, Wind, Bone, Scissors } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const CARE_CASES = [
  {
    id: 'healthy_cycle',
    label: '건강한 생리주기',
    desc: '규칙적인 주기 유지 · 호르몬 균형 관리',
    icon: Droplets,
    gradient: 'linear-gradient(135deg, #f43f75, #e11d5a)',
    glow: 'rgba(244,63,117,0.3)',
    border: 'rgba(244,63,117,0.25)',
    bg: 'rgba(244,63,117,0.06)',
  },
  {
    id: 'period_pain',
    label: '생리통 관리',
    desc: '통증 패턴 분석 · 자궁 냉증 · 진통 가이드',
    icon: Zap,
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    glow: 'rgba(239,68,68,0.3)',
    border: 'rgba(239,68,68,0.25)',
    bg: 'rgba(239,68,68,0.06)',
  },
  {
    id: 'skin_acne',
    label: '여드름 / 피부 질환',
    desc: '호르몬 피부 · 주기별 스킨케어 · 홍채 피부존',
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glow: 'rgba(245,158,11,0.3)',
    border: 'rgba(245,158,11,0.25)',
    bg: 'rgba(245,158,11,0.06)',
  },
  {
    id: 'thyroid_uterus',
    label: '갑상선 / 자궁 / 난소 관리',
    desc: '기관 온도 모니터링 · 이상 신호 감지',
    icon: Activity,
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    glow: 'rgba(168,85,247,0.3)',
    border: 'rgba(168,85,247,0.25)',
    bg: 'rgba(168,85,247,0.06)',
  },
  {
    id: 'fertility',
    label: '난임',
    desc: '배란일 추적 · 착상 환경 · 수정 가능 기간',
    icon: Leaf,
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    glow: 'rgba(16,185,129,0.3)',
    border: 'rgba(16,185,129,0.25)',
    bg: 'rgba(16,185,129,0.06)',
  },
  {
    id: 'cyst_fibroid_cancer',
    label: '물혹 · 근종 · 암',
    desc: '이상 온도 패턴 · 정기 모니터링 · 조기 신호',
    icon: Shield,
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    glow: 'rgba(59,130,246,0.3)',
    border: 'rgba(59,130,246,0.25)',
    bg: 'rgba(59,130,246,0.06)',
  },
  {
    id: 'diet',
    label: '다이어트',
    desc: '주기별 대사 변화 · 체중 관리 · 식이 가이드',
    icon: Scale,
    gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    glow: 'rgba(249,115,22,0.3)',
    border: 'rgba(249,115,22,0.25)',
    bg: 'rgba(249,115,22,0.06)',
  },
  {
    id: 'stress',
    label: '스트레스 관리',
    desc: 'EEG 뇌파 · HRV · 자율신경 균형 · 회복 가이드',
    icon: Wind,
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    glow: 'rgba(6,182,212,0.3)',
    border: 'rgba(6,182,212,0.25)',
    bg: 'rgba(6,182,212,0.06)',
  },
  {
    id: 'osteoporosis',
    label: '골다공증',
    desc: '호르몬 골밀도 변화 · 칼슘 흡수 · 운동 가이드',
    icon: Bone,
    gradient: 'linear-gradient(135deg, #64748b, #475569)',
    glow: 'rgba(100,116,139,0.3)',
    border: 'rgba(100,116,139,0.25)',
    bg: 'rgba(100,116,139,0.06)',
  },
  {
    id: 'hair_care',
    label: '모발 관리',
    desc: '탈모 패턴 · 두피 건강 · 주기별 영양 가이드',
    icon: Scissors,
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    glow: 'rgba(236,72,153,0.3)',
    border: 'rgba(236,72,153,0.25)',
    bg: 'rgba(236,72,153,0.06)',
  },
]

export default function OnboardingPage() {
  const router   = useRouter()
  const { user, saveUser, ready } = useAuth()
  const [selected, setSelected]   = useState<Set<string>>(new Set())

  useEffect(() => {
    if (ready && !user) router.replace('/signup')
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
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 sm:py-14">

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

              {/* Check badge */}
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

      {/* CTA */}
      <div className="w-full max-w-2xl">
        <button onClick={handleStart}
          disabled={selected.size === 0}
          className="w-full py-4 rounded-2xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"
          style={{
            background: selected.size > 0
              ? 'linear-gradient(135deg, #f43f75, #e11d5a)'
              : 'rgba(200,200,210,0.6)',
            boxShadow: selected.size > 0 ? '0 6px 24px rgba(244,63,117,0.4)' : 'none',
          }}>
          {selected.size > 0
            ? `${selected.size}개 선택 완료 · LUDIA 시작하기 →`
            : '항목을 선택해주세요'}
        </button>
        <p className="text-[11px] text-slate-300 text-center mt-3">
          언제든지 설정에서 변경할 수 있어요
        </p>
      </div>
    </div>
  )
}
