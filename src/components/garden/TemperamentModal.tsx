'use client'

import { useEffect, useState } from 'react'
import { TEMPERAMENTS, ORGANS } from '@/lib/tkm-scoring'
import type { GardenResult, OrganKey } from '@/lib/tkm-scoring'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const VEGGIE_FILE: Record<OrganKey, string> = {
  heart:  'heart-beet',
  liver:  'liver-broccoli',
  spleen: 'spleen-pumpkin',
  lung:   'lung-onion',
  kidney: 'kidney-blackbean',
}

interface Props {
  result: GardenResult
  onClose: () => void
}

export function TemperamentModal({ result, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const primary = result.primary
  const temp    = TEMPERAMENTS[primary]
  const organ   = ORGANS[primary]
  const secondary = result.secondary

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const bgMid   = `${temp.color}20`
  const border  = `${temp.color}28`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center transition-all duration-300"
      style={{
        background: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(6px)' : 'none',
      }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-t-[2rem] overflow-hidden transition-transform duration-300"
        style={{
          background: 'linear-gradient(180deg,#fafffe 0%,#f8f6ff 100%)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 z-10" style={{ background: 'inherit' }}>
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* ── Hero header ── */}
        <div className="px-5 pt-2 pb-5 text-center"
          style={{ background: `linear-gradient(160deg, ${temp.color}14, ${temp.color}06)` }}>
          <div className="relative inline-block mb-3">
            <div className="w-24 h-24 rounded-3xl overflow-hidden mx-auto"
              style={{ background: bgMid, border: `2px solid ${border}` }}>
              <img
                src={`${BASE}/garden/${VEGGIE_FILE[primary]}.png`}
                alt={organ.vegetable}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ background: temp.color, boxShadow: `0 2px 8px ${temp.color}66` }}>
              {temp.emoji}
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: temp.color }}>
            나의 장부학 기질 진단 결과
          </p>
          <h2 className="text-xl font-black text-slate-800 mb-1">{temp.title}</h2>
          <p className="text-[11px] text-slate-500 mb-3">{temp.subtitle}</p>
          <div className="flex justify-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold text-white"
              style={{ background: temp.color }}>
              주기질 · {organ.name}({organ.vegetable})
            </span>
            {secondary && (
              <span className="px-3 py-1 rounded-full text-[10px] font-bold"
                style={{ background: bgMid, color: temp.color, border: `1px solid ${border}` }}>
                부기질 · {ORGANS[secondary].name}
              </span>
            )}
          </div>
        </div>

        <div className="px-5 pb-8 space-y-4 mt-1">

          {/* ── 본성 ── */}
          <Section color={temp.color} icon="✨" title="나의 본성">
            <p className="text-sm text-slate-700 leading-relaxed">{temp.nature}</p>
          </Section>

          {/* ── 기질 특성 ── */}
          <Section color={temp.color} icon="🌟" title="기질 특성">
            <div className="grid grid-cols-2 gap-2">
              {temp.traits.map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: temp.color }} />
                  <span className="text-xs text-slate-700">{t}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── 강한 부분 vs 취약한 부분 ── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl p-3.5" style={{ background: 'rgba(240,253,244,0.9)', border: '1px solid rgba(22,163,74,0.2)' }}>
              <p className="text-[10px] font-bold text-emerald-600 mb-2">💪 강한 부분</p>
              <div className="space-y-1.5">
                {temp.strongPoints.map(s => (
                  <div key={s} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 text-[10px] flex-none mt-0.5">✓</span>
                    <span className="text-[11px] text-slate-700 leading-tight">{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-3.5" style={{ background: 'rgba(254,242,242,0.9)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-[10px] font-bold text-red-500 mb-2">⚠️ 취약한 장부</p>
              <div className="space-y-1.5">
                {temp.weakOrgans.map(w => (
                  <div key={w} className="flex items-start gap-1.5">
                    <span className="text-red-400 text-[10px] flex-none mt-0.5">!</span>
                    <span className="text-[11px] text-slate-700 leading-tight">{w}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 피해야 할 음식 ── */}
          <Section color="#dc2626" bg="rgba(254,242,242,0.8)" borderColor="rgba(239,68,68,0.18)" icon="🚫" title="피해야 할 음식">
            <div className="space-y-2">
              {temp.badFoods.map(f => (
                <div key={f} className="flex items-center gap-2">
                  <span className="text-red-400 text-xs flex-none">✕</span>
                  <span className="text-xs text-slate-700">{f}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── 피해야 할 습관 ── */}
          <Section color="#d97706" bg="rgba(255,251,235,0.9)" borderColor="rgba(245,158,11,0.2)" icon="⛔" title="피해야 할 습관">
            <div className="space-y-2">
              {temp.badHabits.map(h => (
                <div key={h} className="flex items-center gap-2">
                  <span className="text-amber-500 text-xs flex-none">✕</span>
                  <span className="text-xs text-slate-700">{h}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── 나를 위한 생활 습관 ── */}
          <Section color="#16a34a" bg="rgba(240,253,244,0.9)" borderColor="rgba(22,163,74,0.18)" icon="🌱" title="나를 위한 좋은 습관">
            <div className="space-y-2">
              {temp.harmony.map(h => (
                <div key={h} className="flex items-center gap-2">
                  <span className="text-emerald-500 text-xs flex-none">✓</span>
                  <span className="text-xs text-slate-700">{h}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── 권장 식품 ── */}
          <Section color={temp.color} icon="🥗" title="내 기질에 맞는 식품">
            <div className="flex flex-wrap gap-1.5">
              {temp.foods.map(f => (
                <span key={f} className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: bgMid, color: temp.color, border: `1px solid ${border}` }}>
                  {f}
                </span>
              ))}
            </div>
          </Section>

          {/* ── 오장 점수 ── */}
          <div className="rounded-2xl p-4" style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(226,232,240,0.8)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-3 text-slate-400">📊 오장 진단 점수</p>
            <div className="space-y-2">
              {(['heart','liver','spleen','lung','kidney'] as OrganKey[]).map(o => {
                const sc  = result.scores[o]
                const col = TEMPERAMENTS[o].color
                const pct = ((sc.raw - 2) / 8) * 100
                return (
                  <div key={o} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-10 flex-none text-right">{ORGANS[o].name}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(200,200,220,0.3)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: col }} />
                    </div>
                    <span className="text-[10px] font-bold w-8 flex-none"
                      style={{ color: o === primary ? col : '#94a3b8' }}>
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

          {/* ── CTA ── */}
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

/* ── 공통 섹션 래퍼 ── */
function Section({
  icon, title, color, bg, borderColor, children,
}: {
  icon: string
  title: string
  color?: string
  bg?: string
  borderColor?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl p-4"
      style={{
        background: bg ?? 'rgba(248,250,252,0.9)',
        border: `1px solid ${borderColor ?? 'rgba(226,232,240,0.8)'}`,
      }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5"
        style={{ color: color ?? '#64748b' }}>
        {icon} {title}
      </p>
      {children}
    </div>
  )
}
