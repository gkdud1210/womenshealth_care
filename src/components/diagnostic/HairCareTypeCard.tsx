'use client'

import Link from 'next/link'
import { Scissors, Users, Salad, Dumbbell, SprayCan, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HAIR_CARE_TYPES } from '@/data/hairCareTypes'
import { classifyHairCareType } from '@/lib/hairCareClassifier'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { OnboardingProfile } from '@/lib/onboarding-profile'

interface Props {
  data: MultimodalData
  profile: OnboardingProfile
}

export function HairCareTypeCard({ data, profile }: Props) {
  const typeId = classifyHairCareType(data, profile)
  const t = HAIR_CARE_TYPES[typeId]

  return (
    <div className="space-y-4">
      {/* 유형 헤더 */}
      <div className="glass-card p-5 border-l-4" style={{ borderLeftColor: t.color }}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl"
            style={{ background: t.bg, border: `1.5px solid ${t.border}` }}>
            {t.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: t.color }}>
              나의 탈모 원인 웰니스 유형
            </p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{t.label}</p>
            <p className="text-xs text-slate-400">{t.subtitle}</p>
            <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{t.mechanism}</p>
          </div>
        </div>

        <div className="mt-3.5 space-y-1.5">
          {t.profileHints.map((hint, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: t.color }} />
              <p className="text-xs text-slate-500 leading-relaxed">{hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 맞춤 모임 & 루틴 */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4" style={{ color: t.color }} />
          <h3 className="text-sm font-semibold text-slate-700">맞춤 모임 & 루틴</h3>
        </div>
        <div className="rounded-2xl p-4" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
          <p className="text-sm font-bold text-slate-800">{t.routineClub.name}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {t.routineClub.activities.map(a => (
              <span key={a} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/70 border border-white text-slate-600">
                {a}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">{t.meetupNote}</p>
          <Link
            href={`/community?category=${t.meetupCategory}`}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
            style={{ background: t.gradient, boxShadow: `0 4px 14px ${t.glow}` }}>
            추천 모임 보러가기 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 식습관 · 운동 · 홈케어 */}
      <div className="glass-card p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Salad className="w-4 h-4" style={{ color: t.color }} />
            <h3 className="text-sm font-semibold text-slate-700">식습관</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {t.diet.good.map(f => (
              <span key={f} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
                ✓ {f}
              </span>
            ))}
            {t.diet.avoid.map(f => (
              <span key={f} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-50 text-red-500 border border-red-200">
                ✕ {f}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="w-4 h-4" style={{ color: t.color }} />
            <h3 className="text-sm font-semibold text-slate-700">운동</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {t.exercise.map(e => (
              <span key={e} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                {e}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <SprayCan className="w-4 h-4" style={{ color: t.color }} />
            <h3 className="text-sm font-semibold text-slate-700">홈케어</h3>
          </div>
          <div className="space-y-1">
            {t.homecare.map(h => (
              <p key={h} className="text-xs text-slate-500 leading-relaxed">• {h}</p>
            ))}
          </div>
        </div>
      </div>

      {/* 맞춤 제품 */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="w-4 h-4" style={{ color: t.color }} />
          <h3 className="text-sm font-semibold text-slate-700">유형 맞춤 제품</h3>
        </div>
        <div className="space-y-2">
          {t.products.map((prod, i) => (
            <div key={i} className={cn('flex items-center gap-3 p-3.5 rounded-2xl border')}
              style={{ background: t.bg, borderColor: t.border }}>
              <span className="text-base">{prod.tag.split(' ')[0]}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">{prod.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{prod.reason}</p>
              </div>
              <Scissors className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.color }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
