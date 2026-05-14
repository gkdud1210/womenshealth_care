'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useGarden } from '@/contexts/GardenContext'
import { ORGANS } from '@/lib/tkm-scoring'
import { GROWTH_CONFIG, SOIL_STYLE } from '@/lib/bio-digital-twin'
import type { OrganKey } from '@/lib/tkm-scoring'
import type { GrowthStage, AnimationMode } from '@/lib/bio-digital-twin'

const CHAR_IMAGES: Record<OrganKey, string> = {
  heart:  '/garden/heart-beet.png',
  liver:  '/garden/liver-broccoli.png',
  spleen: '/garden/spleen-pumpkin.png',
  lung:   '/garden/lung-onion.png',
  kidney: '/garden/kidney-blackbean.png',
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

/* ── Main GardenField ─────────────────────────────────────────── */
export function GardenField({ primaryOrgan }: { primaryOrgan: OrganKey }) {
  const [selected, setSelected] = useState<OrganKey>(primaryOrgan)
  const { result, inputs } = useGarden()
  const state   = result.organStates[selected]
  const gc      = GROWTH_CONFIG[state.growthStage as GrowthStage]
  const soil    = SOIL_STYLE[state.soilQuality]
  const info    = ORGANS[selected]
  const accent  = ORGAN_ACCENT[selected]
  const organs: OrganKey[] = ['heart', 'liver', 'spleen', 'lung', 'kidney']

  return (
    <div className="space-y-3">

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
    </div>
  )
}
