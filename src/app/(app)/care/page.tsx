'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Dumbbell, Salad, Sparkles, Users, Images, Home } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { CARE_CASES, type CareCase, type CareCaseId } from '@/data/careCases'
import { CARE_BODY_PARTS } from '@/data/careBodyParts'
import { CATEGORY_META } from '@/data/meetupData'
import { recommendedMeetupCategories } from '@/lib/care-recommend'

function accent(gradient: string) {
  return gradient.match(/#[0-9a-fA-F]{6}/)?.[0] ?? '#f43f75'
}

function isCareId(v: string | null): v is CareCaseId {
  return !!v && CARE_CASES.some(c => c.id === v)
}

// ── 케어카드 상세: 부위 카테고리 ─────────────────────────────────────────────

function CareDetail({ care, onBack }: { care: CareCase; onBack: () => void }) {
  const parts = CARE_BODY_PARTS[care.id]
  const [partId, setPartId] = useState(parts[0]?.id)
  const part = parts.find(p => p.id === partId) ?? parts[0]
  const color = accent(care.gradient)
  const meetup = recommendedMeetupCategories([care.id])[0]
  const Icon = care.icon

  const tips = [
    { key: 'exercise', label: '운동', Icon: Dumbbell, text: part.exercise },
    { key: 'diet', label: '식단', Icon: Salad, text: part.diet },
    { key: 'homecare', label: '홈케어', Icon: Home, text: part.homecare },
  ]

  return (
    <div className="min-h-screen pb-24" style={{ background: '#fafafa' }}>
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={onBack} className="p-1"><ArrowLeft className="w-5 h-5 text-slate-700" /></button>
          <h1 className="flex-1 text-[15px] font-bold text-slate-900 truncate">{care.label}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="rounded-3xl p-4 mb-4 text-white" style={{ background: care.gradient, boxShadow: `0 8px 24px ${care.glow}` }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/20 flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[16px] font-bold leading-tight">{care.label}</p>
              <p className="text-[11.5px] text-white/85 mt-0.5 leading-snug">{care.desc}</p>
            </div>
          </div>
        </div>

        <p className="text-[12px] font-bold text-slate-500 mb-2 px-1">어느 부위가 고민이세요?</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {parts.map(p => {
            const on = p.id === part.id
            return (
              <button key={p.id} onClick={() => setPartId(p.id)}
                className={cn('flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border transition-all active:scale-95',
                  on ? 'bg-white shadow-md' : 'bg-white/70 border-slate-100')}
                style={on ? { borderColor: color } : undefined}>
                <span className="text-2xl leading-none">{p.emoji}</span>
                <span className="text-[12px] font-bold text-center leading-tight" style={{ color: on ? color : '#475569' }}>{p.label}</span>
              </button>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{part.emoji}</span>
            <p className="text-[15px] font-bold text-slate-900">{part.label} 케어</p>
          </div>
          <p className="text-[12.5px] text-slate-500 mb-3">{part.concern}</p>
          <div className="space-y-2">
            {tips.map(t => (
              <div key={t.key} className="flex gap-3 rounded-xl p-3" style={{ background: care.bg }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white">
                  <t.Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold" style={{ color }}>{t.label}</p>
                  <p className="text-[13px] text-slate-700 leading-snug">{t.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Link href={`/nutrition?care=${care.id}`}
            className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3 hover:shadow-md transition-shadow">
            <Images className="w-5 h-5 text-rose-400" />
            <span className="flex-1 text-[13.5px] font-semibold text-slate-700">루디아피드에서 관련 글 보기</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </Link>
          {meetup && (
            <Link href={`/community?category=${meetup}`}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3 hover:shadow-md transition-shadow">
              <Users className="w-5 h-5 text-rose-400" />
              <span className="flex-1 text-[13.5px] font-semibold text-slate-700">
                함께하는 {CATEGORY_META[meetup].emoji} {CATEGORY_META[meetup].label} 모임 찾기
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </Link>
          )}
        </div>

        <p className="text-[10.5px] text-slate-400 text-center mt-5 leading-relaxed">
          생활 속 웰니스 가이드예요. 통증이나 이상 증상이 계속되면 전문의와 상담하세요.
        </p>
      </div>
    </div>
  )
}

// ── 케어카드 목록 ────────────────────────────────────────────────────────────

export default function CarePage() {
  const { user } = useAuth()
  const [openId, setOpenId] = useState<CareCaseId | null>(null)
  const myCare = useMemo(() => user?.careTypes ?? [], [user])

  // 내 케어카드를 앞에
  const cards = useMemo(() => [
    ...CARE_CASES.filter(c => myCare.includes(c.id)),
    ...CARE_CASES.filter(c => !myCare.includes(c.id)),
  ], [myCare])

  // ?id=weight_metabolic 로 바로 열기 + 뒤로가기 지원
  useEffect(() => {
    const sync = () => {
      const id = new URLSearchParams(window.location.search).get('id')
      setOpenId(isCareId(id) ? id : null)
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  function open(id: CareCaseId | null) {
    setOpenId(id)
    const url = id ? `${window.location.pathname}?id=${id}` : window.location.pathname
    if (id) window.history.pushState(null, '', url)
    else window.history.replaceState(null, '', url)
    window.scrollTo(0, 0)
  }

  const openCare = CARE_CASES.find(c => c.id === openId)
  if (openCare) return <CareDetail care={openCare} onBack={() => open(null)} />

  return (
    <div className="min-h-screen pb-24" style={{ background: '#fafafa' }}>
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
        <div className="px-4 py-3 max-w-lg mx-auto">
          <h1 className="font-display text-xl font-semibold text-slate-800 leading-tight">케어</h1>
          <p className="text-[11.5px] text-slate-400">케어카드를 고르면 부위별 관리법을 알려드려요</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {myCare.length > 0 && (
          <div className="flex items-center gap-2 mb-3 px-3.5 py-2.5 rounded-2xl"
            style={{ background: 'linear-gradient(135deg,#fff1f5,#f5f0ff)', border: '1px solid rgba(244,63,117,0.12)' }}>
            <Sparkles className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <p className="flex-1 text-[12px] text-slate-600">💜 표시는 내 케어카드예요</p>
            <Link href="/onboarding" className="text-[11px] font-bold text-rose-500 flex-shrink-0">수정</Link>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          {cards.map(c => {
            const Icon = c.icon
            const mine = myCare.includes(c.id)
            const parts = CARE_BODY_PARTS[c.id]
            return (
              <button key={c.id} onClick={() => open(c.id)}
                className="bg-white rounded-2xl shadow-sm p-3.5 text-left hover:shadow-md transition-all active:scale-[0.98]"
                style={mine ? { boxShadow: `0 0 0 1.5px ${c.border}, 0 4px 14px ${c.glow}` } : undefined}>
                <div className="flex items-start justify-between mb-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.gradient }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  {mine && <span className="text-sm">💜</span>}
                </div>
                <p className="text-[13.5px] font-bold text-slate-900 leading-tight mb-1">{c.label}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {parts.slice(0, 3).map(p => p.label).join(' · ')}{parts.length > 3 ? ' …' : ''}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
