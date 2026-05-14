'use client'

import { useEffect, useState } from 'react'
import { TEMPERAMENTS, ORGANS } from '@/lib/tkm-scoring'
import type { GardenResult, OrganKey } from '@/lib/tkm-scoring'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

interface Props {
  result: GardenResult
  onClose: () => void
}

export function TemperamentModal({ result, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const primary = result.primary
  const temp = TEMPERAMENTS[primary]
  const organ = ORGANS[primary]

  // secondary organ (tied within 1 pt)
  const secondary = result.secondary

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const bgLight = `${temp.color}12`
  const bgMid   = `${temp.color}22`
  const border  = `${temp.color}30`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center transition-all duration-300"
      style={{
        background: visible ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(4px)' : 'none',
      }}
      onClick={handleClose}
    >
      {/* Sheet */}
      <div
        className="w-full max-w-lg rounded-t-[2rem] overflow-hidden transition-transform duration-300"
        style={{
          background: 'linear-gradient(180deg, #fafffe 0%, #f5f3ff 100%)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 text-center"
          style={{ background: `linear-gradient(135deg, ${temp.color}18, ${temp.color}08)` }}>
          {/* Vegetable image */}
          <div className="relative inline-block mb-3">
            <div className="w-24 h-24 rounded-3xl overflow-hidden mx-auto"
              style={{ background: bgMid, border: `2px solid ${border}` }}>
              <img
                src={`${BASE}/garden/${
                  primary === 'heart'  ? 'heart-beet' :
                  primary === 'liver'  ? 'liver-broccoli' :
                  primary === 'spleen' ? 'spleen-pumpkin' :
                  primary === 'lung'   ? 'lung-onion' :
                  'kidney-blackbean'
                }.png`}
                alt={organ.vegetable}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ background: temp.color }}>
              {temp.emoji}
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest mb-1"
            style={{ color: temp.color }}>
            나의 장부학 기질
          </p>
          <h2 className="text-xl font-black text-slate-800 mb-1">{temp.title}</h2>
          <p className="text-[11px] text-slate-500">{temp.subtitle}</p>

          {/* Score badges */}
          <div className="flex justify-center gap-2 mt-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold text-white"
              style={{ background: temp.color }}>
              {organ.name}({organ.vegetable}) · {organ.element}
            </span>
            {secondary && (
              <span className="px-3 py-1 rounded-full text-[10px] font-bold"
                style={{ background: bgMid, color: temp.color, border: `1px solid ${border}` }}>
                부기질: {ORGANS[secondary].name}
              </span>
            )}
          </div>
        </div>

        <div className="px-5 pb-6 space-y-4 mt-2">

          {/* 본성 */}
          <div className="rounded-2xl p-4" style={{ background: bgLight, border: `1px solid ${border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: temp.color }}>
              ✨ 나의 본성
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{temp.nature}</p>
          </div>

          {/* 기질 특성 */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(226,232,240,0.8)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5 text-slate-400">
              🌟 기질 특성
            </p>
            <div className="grid grid-cols-2 gap-2">
              {temp.traits.map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: temp.color }} />
                  <span className="text-xs text-slate-700">{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 취약점 */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(254,249,195,0.6)', border: '1px solid rgba(234,179,8,0.2)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-amber-600">
              ⚠️ 주의 신호
            </p>
            <p className="text-xs text-slate-700 leading-relaxed">{temp.weakness}</p>
          </div>

          {/* 조화 */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(240,253,244,0.9)', border: '1px solid rgba(22,163,74,0.18)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5 text-emerald-600">
              🌱 나를 위한 생활 습관
            </p>
            <div className="space-y-1.5">
              {temp.harmony.map(h => (
                <div key={h} className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5 flex-none text-xs">✓</span>
                  <span className="text-xs text-slate-700">{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 권장 식품 */}
          <div className="rounded-2xl p-4" style={{ background: bgLight, border: `1px solid ${border}` }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: temp.color }}>
              🥗 내 기질에 맞는 식품
            </p>
            <div className="flex flex-wrap gap-1.5">
              {temp.foods.map(f => (
                <span key={f} className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: bgMid, color: temp.color, border: `1px solid ${border}` }}>
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* 오장 점수 요약 */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(226,232,240,0.8)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5 text-slate-400">
              📊 오장 진단 결과
            </p>
            <div className="space-y-2">
              {(['heart','liver','spleen','lung','kidney'] as OrganKey[]).map(o => {
                const sc = result.scores[o]
                const isPrimary = o === primary
                const barPct = ((sc.raw - 2) / 8) * 100
                const col = TEMPERAMENTS[o].color
                return (
                  <div key={o} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-10 flex-none text-right">{ORGANS[o].name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(200,200,220,0.3)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${barPct}%`, background: col }} />
                    </div>
                    <span className="text-[10px] font-bold w-8 flex-none" style={{ color: isPrimary ? col : '#94a3b8' }}>
                      {sc.raw}/10
                    </span>
                    <span className="text-[10px]">
                      {sc.state === 'glowing' ? '✨' : sc.state === 'wilting' ? '🥺' : '🌿'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleClose}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${temp.color}, ${temp.color}bb)`,
              boxShadow: `0 6px 24px ${temp.color}44`,
            }}
          >
            내 치유 정원 보기 🌱
          </button>
        </div>
      </div>
    </div>
  )
}
