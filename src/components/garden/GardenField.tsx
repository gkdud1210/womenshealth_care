'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { useGarden } from '@/contexts/GardenContext'
import { ORGANS, TEMPERAMENTS } from '@/lib/tkm-scoring'
import { GROWTH_CONFIG, SOIL_STYLE } from '@/lib/bio-digital-twin'
import type { OrganKey } from '@/lib/tkm-scoring'
import type { GrowthStage, AnimationMode } from '@/lib/bio-digital-twin'

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

const CHAR_IMAGES: Record<OrganKey, string> = {
  heart:  `${BASE}/garden/heart-beet.png`,
  liver:  `${BASE}/garden/liver-broccoli.png`,
  spleen: `${BASE}/garden/spleen-pumpkin.png`,
  lung:   `${BASE}/garden/lung-onion.png`,
  kidney: `${BASE}/garden/kidney-blackbean.png`,
}

const ORGAN_GLOW: Record<OrganKey, string> = {
  heart:  'rgba(244,63,117,0.55)',
  liver:  'rgba(34,197,94,0.55)',
  spleen: 'rgba(251,146,60,0.55)',
  lung:   'rgba(167,139,250,0.55)',
  kidney: 'rgba(99,102,241,0.55)',
}
const ORGAN_ACCENT: Record<OrganKey, string> = {
  heart:  '#C41A4A',
  liver:  '#1A7A3A',
  spleen: '#A16207',
  lung:   '#7C3AED',
  kidney: '#3730A3',
}

function animClass(mode: AnimationMode): string {
  switch (mode) {
    case 'bloom':     return 'bio-bloom'
    case 'sluggish':  return 'bio-sluggish'
    case 'vibrate':   return 'bio-vibrate'
    case 'sensitive': return 'bio-sensitive'
    default:          return 'bio-float'
  }
}

/* ── HRV glow ring intensity ──────────────────────────────────── */
function glowStyle(organ: OrganKey, vitalityScore: number, mode: AnimationMode) {
  const intensity = vitalityScore / 100
  const color = ORGAN_GLOW[organ]
  if (mode === 'bloom') {
    return `0 0 ${Math.round(24 * intensity)}px ${color}, 0 0 ${Math.round(48 * intensity)}px ${color}`
  }
  if (mode === 'sluggish') return 'none'
  return `0 0 ${Math.round(12 * intensity)}px ${color}`
}

/* ── CSS filter for animation mode + growth ──────────────────── */
function charFilter(brightness: number, mode: AnimationMode, alertLevel: string): string {
  const b = `brightness(${brightness.toFixed(2)})`
  const s = mode === 'sluggish'  ? 'saturate(0.6)' : ''
  const e = alertLevel === 'high' ? 'hue-rotate(10deg) saturate(1.3)' : ''
  const sv = mode === 'sensitive' ? 'contrast(0.9) saturate(0.85)' : ''
  return [b, s, e, sv].filter(Boolean).join(' ')
}

