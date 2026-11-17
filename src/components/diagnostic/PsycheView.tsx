'use client'

// 홍채로 보는 나의 심리 상태 — 안정·균형 ↔ 긴장·과부하 위치, 8가지 타입, 기질·자율신경·색소 해석

import Link from 'next/link'
import { ChevronRight, Brain, Sparkles, Info } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, CartesianGrid } from 'recharts'
import {
  analyzePsyche, tensionLine, STATE_META, TEMPERAMENTS, PSYCHE_TYPES, ANW_META, PIGMENT_META,
  type PsycheResult, type Temperament,
} from '@/lib/iris-psyche'
import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { DiagnosticSession } from '@/lib/diagnosticHistory'

const CALM = '#0d9488'
const TENSE = '#e11d48'

/** 안정·균형 ↔ 긴장·과부하 막대 위에 내 위치 */
export function PsycheGauge({ r, compact = false }: { r: PsycheResult; compact?: boolean }) {
  const st = STATE_META[r.state]
  return (
    <div>
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-[11.5px] font-bold" style={{ color: CALM }}>😌 안정·균형</span>
        <span className="text-[11.5px] font-bold" style={{ color: TENSE }}>긴장·과부하 😣</span>
      </div>
      <div className="relative h-4 rounded-full" role="img"
        aria-label={`긴장도 ${r.tension} / 100 — ${st.label}`}
        style={{ background: `linear-gradient(90deg, ${CALM} 0%, #a7f3d0 32%, #fde68a 50%, #fecaca 68%, ${TENSE} 100%)` }}>
        {/* 가운데(경계) 구간 */}
        <div className="absolute inset-y-0 border-x-2 border-white/80" style={{ left: '40%', width: '20%' }} />
        <div className="absolute -top-1.5 -translate-x-1/2 flex flex-col items-center transition-all duration-700"
          style={{ left: `${r.tension}%` }}>
          <div className="w-7 h-7 rounded-full bg-white border-[3px] shadow-md flex items-center justify-center text-[10px] font-black"
            style={{ borderColor: st.color, color: st.color }}>
            {r.tension}
          </div>
        </div>
      </div>
      <div className="relative h-3.5 mt-1 text-[10px] text-slate-400">
        {[[0, '0'], [40, '40'], [50, '중간'], [60, '60'], [100, '100']].map(([v, t]) => (
          <span key={t} className={`absolute ${v === 0 ? '' : v === 100 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${v}%` }}>{t}</span>
        ))}
      </div>
      {!compact && (
        <p className="mt-2 text-[13px] font-bold text-center" style={{ color: st.color }}>
          {st.label} · {tensionLine(r.tension)}
        </p>
      )}
    </div>
  )
}

/** 리포트·진단 화면에 넣는 요약 카드 */
export function PsycheSummaryCard({ data, href }: { data: MultimodalData; href: string }) {
  const r = analyzePsyche(data)
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-semibold text-slate-700">홍채로 보는 나의 심리 상태</h3>
      </div>
      <PsycheGauge r={r} />
      {r.type ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl px-3.5 py-3" style={{ background: TEMPERAMENTS[r.temperament!].bg }}>
          <span className="text-[30px] leading-none">{r.type.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-black text-slate-800">{r.type.name}</p>
            <p className="text-[11.5px] text-slate-500">{TEMPERAMENTS[r.temperament!].label} · {r.type.tagline}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[11.5px] text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
          홍채 스캔 결과가 없어서 EDA·HRV로 긴장도만 보여드려요. 홍채를 스캔하면 타고난 기질과 8가지 타입까지 알려드려요.
        </p>
      )}
      <Link href={href}
        className="mt-3 flex items-center justify-center gap-1 py-2.5 rounded-xl text-[12.5px] font-bold text-white"
        style={{ background: 'linear-gradient(135deg,#8b5cf6,#e11d48)' }}>
        <Sparkles className="w-3.5 h-3.5" /> 홍채 심리 자세히 보기 <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}

