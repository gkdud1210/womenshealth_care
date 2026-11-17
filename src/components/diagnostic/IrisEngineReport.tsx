'use client'

// 홍채 엔진 리포트 — LUDIA LAB / LUDIA HEALTH 판독 엔진이 두 눈에서 찾은 것을 한 장으로 정리해요

import { Cpu, Eye, AlertTriangle } from 'lucide-react'
import type { IrisEyeDetection, MultimodalData } from '@/components/calendar/LudiaInsightCard'
import { IrisDetectionCard } from './IrisDetectionCard'
import { analyzePsyche, TEMPERAMENTS, ANW_META } from '@/lib/iris-psyche'

const KIND_NOTE: Record<string, string> = {
  lac: '섬유가 벌어진 틈 — 그 구역 기능이 약해지기 쉬운 자리로 봐요',
  cry: '작고 깊은 움 — 섬유 틈의 한 종류예요',
  pig: '색소가 모인 자리 — 그 구역의 독소·감정 부담 신호로 봐요',
  rad: '동공에서 바깥으로 뻗은 골 — 장 독소·신경 피로 신호로 봐요',
}

function eyeList(d: MultimodalData): [string, IrisEyeDetection][] {
  const det = d.iris.detection
  if (!det) return []
  const out: [string, IrisEyeDetection][] = []
  if (det.right) out.push(['우안', det.right])
  if (det.left) out.push(['좌안', det.left])
  return out
}

export function IrisEngineReport({ data }: { data: MultimodalData }) {
  const eyes = eyeList(data)
  if (eyes.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <Eye className="w-8 h-8 text-violet-300 mx-auto" />
        <p className="mt-2 text-sm font-semibold text-slate-600">홍채 엔진 결과가 없어요</p>
        <p className="text-[12px] text-slate-400 mt-1">이 기록은 직접 입력했거나 홍채 분석 서버에 연결되지 않았을 때 만들어졌어요. 새 진단에서 홍채를 스캔해 주세요.</p>
      </div>
    )
  }
  const psyche = analyzePsyche(data)
  const model = eyes[0][1].model

  // 종류별 개수 (두 눈)
  const kinds = new Map<string, { label: string; color: string; byEye: Record<string, number> }>()
  for (const [name, e] of eyes) {
    for (const s of e.lesionSummary) {
      const k = kinds.get(s.key) ?? { label: s.label, color: s.color, byEye: {} }
      k.byEye[name] = (k.byEye[name] ?? 0) + s.count
      kinds.set(s.key, k)
    }
  }
  const maxCount = Math.max(1, ...Array.from(kinds.values()).flatMap(k => Object.values(k.byEye)))

  // 구역(장기)별 소견
  const zones = new Map<string, { count: number; kinds: Set<string>; eyes: Set<string> }>()
  for (const [name, e] of eyes) {
    for (const l of e.lesions) {
      const z = l.zoneName ?? l.organs?.[0]?.name
      if (!z) continue
      const v = zones.get(z) ?? { count: 0, kinds: new Set(), eyes: new Set() }
      v.count++; v.kinds.add(l.label.split(' (')[0]); v.eyes.add(name)
      zones.set(z, v)
    }
  }
  const zoneRows = Array.from(zones.entries()).sort((a, b) => b[1].count - a[1].count)
  const flags = eyes.flatMap(([name, e]) => (e.globalFindings ?? []).map(f => ({ ...f, eye: name })))

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-slate-700">엔진 정보</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
          <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10.5px] text-slate-400">판독 엔진</p><p className="font-bold text-slate-700">{model?.source ?? 'LUDIA'}</p></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10.5px] text-slate-400">학습</p><p className="font-bold text-slate-700">{model?.trainedOn ?? (model?.trainImages != null ? `사진 ${model.trainImages}장` : '—')}</p></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10.5px] text-slate-400">분석한 눈</p><p className="font-bold text-slate-700">{eyes.map(e => e[0]).join(' · ')}</p></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10.5px] text-slate-400">경계 찾기</p><p className="font-bold text-slate-700 truncate">{eyes[0][1].boundarySource ?? '—'}</p></div>
        </div>
        {model && !model.reliable && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> 엔진이 아직 학습 초기이거나 예시 데이터라 참고용이에요.
          </p>
        )}
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-700">소견 종류별 개수</h3>
        <p className="text-[11px] text-slate-400 mb-3">두 눈에서 찾은 병소 후보</p>
        {kinds.size === 0 ? <p className="text-[12px] text-slate-400">찾은 병소 후보가 없어요.</p> : (
          <div className="space-y-3">
            {Array.from(kinds.entries()).map(([key, k]) => (
              <div key={key}>
                <p className="text-[12.5px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: k.color }} />{k.label}
                </p>
                {eyes.map(([name]) => (
                  <div key={name} className="flex items-center gap-2 mt-1">
                    <span className="w-8 text-[10.5px] text-slate-400">{name}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full" style={{ width: `${(k.byEye[name] ?? 0) / maxCount * 100}%`, background: '#8b5cf6' }} />
                    </div>
                    <span className="w-5 text-right text-[11.5px] font-bold text-slate-700">{k.byEye[name] ?? 0}</span>
                  </div>
                ))}
                {KIND_NOTE[key] && <p className="text-[10.5px] text-slate-400 mt-0.5">{KIND_NOTE[key]}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {zoneRows.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">구역(장기 지도)별 소견</h3>
          <div className="divide-y divide-slate-100">
            {zoneRows.map(([z, v]) => (
              <div key={z} className="flex items-center gap-2 py-2">
                <span className="text-[12.5px] font-bold text-slate-700 w-20 truncate">{z}</span>
                <span className="flex-1 text-[11.5px] text-slate-500 truncate">{Array.from(v.kinds).join(' · ')}</span>
                <span className="text-[10.5px] text-slate-400">{Array.from(v.eyes).join('·')}</span>
                <span className="text-[12px] font-black text-slate-800 w-6 text-right">{v.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">섬유·자율신경 지표</h3>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-xl bg-indigo-50/60 px-3 py-2">
            <p className="text-[10.5px] text-slate-400">섬유 밀도 → 기질</p>
            <p className="font-bold text-slate-800">{psyche.density ?? '—'} · {psyche.temperament ? `${TEMPERAMENTS[psyche.temperament].emoji} ${TEMPERAMENTS[psyche.temperament].label}` : '—'}</p>
          </div>
          <div className="rounded-xl bg-indigo-50/60 px-3 py-2">
            <p className="text-[10.5px] text-slate-400">동공 ÷ 홍채</p>
            <p className="font-bold text-slate-800">{psyche.pupilRatio != null ? `${Math.round(psyche.pupilRatio * 100)}%` : '—'}</p>
          </div>
          <div className="rounded-xl bg-indigo-50/60 px-3 py-2 col-span-2">
            <p className="text-[10.5px] text-slate-400">스트레스 반응 타입</p>
            <p className="font-bold text-slate-800">{psyche.anw ? `${ANW_META[psyche.anw].emoji} ${ANW_META[psyche.anw].label}` : '—'}</p>
          </div>
        </div>
        {flags.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[11.5px] font-bold text-slate-500">홍채 전체 소견</p>
            {flags.map((f, i) => (
              <p key={i} className="text-[12px] text-slate-700"><b>{f.label}</b> <span className="text-slate-400">({f.eye})</span>{f.note ? ` — ${f.note}` : ''}</p>
            ))}
          </div>
        )}
      </div>

      {/* 사진 위 병소 표시 · 동공 소견 (기존 검출 카드) */}
      <IrisDetectionCard iris={data.iris} />
    </div>
  )
}