/* ── Individual character plot ────────────────────────────────── */
function CharacterPlot({
  organ,
  isSelected,
  onClick,
  mini = false,
}: {
  organ: OrganKey
  isSelected: boolean
  onClick: () => void
  mini?: boolean
}) {
  const { result } = useGarden()
  const state      = result.organStates[organ]
  const gc         = GROWTH_CONFIG[state.growthStage as GrowthStage]
  const soilStyle  = SOIL_STYLE[state.soilQuality]
  const info       = ORGANS[organ]
  const accent     = ORGAN_ACCENT[organ]

  const imgSize   = mini ? 96 : 200
  const cardH     = mini ? 120 : 260

  return (
    <button
      onClick={onClick}
      className="relative flex-none overflow-hidden rounded-3xl transition-all duration-300 active:scale-95"
      style={{
        width:  mini ? 96 : '100%',
        height: cardH,
        border: isSelected
          ? `2.5px solid ${accent}`
          : '2px solid rgba(255,255,255,0.4)',
        boxShadow: isSelected
          ? `0 8px 32px ${ORGAN_GLOW[organ]}, ${glowStyle(organ, state.vitalityScore, state.animationMode)}`
          : '0 4px 16px rgba(0,0,0,0.12)',
        background: 'transparent',
      }}
    >
      {/* Sky gradient */}
      <div className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg,#87CEEB 0%,#c8e8c0 52%,#a8d498 58%)',
        }}
      />

      {/* Character */}
      <div
        className={`absolute inset-0 flex items-end justify-center pb-6 ${animClass(state.animationMode)}`}
        style={{
          filter: charFilter(gc.brightness, state.animationMode, state.alertLevel),
          transform: `scale(${gc.scale})`,
          transformOrigin: 'center bottom',
          boxShadow: glowStyle(organ, state.vitalityScore, state.animationMode),
        }}
      >
        <Image
          src={CHAR_IMAGES[organ]}
          alt={info.vegetable}
          width={imgSize}
          height={Math.round(imgSize * 0.67)}
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>

      {/* Soil overlay (retreats as growth increases) */}
      {gc.soilOverlay > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: `${gc.soilOverlay * 100}%`,
            background: `linear-gradient(180deg, transparent 0%, ${soilStyle.color}CC 40%, ${soilStyle.color} 100%)`,
          }}
        />
      )}

      {/* Bottom soil strip */}
      <div className="absolute bottom-0 left-0 right-0 h-6 rounded-b-3xl"
        style={{ background: soilStyle.color }} />

      {/* Growth stage badge */}
      <div
        className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold"
        style={{ background: `${accent}CC`, color: 'white' }}
      >
        {gc.emoji} {gc.label}
      </div>

      {/* Score badge */}
      {!mini && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/80 text-slate-700">
          {Math.round(state.comprehensiveScore)}점
        </div>
      )}

      {/* Character name (non-mini) */}
      {!mini && (
        <div className="absolute bottom-7 left-0 right-0 text-center">
          <span className="text-[10px] font-bold text-white drop-shadow-sm">{info.vegetable}</span>
        </div>
      )}
    </button>
  )
}

/* ── HRV glow aura overlay ────────────────────────────────────── */
function VitalityAura({ organ }: { organ: OrganKey }) {
  const { result } = useGarden()
  const { vitalityScore, animationMode } = result.organStates[organ]
  if (animationMode !== 'bloom' && vitalityScore < 60) return null
  const color = ORGAN_GLOW[organ]
  return (
    <div className="absolute inset-0 rounded-3xl pointer-events-none bio-pulse"
      style={{
        background: `radial-gradient(ellipse at center 65%, ${color}44 0%, transparent 70%)`,
      }}
    />
  )
}

