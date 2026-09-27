'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { IrisEyeDetection, IrisLesion } from '@/components/calendar/LudiaInsightCard'

// 홍채 병소 보기 — 스캔 화면과 리포트가 함께 쓴다.
// 병소 유형 칩을 누르면 그 유형만, 목록의 병소를 누르면 그 병소만 사진 위에 표시 (다시 누르면 전체)
export type LesionSelection = { type: 'key'; key: string } | { type: 'id'; id: number } | null

export function lesionMatches(sel: LesionSelection, l: IrisLesion) {
  return !sel || (sel.type === 'key' ? l.key === sel.key : l.id === sel.id)
}

// resetKey가 바뀌면(예: 다른 눈으로 전환) 선택을 풀어준다
export function useLesionSelection(resetKey?: unknown) {
  const [sel, setSel] = useState<LesionSelection>(null)
  useEffect(() => { setSel(null) }, [resetKey])
  const toggle = (next: LesionSelection) =>
    setSel(cur => (JSON.stringify(cur) === JSON.stringify(next) ? null : next))
  return { sel, toggle, clear: () => setSel(null) }
}

export function canSelectLesions(d: Pick<IrisEyeDetection, 'baseImg' | 'imageSize'>) {
  return !!(d.baseImg && d.imageSize)
}

// 원본 사진 좌표로 병소를 그리는 SVG — 같은 상자 안의 object-contain 이미지와 정확히 겹친다
export function LesionOverlay({ d, sel }: { d: Pick<IrisEyeDetection, 'imageSize' | 'lesions' | 'lesionSummary'>; sel: LesionSelection }) {
  const { w, h } = d.imageSize!
  const colorOf = Object.fromEntries(d.lesionSummary.map(c => [c.key, c.color]))
  const font = Math.max(w, h) / 32
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 w-full h-full pointer-events-none">
      {d.lesions.filter(l => l.points?.length && lesionMatches(sel, l)).map(l => {
        const pts = l.points!.map(p => p.join(',')).join(' ')
        const col = colorOf[l.key] ?? '#ff5050'
        const [tx, ty] = l.labelAt ?? [
          l.points!.reduce((a, p) => a + p[0], 0) / l.points!.length,
          l.points!.reduce((a, p) => a + p[1], 0) / l.points!.length,
        ]
        return (
          <g key={l.id}>
            {l.shape === 'polyline'
              ? <polyline points={pts} fill="none" stroke={col} strokeWidth={3} vectorEffect="non-scaling-stroke" />
              : <polygon points={pts} fill={col} fillOpacity={0.3} stroke={col} strokeWidth={2} vectorEffect="non-scaling-stroke" />}
            <text x={tx} y={ty} fontSize={font} fill="#fff" stroke="#000" strokeWidth={font / 6} paintOrder="stroke"
              textAnchor="middle" dominantBaseline="central" fontWeight={700}>{l.id}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function LesionResetButton({ d, sel, onClear }: { d: Pick<IrisEyeDetection, 'lesions'>; sel: LesionSelection; onClear: () => void }) {
  if (!sel) return null
  return (
    <button onClick={onClear}
      className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-[10px]">
      {d.lesions.filter(l => lesionMatches(sel, l)).length}개 표시 중 · 전체 보기
    </button>
  )
}

export function LesionChips({ d, sel, onToggle, interactive }: {
  d: Pick<IrisEyeDetection, 'lesionSummary'>; sel: LesionSelection; onToggle: (s: LesionSelection) => void; interactive: boolean
}) {
  if (!d.lesionSummary.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {d.lesionSummary.map(c => {
        const on = sel?.type === 'key' && sel.key === c.key
        return (
          <button key={c.key} disabled={!interactive} onClick={() => onToggle({ type: 'key', key: c.key })}
            className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-colors',
              on ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200',
              interactive && !on && 'hover:border-slate-400')}>
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: c.color }} />
            {c.label} {c.count}
          </button>
        )
      })}
    </div>
  )
}

export function LesionList({ d, sel, onToggle, interactive }: {
  d: Pick<IrisEyeDetection, 'lesions' | 'excluded'>; sel: LesionSelection; onToggle: (s: LesionSelection) => void; interactive: boolean
}) {
  const ex = d.excluded
  const exTotal = ex ? ex.pupil + ex.eyelid + ex.outside : 0
  return (
    <>
      {d.lesions.length === 0
        ? <p className="text-xs text-slate-500">학습된 병소 유형이 감지되지 않았습니다.</p>
        : (
          <div className="space-y-1">
            {d.lesions.map(l => {
              const on = sel?.type === 'id' && sel.id === l.id
              return (
                <button key={l.id} disabled={!interactive} onClick={() => onToggle({ type: 'id', id: l.id })}
                  className={cn('w-full flex items-start gap-2 text-xs text-left rounded-lg px-1.5 py-1 transition-colors',
                    on ? 'bg-purple-50 ring-1 ring-purple-300' : interactive && 'hover:bg-slate-50',
                    !lesionMatches(sel, l) && 'opacity-40')}>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] flex items-center justify-center">{l.id}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-slate-700">
                      {l.label} <span className="font-normal text-slate-400">신뢰도 {Math.round(l.confidence * 100)}%</span>
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {l.position && `${l.position.clock}시 방향 · `}
                      {l.organs.length ? l.organs.map(o => `${o.name} ${o.pct}%`).join(' · ') : '장기 구역 미지정'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      {exTotal > 0 && (
        <p className="text-[10px] text-slate-400">
          홍채가 아닌 곳의 검출 {exTotal}개 제외 (동공 {ex!.pupil} · 눈꺼풀 {ex!.eyelid} · 홍채 밖 {ex!.outside})
        </p>
      )}
    </>
  )
}
