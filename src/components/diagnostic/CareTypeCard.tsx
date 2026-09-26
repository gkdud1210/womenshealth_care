'use client'

import Link from 'next/link'
import { Users, Salad, Dumbbell, SprayCan, ArrowRight, CheckCircle2, Layers, Stethoscope } from 'lucide-react'
import { getSubtypesForCard } from '@/data/careSubtypes'
import { classifyCareSubtype } from '@/lib/careSubtypeClassifier'
import { CARE_CASES, type CareCaseId } from '@/data/careCases'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { OnboardingProfile } from '@/lib/onboarding-profile'

interface Props {
  careCaseId: CareCaseId
  data: MultimodalData
  profile: OnboardingProfile
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items))
}

/** '탈모 & 두피 케어'를 제외한 11개 케어카드의 세부 체질 분류 카드.
 *  구조는 HairCareTypeCard와 동일하게 맞췄어요 (헤더 → 모임/루틴 → 식습관/운동/홈케어). */
export function CareTypeCard({ careCaseId, data, profile }: Props) {
  const classification = classifyCareSubtype(careCaseId, data, profile)
  const subtypes = getSubtypesForCard(careCaseId)
  if (!classification || subtypes.length === 0) return null

  const card = CARE_CASES.find(c => c.id === careCaseId)
  const t = subtypes.find(s => s.id === classification.primary.id)
  const s = classification.secondary ? subtypes.find(x => x.id === classification.secondary!.id) : null
  if (!t) return null

  const dietGood = s ? uniq([...t.diet.good, ...s.diet.good]) : t.diet.good
  const dietAvoid = s ? uniq([...t.diet.avoid, ...s.diet.avoid]) : t.diet.avoid
  const exercise = s ? uniq([...t.exercise, ...s.exercise]) : t.exercise
  const homecare = s ? uniq([...t.homecare, ...s.homecare]) : t.homecare

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
              나의 {card?.label ?? ''} 웰니스 유형
            </p>
            <p className="text-base font-bold text-slate-800 mt-0.5">{t.label}</p>
            <p className="text-xs text-slate-400">{t.subtitle}</p>
            <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{t.mechanism}</p>
          </div>
        </div>

        <div className="mt-3.5 space-y-1.5">
          {[t.irisSign, t.symptomHints, t.bodyHint].map((hint, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: t.color }} />
              <p className="text-xs text-slate-500 leading-relaxed">{hint}</p>
            </div>
          ))}
        </div>

        {s && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[11px] font-semibold text-slate-500">복합 원인 분석</p>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden mb-2">
              <div style={{ width: `${classification.primary.percent}%`, background: t.gradient }} />
              <div style={{ width: `${classification.secondary!.percent}%`, background: s.gradient }} />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold" style={{ color: t.color }}>{t.emoji} {t.label} {classification.primary.percent}%</span>
              <span className="font-semibold" style={{ color: s.color }}>{s.emoji} {s.label} {classification.secondary!.percent}%</span>
            </div>
            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
              <b style={{ color: t.color }}>{t.label}</b> 원인과{' '}
              <b style={{ color: s.color }}>{s.label}</b> 원인이 결합된 결과예요. 두 원인을 함께 관리하면 더 빠른 개선을 기대할 수 있어요.
            </p>
          </div>
        )}

        {t.monitoringGuide && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2">
            <Stethoscope className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
            <p className="text-xs text-slate-500 leading-relaxed">
              <b className="text-slate-600">모니터링 가이드</b> · {t.monitoringGuide}
              {s?.monitoringGuide && <> / {s.monitoringGuide}</>}
            </p>
          </div>
        )}
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

        {s && (
          <div className="rounded-2xl p-4 mt-3" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <p className="text-sm font-bold text-slate-800">{s.routineClub.name}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {s.routineClub.activities.map(a => (
                <span key={a} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/70 border border-white text-slate-600">
                  {a}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-3">{s.meetupNote}</p>
            <Link
              href={`/community?category=${s.meetupCategory}`}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
              style={{ background: s.gradient, boxShadow: `0 4px 14px ${s.glow}` }}>
              추천 모임 보러가기 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* 식습관 · 운동 · 홈케어 */}
      <div className="glass-card p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Salad className="w-4 h-4" style={{ color: t.color }} />
            <h3 className="text-sm font-semibold text-slate-700">식습관</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dietGood.map(f => (
              <span key={f} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
                ✓ {f}
              </span>
            ))}
            {dietAvoid.map(f => (
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
            {exercise.map(e => (
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
            {homecare.map(h => (
              <p key={h} className="text-xs text-slate-500 leading-relaxed">• {h}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