/* ── Stress particles (high EDA) ──────────────────────────────── */
function StressParticles() {
  const { result } = useGarden()
  if (result.alertLevel !== 'high') return null
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bio-particle"
          style={{
            background: '#f59e0b',
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 20}%`,
            animationDelay: `${i * 0.25}s`,
          }}
        />
      ))}
    </div>
  )
}

/* ── Temperament info bottom sheet ───────────────────────────── */
function CharacterInfoSheet({ organ, onClose }: { organ: OrganKey; onClose: () => void }) {
  const [visible, setVisible] = useState(false)
  const temp   = TEMPERAMENTS[organ]
  const info   = ORGANS[organ]
  const accent = ORGAN_ACCENT[organ]
  const bg     = `${ORGAN_BASE_BG[organ]}`

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center transition-all duration-300"
      style={{ background: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)', backdropFilter: visible ? 'blur(6px)' : 'none' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-t-[2rem] overflow-hidden transition-transform duration-300"
        style={{
          background: 'linear-gradient(180deg,#fafffe 0%,#f8f6ff 100%)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sticky top-0 z-10" style={{ background: 'inherit' }}>
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Hero */}
        <div className="px-5 pt-2 pb-5 text-center"
          style={{ background: `linear-gradient(160deg, ${accent}14, ${accent}06)` }}>
          <div className="relative inline-block mb-3">
            <div className="w-24 h-24 rounded-3xl overflow-hidden mx-auto"
              style={{ background: bg, border: `2px solid ${accent}28` }}>
              <img
                src={`${BASE}/garden/${VEGGIE_FILE_MAP[organ]}.png`}
                alt={info.vegetable}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ background: accent, boxShadow: `0 2px 8px ${accent}66` }}>
              {temp.emoji}
            </div>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>
            {info.name} · {info.element} 기질
          </p>
          <h2 className="text-xl font-black text-slate-800 mb-1">{temp.title}</h2>
          <p className="text-[11px] text-slate-500">{temp.subtitle}</p>
        </div>

        <div className="px-5 pb-8 space-y-4 mt-1">
          <InfoSection color={accent} icon="✨" title="나의 본성">
            <p className="text-sm text-slate-700 leading-relaxed">{temp.nature}</p>
          </InfoSection>

          <InfoSection color={accent} icon="🌟" title="기질 특성">
            <div className="grid grid-cols-2 gap-2">
              {temp.traits.map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full flex-none" style={{ background: accent }} />
                  <span className="text-xs text-slate-700">{t}</span>
                </div>
              ))}
            </div>
          </InfoSection>

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

          <InfoSection color="#dc2626" bg="rgba(254,242,242,0.8)" borderColor="rgba(239,68,68,0.18)" icon="🚫" title="피해야 할 음식">
            <div className="space-y-1.5">
              {temp.badFoods.map(f => (
                <div key={f} className="flex items-center gap-2">
                  <span className="text-red-400 text-xs flex-none">✕</span>
                  <span className="text-xs text-slate-700">{f}</span>
                </div>
              ))}
            </div>
          </InfoSection>

          <InfoSection color="#d97706" bg="rgba(255,251,235,0.9)" borderColor="rgba(245,158,11,0.2)" icon="⛔" title="피해야 할 습관">
            <div className="space-y-1.5">
              {temp.badHabits.map(h => (
                <div key={h} className="flex items-center gap-2">
                  <span className="text-amber-500 text-xs flex-none">✕</span>
                  <span className="text-xs text-slate-700">{h}</span>
                </div>
              ))}
            </div>
          </InfoSection>

          <InfoSection color="#16a34a" bg="rgba(240,253,244,0.9)" borderColor="rgba(22,163,74,0.18)" icon="🌱" title="나를 위한 좋은 습관">
            <div className="space-y-1.5">
              {temp.harmony.map(h => (
                <div key={h} className="flex items-center gap-2">
                  <span className="text-emerald-500 text-xs flex-none">✓</span>
                  <span className="text-xs text-slate-700">{h}</span>
                </div>
              ))}
            </div>
          </InfoSection>

          <InfoSection color={accent} icon="🥗" title="내 기질에 맞는 식품">
            <div className="flex flex-wrap gap-1.5">
              {temp.foods.map(f => (
                <span key={f} className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}28` }}>
                  {f}
                </span>
              ))}
            </div>
          </InfoSection>

          <button
            onClick={handleClose}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: accent, boxShadow: `0 6px 24px ${accent}44` }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Info section helper ──────────────────────────────────────── */
function InfoSection({
  icon, title, color, bg, borderColor, children,
}: {
  icon: string; title: string; color?: string; bg?: string; borderColor?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl p-4"
      style={{ background: bg ?? 'rgba(248,250,252,0.9)', border: `1px solid ${borderColor ?? 'rgba(226,232,240,0.8)'}` }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: color ?? '#64748b' }}>
        {icon} {title}
      </p>
      {children}
    </div>
  )
}

const VEGGIE_FILE_MAP: Record<OrganKey, string> = {
  heart:  'heart-beet',
  liver:  'liver-broccoli',
  spleen: 'spleen-pumpkin',
  lung:   'lung-onion',
  kidney: 'kidney-blackbean',
}

const ORGAN_BASE_BG: Record<OrganKey, string> = {
  heart:  'rgba(244,63,117,0.12)',
  liver:  'rgba(34,197,94,0.12)',
  spleen: 'rgba(251,146,60,0.12)',
  lung:   'rgba(167,139,250,0.12)',
  kidney: 'rgba(99,102,241,0.12)',
}

