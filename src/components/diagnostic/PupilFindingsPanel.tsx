'use client'

import { cn } from '@/lib/utils'
import type { FindingLevel, PupilFindings } from '@/components/calendar/LudiaInsightCard'

// LUDIA LAB 동공 소견 — 동공 오른쪽(사진 기준, 두 눈 모두)이 척추: 12시 경추 · 3시 흉추 · 6시 요추.
// 구간마다 안쪽으로 납작/바깥으로 불룩한지 + 동공 바로 바깥 회색 이중 테(위 고리). 후보 표시이며 진단이 아니다.

const SEG_DEG: Record<string, [number, number]> = { cervical: [0, 45], thoracic: [45, 135], lumbar: [135, 180] }
const COLOR: Record<FindingLevel, string> = { strong: '#ef4444', candidate: '#f59e0b', none: '#cbd5e1', unseen: '#e2e8f0' }
const BADGE: Record<FindingLevel, string> = {
  strong: 'bg-red-50 text-red-600 border-red-200',
  candidate: 'bg-amber-50 text-amber-700 border-amber-200',
  none: 'bg-slate-50 text-slate-500 border-slate-200',
  unseen: 'bg-slate-50 text-slate-400 border-slate-200',
}

// 12시 = 0°, 시계 방향
const pt = (deg: number, r: number, c = 50) => {
  const a = (deg * Math.PI) / 180
  return [c + r * Math.sin(a), c - r * Math.cos(a)]
}
const arc = (d0: number, d1: number, r: number) => {
  const [x0, y0] = pt(d0, r), [x1, y1] = pt(d1, r)
  return `M ${x0} ${y0} A ${r} ${r} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${x1} ${y1}`
}

function SpineDiagram({ segs }: { segs: NonNullable<PupilFindings['spine']>['segments'] }) {
  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20 flex-shrink-0" aria-hidden>
      <circle cx={50} cy={50} r={44} fill="#f5f3ff" stroke="#ddd6fe" />
      <circle cx={50} cy={50} r={26} fill="#1e1b4b" />
      {segs.map(s => {
        const [d0, d1] = SEG_DEG[s.key]
        return (
          <g key={s.key}>
            <path d={arc(d0 + 2, d1 - 2, 31)} fill="none" stroke={COLOR[s.level]} strokeWidth={5}
              strokeDasharray={s.level === 'unseen' ? '3 3' : undefined} strokeLinecap="round" />
            {s.atDeg != null && s.level !== 'none' && s.level !== 'unseen' && (() => {
              const [x0, y0] = pt(s.atDeg, 22), [x1, y1] = pt(s.atDeg, 36)
              return <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={s.kind === 'flat' ? '#38bdf8' : '#a78bfa'} strokeWidth={3} />
            })()}
          </g>
        )
      })}
      {[['경', 22], ['흉', 90], ['요', 158]].map(([t, d]) => {
        const [x, y] = pt(d as number, 41)
        return <text key={t} x={x} y={y} fontSize={8} textAnchor="middle" dominantBaseline="central" fill="#64748b">{t}</text>
      })}
    </svg>
  )
}

export function PupilFindingsPanel({ pf, className }: { pf?: PupilFindings | null; className?: string }) {
  if (!pf) return null
  return (
    <div className={cn('rounded-xl p-3 space-y-2', className)} style={{ background: 'rgba(248,244,246,.8)', border: '1px solid rgba(168,85,247,.15)' }}>
      <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">동공 소견 · 척추 · 위 고리</p>
      {!pf.ok ? (
        <p className="text-xs text-slate-500">동공 경계를 충분히 찾지 못해 소견을 보지 못했습니다{pf.reason ? ` — ${pf.reason}` : ''}.</p>
      ) : (
        <>
          {pf.spine && (
            <div className="flex gap-3 items-start">
              <SpineDiagram segs={pf.spine.segments} />
              <div className="flex-1 min-w-0 space-y-1">
                {pf.spine.segments.map(s => (
                  <div key={s.key} className="flex items-center gap-1.5 text-xs">
                    <span className="w-8 font-semibold text-slate-700">{s.name}</span>
                    <span className={cn('px-1.5 py-0.5 rounded-full border text-[10px]', BADGE[s.level])}>{s.levelLabel}</span>
                    {s.level !== 'unseen' && s.level !== 'none' && (
                      <span className="text-[11px] text-slate-500 truncate">
                        {(s.at ?? '').split('(')[0]} {s.kindLabel}{s.amount != null && ` ${s.amount}%`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {pf.spine && <p className="text-xs text-slate-600 leading-relaxed">{pf.spine.text}</p>}
          {pf.gastricRing && (
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className={cn('mr-1 px-1.5 py-0.5 rounded-full border text-[10px]', BADGE[pf.gastricRing.level])}>위 고리 {pf.gastricRing.levelLabel}</span>
              {pf.gastricRing.text}
            </p>
          )}
          {pf.note && <p className="text-[10px] text-slate-400">* {pf.note}</p>}
        </>
      )}
    </div>
  )
}
