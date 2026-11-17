'use client'

// 홍채 심리 타입 — 기본 8가지 + 중간 단계(하이브리드) 4가지, 자율신경환 4대 형태 · 하나씩 자세히 (강점·주의·운동·식습관·생활 리듬·후기)

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Dumbbell, Salad, Moon, Sparkles, MessageSquareHeart, ArrowLeftRight } from 'lucide-react'
import { TEMPERAMENTS, PSYCHE_TYPES, HYBRID_TYPES, ANW_FORMS, analyzePsyche, type Temperament, type HybridId, type AnwForm } from '@/lib/iris-psyche'
import { PSYCHE_GUIDE, typeId, parseTypeId } from '@/data/psycheTypeGuide'
import { findTheme } from '@/data/feedThemes'
import { useDiagnosticHistory } from '@/lib/diagnosticHistory'

const CALM = '#0d9488'
const TENSE = '#e11d48'
const TEMPS = Object.keys(TEMPERAMENTS) as Temperament[]

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">{icon}<h3 className="text-sm font-semibold text-slate-700">{title}</h3></div>
      {children}
    </div>
  )
}

export default function PsycheTypesPage() {
  const [sel, setSel] = useState<string | null | undefined>(undefined)
  const { sessions, ready } = useDiagnosticHistory()

  useEffect(() => {
    const sync = () => setSel(new URLSearchParams(window.location.search).get('t'))
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  function open(id: string | null) {
    setSel(id)
    window.history.pushState(null, '', id ? `?t=${id}` : window.location.pathname)
    window.scrollTo(0, 0)
  }

  if (sel === undefined || !ready) return null

  // 가장 최근 기록의 내 타입
  const mine = sessions[0] ? analyzePsyche(sessions[0].data) : null
  const myId = mine?.hybrid ? `hybrid_${mine.hybrid}` : mine?.temperament ? typeId(mine.temperament, mine.lean) : null
  const picked = parseTypeId(sel)

  // ── 목록 ──
  if (!picked) {
    return (
      <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto pb-16">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/diagnostic/psyche" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-rose-50 text-slate-400"><ChevronLeft className="w-5 h-5" /></Link>
          <h1 className="font-display text-xl font-semibold text-slate-800">홍채 심리 타입</h1>
        </div>
        <p className="text-[12px] text-slate-500 mb-4 leading-relaxed">
          타고난 기질(홍채 섬유) 4가지 × 지금 상태(안정·긴장) 2가지. 기질은 잘 변하지 않지만, 상태는 관리하면 안정 쪽으로 움직여요.
        </p>
        <div className="space-y-4">
          {TEMPS.map(t => {
            const tm = TEMPERAMENTS[t]
            return (
              <div key={t} className="space-y-4">
                {t === 'hessian' && (
              <div>
                <p className="text-[12px] font-bold mb-0.5 text-violet-600">🔀 중간 단계 (하이브리드형)</p>
                <p className="text-[11px] text-slate-400 mb-1.5">밀집형과 개방형 사이 — 섬유 밀도가 중간일 때, 섞인 패턴 + 안정(왼쪽)/긴장(오른쪽)으로 나눠요</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['harmony', 'mask', 'reverse', 'overload'] as HybridId[]).map(h => {
                    const ty = HYBRID_TYPES[h]
                    const id = `hybrid_${h}`
                    const isMine = id === myId
                    return (
                      <button key={h} onClick={() => open(id)}
                        className="relative text-left rounded-2xl p-3.5 bg-white border active:scale-[0.98] transition-transform"
                        style={{ borderColor: isMine ? '#8b5cf6' : '#f1f5f9', boxShadow: isMine ? '0 0 0 1px #8b5cf6' : '0 1px 3px rgba(15,23,42,0.05)' }}>
                        {isMine && <span className="absolute top-2 right-2 text-[9.5px] font-black px-1.5 py-0.5 rounded text-white bg-violet-500">내 타입</span>}
                        <span className="text-[28px] leading-none">{ty.emoji}</span>
                        <p className="mt-1.5 text-[14px] font-black text-slate-800">{ty.name}</p>
                        <p className="text-[10.5px] font-bold mt-0.5" style={{ color: ['harmony', 'reverse'].includes(h) ? CALM : TENSE }}>{['harmony', 'reverse'].includes(h) ? '① 안정·균형' : '② 긴장·과부하'}</p>
                        <p className="text-[10px] text-violet-500 mt-0.5">{ty.pattern}</p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">{ty.tagline}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
                )}
                <div>
                <p className="text-[12px] font-bold mb-1.5" style={{ color: tm.color }}>{tm.emoji} {tm.label} · {tm.short} <span className="text-slate-400 font-semibold">({tm.axis})</span></p>
                <div className="grid grid-cols-2 gap-2">
                  {(['calm', 'tense'] as const).map(s => {
                    const ty = PSYCHE_TYPES[t][s]
                    const id = typeId(t, s)
                    const isMine = id === myId
                    return (
                      <button key={s} onClick={() => open(id)}
                        className="relative text-left rounded-2xl p-3.5 bg-white border active:scale-[0.98] transition-transform"
                        style={{ borderColor: isMine ? (s === 'calm' ? CALM : TENSE) : '#f1f5f9', boxShadow: isMine ? `0 0 0 1px ${s === 'calm' ? CALM : TENSE}` : '0 1px 3px rgba(15,23,42,0.05)' }}>
                        {isMine && <span className="absolute top-2 right-2 text-[9.5px] font-black px-1.5 py-0.5 rounded text-white" style={{ background: s === 'calm' ? CALM : TENSE }}>내 타입</span>}
                        <span className="text-[28px] leading-none">{ty.emoji}</span>
                        <p className="mt-1.5 text-[14px] font-black text-slate-800">{ty.name}</p>
                        <p className="text-[10.5px] font-bold mt-0.5" style={{ color: s === 'calm' ? CALM : TENSE }}>{s === 'calm' ? '① 안정·균형' : '② 긴장·과부하'}</p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">{ty.tagline}</p>
                      </button>
                    )
                  })}
                </div>
                </div>
              </div>
            )
          })}

          <div>
            <p className="text-[12px] font-bold mb-0.5 text-slate-700">⭕ 자율신경환 4대 형태</p>
            <p className="text-[11px] text-slate-400 mb-1.5">정상은 동공 테두리에서 홍채 폭의 약 1/3 지점의 부드러운 원 — 여기서 벗어난 4가지 상태{mine?.anw ? ` · 내 자율신경환: ${ANW_FORMS[mine.anw.form].label}` : ''}</p>
            <div className="space-y-2">
              {(['narrow', 'lost', 'wide', 'irregular'] as AnwForm[]).map(f => {
                const m = ANW_FORMS[f]
                const isMine = mine?.anw?.form === f
                return (
                  <div key={f} className="rounded-2xl p-3.5 bg-white border" style={{ borderColor: isMine ? '#8b5cf6' : '#f1f5f9' }}>
                    <p className="text-[13.5px] font-black text-slate-800">{m.emoji} {m.label} <span className="text-[11px] font-semibold text-slate-400">{m.short}</span>
                      {isMine && <span className="ml-1.5 text-[9.5px] font-black px-1.5 py-0.5 rounded text-white bg-violet-500 align-middle">나</span>}</p>
                    <p className="text-[11px] text-slate-500 mt-1">🔍 {m.feature}</p>
                    <p className="text-[12px] text-slate-700 mt-1 leading-relaxed"><b>마음</b> — {m.mind}</p>
                    <p className="text-[12px] text-slate-700 mt-0.5 leading-relaxed"><b>몸</b> — {m.body}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <p className="mt-6 text-[10.5px] text-slate-400 leading-relaxed">홍채학적 해석에 바탕을 둔 웰니스 참고 정보예요. 의학적·심리학적 진단이 아니에요.</p>
      </div>
    )
  }

  // ── 타입 하나 자세히 ──
  const base = picked.kind === 'base' ? picked : null
  const hy = picked.kind === 'hybrid' ? HYBRID_TYPES[picked.h] : null
  const id = base ? typeId(base.t, base.s) : `hybrid_${(picked as { h: HybridId }).h}` as const
  const tm = base ? TEMPERAMENTS[base.t] : null
  const ty = base ? PSYCHE_TYPES[base.t][base.s] : hy!
  const g = PSYCHE_GUIDE[id]
  const s = base?.s
  const other = s === 'calm' ? 'tense' : 'calm'
  const otherTy = base ? PSYCHE_TYPES[base.t][other] : null
  const stColor = s === 'calm' ? CALM : TENSE
  const isMine = id === myId

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-2xl mx-auto pb-16 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => open(null)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-rose-50 text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
        <p className="text-[13px] font-bold text-slate-500">타입 목록</p>
      </div>

      <div className="rounded-3xl p-5" style={{ background: tm?.bg ?? '#f5f3ff' }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {tm ? <>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white" style={{ color: tm.color }}>{tm.emoji} {tm.label} · {tm.short}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: stColor }}>{s === 'calm' ? '안정·균형 상태' : '긴장·과부하 상태'}</span>
          </> : <>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-violet-600">🔀 중간 단계 (하이브리드형)</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white bg-violet-500">{hy!.pattern}</span>
          </>}
          {isMine && <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-slate-900 text-white">내 타입</span>}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-[52px] leading-none">{ty.emoji}</span>
          <div>
            <p className="text-[22px] font-black text-slate-900 leading-tight">{ty.name}</p>
            <p className="text-[12.5px] text-slate-600 mt-0.5">{ty.tagline}</p>
          </div>
        </div>
        <p className="mt-3 text-[13px] text-slate-700 leading-relaxed">{ty.desc}</p>
        {tm
          ? <p className="mt-2 text-[12px] text-slate-500 leading-relaxed">🔍 타고난 기질 — {tm.trait}. {tm.desc}</p>
          : <>
            <p className="mt-2 text-[12px] text-slate-500 leading-relaxed">🔍 홍채 특징 — {hy!.feature}</p>
            <p className="mt-1 text-[12px] text-slate-500 leading-relaxed">🩺 몸의 약한 곳 — {hy!.body}</p>
          </>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section icon={<Sparkles className="w-4 h-4 text-amber-500" />} title="강점">
          <ul className="space-y-1.5">{g.strengths.map(x => <li key={x} className="text-[12.5px] text-slate-700 flex gap-1.5"><span>✨</span>{x}</li>)}</ul>
        </Section>
        <Section icon={<span className="text-[14px]">⚠️</span>} title="주의할 점">
          <ul className="space-y-1.5">{g.watch.map(x => <li key={x} className="text-[12.5px] text-slate-700 flex gap-1.5"><span>•</span>{x}</li>)}</ul>
          <p className="text-[11px] font-bold text-slate-400 mt-3 mb-1">이런 신호가 오면 쉬어 가세요</p>
          <div className="flex flex-wrap gap-1.5">{g.signals.map(x => <span key={x} className="text-[11px] px-2 py-1 rounded-full bg-rose-50 text-rose-600">{x}</span>)}</div>
        </Section>
      </div>

      <Section icon={<Dumbbell className="w-4 h-4 text-blue-500" />} title="어울리는 운동">
        <div className="space-y-2.5">
          {g.exercise.map(x => (
            <div key={x.title} className="rounded-xl bg-blue-50/60 px-3.5 py-2.5">
              <p className="text-[13px] font-bold text-slate-800">{x.title}</p>
              <p className="text-[11.5px] text-slate-600 mt-0.5 leading-snug">{x.why}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] font-bold text-slate-400 mt-3 mb-1.5">관련 운동 글 · 루디아 크루 시설 보기</p>
        <div className="flex flex-wrap gap-1.5">
          {g.exerciseThemes.map(id => {
            const th = findTheme(id)
            return th && (
              <Link key={id} href={`/care?theme=${id}`}
                className="flex items-center gap-1 text-[12px] font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700">
                {th.emoji} {th.label} <ChevronRight className="w-3 h-3 text-slate-300" />
              </Link>
            )
          })}
        </div>
      </Section>

      <Section icon={<Salad className="w-4 h-4 text-emerald-500" />} title="식습관">
        <div className="space-y-2.5">
          {g.food.map(x => (
            <div key={x.title} className="rounded-xl bg-emerald-50/60 px-3.5 py-2.5">
              <p className="text-[13px] font-bold text-slate-800">{x.title}</p>
              <p className="text-[11.5px] text-slate-600 mt-0.5 leading-snug">{x.why}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] font-bold text-slate-400 mt-3 mb-1.5">줄이면 좋아요</p>
        <div className="flex flex-wrap gap-1.5">{g.avoid.map(x => <span key={x} className="text-[11.5px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">🚫 {x}</span>)}</div>
      </Section>

      <Section icon={<Moon className="w-4 h-4 text-violet-500" />} title="생활 리듬">
        <ul className="space-y-1.5">{[...ty.care, ...g.routine].filter((x, i, a) => a.indexOf(x) === i).map(x => (
          <li key={x} className="text-[12.5px] text-slate-700 flex gap-1.5"><span>✔</span>{x}</li>
        ))}</ul>
      </Section>

      {base && otherTy && <button onClick={() => open(typeId(base.t, other))}
        className="w-full flex items-center gap-3 rounded-2xl p-4 text-left bg-white border border-slate-100">
        <ArrowLeftRight className="w-4 h-4 flex-shrink-0" style={{ color: other === 'calm' ? CALM : TENSE }} />
        <span className="flex-1 min-w-0">
          <span className="block text-[11px] font-bold" style={{ color: other === 'calm' ? CALM : TENSE }}>
            {s === 'tense' ? '이완 케어로 돌아갈 본연의 모습' : '스트레스가 쌓이면 이렇게 바뀔 수 있어요'}
          </span>
          <span className="block text-[14px] font-black text-slate-800">{otherTy.emoji} {otherTy.name}</span>
        </span>
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </button>}

      <Section icon={<MessageSquareHeart className="w-4 h-4 text-rose-500" />} title={`${ty.name} 사람들의 후기`}>
        <div className="text-center py-4">
          <p className="text-3xl">🌱</p>
          <p className="text-[12.5px] text-slate-500 mt-1">같은 타입 사람들의 다이어트·운동·생활 후기를 곧 모아 보여드릴게요.</p>
          <Link href="/care?tab=review" className="mt-2 inline-block text-[12px] font-bold text-rose-500">지금 올라온 후기 보러 가기 →</Link>
        </div>
      </Section>

      <p className="text-[10.5px] text-slate-400 leading-relaxed">홍채학적 해석에 바탕을 둔 웰니스 참고 정보예요. 의학적·심리학적 진단이 아니며, 지병이 있거나 식단을 크게 바꿀 땐 전문가와 상의해 주세요.</p>
    </div>
  )
}