/* ── Main GardenField ─────────────────────────────────────────── */
export function GardenField({ primaryOrgan }: { primaryOrgan: OrganKey }) {
  const [selected, setSelected] = useState<OrganKey>(primaryOrgan)
  const [showInfoSheet, setShowInfoSheet] = useState(false)
  const { result, inputs } = useGarden()
  const state   = result.organStates[selected]
  const gc      = GROWTH_CONFIG[state.growthStage as GrowthStage]
  const soil    = SOIL_STYLE[state.soilQuality]
  const info    = ORGANS[selected]
  const accent  = ORGAN_ACCENT[selected]
  const organs: OrganKey[] = ['heart', 'liver', 'spleen', 'lung', 'kidney']

  const temp = TEMPERAMENTS[selected]

  return (
    <div className="space-y-3">

      {/* ── Temperament info banner ── */}
      <button
        onClick={() => setShowInfoSheet(true)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all active:scale-95"
        style={{
          background: `${accent}0e`,
          border: `1.5px solid ${accent}28`,
          boxShadow: `0 2px 10px ${accent}0a`,
        }}
      >
        <div className="w-9 h-9 rounded-xl overflow-hidden flex-none"
          style={{ background: `${accent}1a`, border: `1px solid ${accent}25` }}>
          <img
            src={`${BASE}/garden/${VEGGIE_FILE_MAP[selected]}.png`}
            alt={info.vegetable}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold text-slate-800 leading-tight">{temp.title}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{temp.emoji} {temp.subtitle}</p>
        </div>
        <div className="flex items-center gap-0.5 flex-none">
          <span className="text-[10px] font-semibold" style={{ color: accent }}>기질 보기</span>
          <ChevronRight className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
      </button>

      {/* ── Featured plot ── */}
      <div className="relative rounded-3xl overflow-hidden" style={{ height: 260 }}>

        {/* Sky */}
        <div className="absolute inset-0"
          style={{
            background: result.alertLevel === 'high'
              ? 'linear-gradient(180deg,#7BA5C0 0%,#b8d6a8 52%,#98c488 58%)'
              : 'linear-gradient(180deg,#87CEEB 0%,#c8e8c0 52%,#a8d498 58%)',
          }}
        />

        {/* HRV vitality aura */}
        <VitalityAura organ={selected} />

        {/* EDA stress particles */}
        <StressParticles />

        {/* Character */}
        <div
          className={`absolute inset-0 flex items-end justify-center pb-8 ${animClass(state.animationMode)}`}
          style={{
            filter: charFilter(gc.brightness, state.animationMode, state.alertLevel),
            transform: `scale(${gc.scale})`,
            transformOrigin: 'center bottom',
          }}
        >
          <Image
            src={CHAR_IMAGES[selected]}
            alt={info.vegetable}
            width={320}
            height={213}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        {/* Soil reveal overlay */}
        {gc.soilOverlay > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none transition-all duration-700"
            style={{
              height: `${gc.soilOverlay * 100}%`,
              background: `linear-gradient(180deg,transparent 0%,${soil.color}CC 45%,${soil.color} 100%)`,
            }}
          />
        )}

        {/* Soil strip */}
        <div className="absolute bottom-0 left-0 right-0 h-8"
          style={{ background: soil.color }} />

        {/* Growth badge */}
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm"
          style={{ background: `${accent}CC`, color: 'white' }}>
          {gc.emoji} {gc.label} {Math.round(state.comprehensiveScore)}점
        </div>

        {/* Bio readout top-right */}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          <div className="px-2 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.85)', color: '#1e293b' }}>
            HRV {inputs.hrv}ms
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-sm`}
            style={{
              background: result.alertLevel === 'high' ? '#fef3c7' : 'rgba(255,255,255,0.85)',
              color: result.alertLevel === 'high' ? '#b45309' : '#1e293b',
            }}>
            EDA {inputs.eda.toFixed(1)}μS
          </div>
        </div>

        {/* Character name strip */}
        <div className="absolute bottom-8 left-0 right-0 text-center py-0.5"
          style={{ background: `${accent}99` }}>
          <span className="text-xs font-black text-white">{info.vegetable}</span>
          <span className="text-[10px] text-white/80 ml-1.5">({info.name} · {info.element})</span>
        </div>
      </div>

      {/* ── Soil quality indicator ── */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-3 h-3 rounded-full flex-none" style={{ background: soil.color }} />
        <span className="text-[10px] text-slate-500 font-semibold">{soil.label}</span>
        <span className="text-[10px] text-slate-400">{soil.desc}</span>
      </div>

      {/* ── Mini plots row ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {organs.map(o => (
          <div key={o} className="flex flex-col items-center gap-1 flex-none">
            <CharacterPlot
              organ={o}
              isSelected={selected === o}
              onClick={() => setSelected(o)}
              mini
            />
            <span className="text-[9px] font-bold text-slate-500">{ORGANS[o].vegetable}</span>
          </div>
        ))}
      </div>

      {showInfoSheet && (
        <CharacterInfoSheet organ={selected} onClose={() => setShowInfoSheet(false)} />
      )}
    </div>
  )
}