/** 8가지 타입 표 — 기질(행) × 상태(열), 내 칸 강조 */
function TypeMatrix({ r }: { r: PsycheResult }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <div className="grid grid-cols-[72px_1fr_1fr] text-[11px] font-bold">
        <div className="bg-slate-50 px-2 py-2 text-slate-400">기질</div>
        <div className="px-2 py-2 text-center" style={{ background: '#f0fdfa', color: CALM }}>① 안정·균형</div>
        <div className="px-2 py-2 text-center" style={{ background: '#fff1f2', color: TENSE }}>② 긴장·과부하</div>
      </div>
      {(Object.keys(TEMPERAMENTS) as Temperament[]).map(t => (
        <div key={t} className="grid grid-cols-[72px_1fr_1fr] border-t border-slate-100">
          <div className="bg-slate-50 px-2 py-2.5">
            <p className="text-[11.5px] font-bold text-slate-700">{TEMPERAMENTS[t].emoji} {TEMPERAMENTS[t].label}</p>
            <p className="text-[10px] text-slate-400">{TEMPERAMENTS[t].short}</p>
          </div>
          {(['calm', 'tense'] as const).map(s => {
            const ty = PSYCHE_TYPES[t][s]
            const mine = r.temperament === t && r.lean === s
            return (
              <Link key={s} href={`/diagnostic/psyche/types?t=${t}_${s}`} className="block px-2 py-2.5 text-center relative hover:bg-slate-50 active:scale-[0.97] transition-transform"
                style={mine ? { background: s === 'calm' ? '#ccfbf1' : '#ffe4e6', boxShadow: `inset 0 0 0 2px ${s === 'calm' ? CALM : TENSE}` } : undefined}>
                <p className="text-[18px] leading-none">{ty.emoji}</p>
                <p className={`mt-1 text-[11px] ${mine ? 'font-black text-slate-900' : 'font-semibold text-slate-600'}`}>{ty.name}</p>
                {mine && <span className="absolute top-1 right-1 text-[9px] font-black px-1 rounded text-white" style={{ background: s === 'calm' ? CALM : TENSE }}>나</span>}
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** 지난 기록들의 긴장도 변화 */
function TensionTrend({ sessions }: { sessions: DiagnosticSession[] }) {
  const rows = [...sessions]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(s => {
      const d = new Date(s.createdAt)
      const r = analyzePsyche(s.data)
      return { date: `${d.getMonth() + 1}/${d.getDate()}`, tension: r.tension, type: r.type?.name ?? '' }
    })
  if (rows.length < 2) return null
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-slate-700">긴장도 변화</h3>
      <p className="text-[11px] text-slate-400 mb-3">아래로 갈수록 안정·균형 쪽이에요</p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <ReferenceArea y1={40} y2={60} fill="#fef3c7" fillOpacity={0.5} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} ticks={[0, 40, 60, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v: number, _n, p) => [`${v} ${(p?.payload as { type?: string })?.type ?? ''}`, '긴장도']}
              contentStyle={{ fontSize: 12, borderRadius: 12 }} />
            <Line type="monotone" dataKey="tension" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** 홍채 심리 전체 화면 */
export function PsycheDetail({ data, sessions = [], scanHref }: { data: MultimodalData; sessions?: DiagnosticSession[]; scanHref: string }) {
  const r = analyzePsyche(data)
  const tm = r.temperament ? TEMPERAMENTS[r.temperament] : null
  const demo = (data.iris.detection?.right ?? data.iris.detection?.left)?.model?.source === '예시 데이터'

  return (
    <div className="space-y-4">
      {demo && (
        <p className="text-[11.5px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
          예시 기록으로 보여주는 화면이에요. 실제 홍채를 스캔하면 내 결과로 바뀌어요.
        </p>
      )}

      {/* 1. 지금 상태 */}
      <div className="glass-card p-5">
        <p className="text-[11.5px] font-bold text-slate-400 mb-3">지금 나는 어디쯤?</p>
        <PsycheGauge r={r} />
        {r.type && tm && (
          <div className="mt-4 rounded-2xl p-4" style={{ background: tm.bg }}>
            <div className="flex items-center gap-3">
              <span className="text-[40px] leading-none">{r.type.emoji}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold" style={{ color: tm.color }}>{tm.label} × {r.lean === 'calm' ? '안정' : '긴장'}</p>
                <p className="text-[18px] font-black text-slate-900">{r.type.name}</p>
                <p className="text-[11.5px] text-slate-500">{r.type.tagline}</p>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] text-slate-700 leading-relaxed">{r.type.desc}</p>
            {r.state === 'border' && (
              <p className="mt-2 text-[11.5px] text-amber-700">가운데(40~60)에 있어서 그날 컨디션에 따라 {PSYCHE_TYPES[r.temperament!].calm.name}과 {PSYCHE_TYPES[r.temperament!].tense.name} 사이를 오갈 수 있어요.</p>
            )}
            {r.calmType && (
              <div className="mt-3 rounded-xl bg-white/80 px-3 py-2.5 text-[12px] text-slate-700 leading-snug">
                🌱 지금은 <b>{r.type.name}</b>이지만, 이완 케어로 본연의 <b style={{ color: CALM }}>{r.calmType.emoji} {r.calmType.name}</b>으로 돌아갈 수 있어요.
              </div>
            )}
            <p className="mt-3 text-[11.5px] font-bold text-slate-500">이렇게 해 보세요</p>
            <ul className="mt-1 space-y-1">
              {r.type.care.map(c => <li key={c} className="text-[12px] text-slate-700 flex gap-1.5"><span>✔</span>{c}</li>)}
            </ul>
            <Link href={`/diagnostic/psyche/types?t=${r.temperament}_${r.lean}`}
              className="mt-3 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-white text-[12.5px] font-bold" style={{ color: tm.color }}>
              내 타입 자세히 — 어울리는 운동·식습관 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
        {!r.hasIris && (
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-[12.5px] text-slate-600">홍채 스캔 결과가 없어서 <b>타고난 기질</b>은 아직 몰라요.</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">지금 긴장도는 EDA·HRV 값으로만 계산했어요.</p>
            <Link href={scanHref} className="mt-2 inline-block text-[12px] font-bold text-violet-600">홍채 스캔하러 가기 →</Link>
          </div>
        )}
      </div>

      {/* 2. 무엇으로 계산했나 */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-700">긴장도는 이렇게 계산했어요</h3>
        <p className="text-[11px] text-slate-400 mb-3">막대가 길수록 긴장 쪽으로 끌어당겨요 · 괄호는 반영 비중</p>
        <div className="space-y-2.5">
          {r.parts.map(p => (
            <div key={p.label}>
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="font-semibold text-slate-700">{p.label} <span className="text-slate-400 font-normal">({Math.round(p.weight / r.parts.reduce((s, x) => s + x.weight, 0) * 100)}%)</span></span>
                <span className="font-bold text-slate-800">{p.value}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 mt-1">
                <div className="h-2 rounded-full" style={{ width: `${Math.max(2, p.value)}%`, background: '#8b5cf6' }} />
              </div>
              <p className="text-[10.5px] text-slate-400 mt-0.5">{p.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 8가지 타입 */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-700">8가지 홍채 심리 타입</h3>
        <p className="text-[11px] text-slate-400 mb-3">타고난 기질(4) × 지금 상태(안정·긴장) — 타입을 누르면 자세한 설명·운동·식습관을 볼 수 있어요</p>
        <TypeMatrix r={r} />
        <Link href="/diagnostic/psyche/types" className="mt-3 flex items-center justify-center gap-1 text-[12px] font-bold text-violet-600">
          8가지 타입 모두 자세히 보기 <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 4. 타고난 기질 */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-700">타고난 기질 — 홍채 섬유</h3>
        {tm ? (
          <>
            <div className="mt-3 flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-[26px]" style={{ background: tm.bg }}>{tm.emoji}</span>
              <div>
                <p className="text-[15px] font-black text-slate-800">{tm.label} <span className="text-[11.5px] font-bold" style={{ color: tm.color }}>{tm.axis}</span></p>
                <p className="text-[11.5px] text-slate-500">{tm.trait}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[10.5px] font-semibold text-slate-400 mb-1"><span>성김 (개방형)</span><span>촘촘 (밀집형)</span></div>
              <div className="relative h-2.5 rounded-full bg-gradient-to-r from-violet-200 via-slate-100 to-indigo-300">
                <div className="absolute -top-1 w-4 h-4 -translate-x-1/2 rounded-full bg-white border-2 border-indigo-500" style={{ left: `${r.density}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">섬유 밀도 {r.density} · 섬유 틈(열공·움) 눈당 {(r.openings / Math.max(1, Object.values(data.iris.detection ?? {}).filter(Boolean).length)).toFixed(1)}개{r.openings > 0 ? ` · 동공 가까이 ${Math.round(r.innerShare * 100)}%` : ''}</p>
            </div>
            <p className="mt-2 text-[12px] text-slate-600">🔍 {tm.fiber}</p>
            <p className="mt-1 text-[12.5px] text-slate-700 leading-relaxed">{tm.desc}</p>
          </>
        ) : <p className="mt-2 text-[12px] text-slate-400">홍채 스캔 후에 알 수 있어요.</p>}
      </div>

      {/* 5. 자율신경환 반응 + 색소 */}
      {r.hasIris && (
        <div className="glass-card p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">스트레스 반응 타입 — 자율신경환·동공</h3>
            {r.anw && (
              <div className="mt-2 rounded-xl bg-slate-50 px-3.5 py-3">
                <p className="text-[13px] font-bold text-slate-800">{ANW_META[r.anw].emoji} {ANW_META[r.anw].label}</p>
                <p className="text-[12px] text-slate-600 mt-0.5 leading-relaxed">{ANW_META[r.anw].desc}</p>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">감정 처리 방식 — 색소 반점 위치</h3>
            {r.pigments.length ? (
              <div className="mt-2 space-y-2">
                {r.pigments.map(p => (
                  <div key={p.zone} className="rounded-xl bg-amber-50/70 px-3.5 py-3">
                    <p className="text-[13px] font-bold text-slate-800">{PIGMENT_META[p.zone].emoji} {PIGMENT_META[p.zone].label} <span className="text-[11px] font-semibold text-slate-400">{p.count}곳</span></p>
                    <p className="text-[12px] text-slate-600 mt-0.5 leading-relaxed">{PIGMENT_META[p.zone].desc}</p>
                  </div>
                ))}
              </div>
            ) : <p className="mt-2 text-[12px] text-slate-400">뇌·위장·간 구역에서 눈에 띄는 색소 반점이 없어요.</p>}
          </div>
        </div>
      )}

      <TensionTrend sessions={sessions} />

      <p className="flex gap-1.5 text-[10.5px] text-slate-400 leading-relaxed">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
        홍채학적 해석과 EDA·HRV를 합친 웰니스용 참고 정보예요. 의학적·심리학적 진단이 아니며, 힘든 마음이 오래가면 전문가와 상담해 주세요.
      </p>
    </div>
  )
}
