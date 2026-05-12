'use client'

import type { OrganKey, HealthState } from '@/lib/tkm-scoring'

interface Props {
  organ: OrganKey
  state: HealthState
  size?: number
}

/* ── Per-organ glow color for drop-shadow ─────────────────────── */
const GLOW: Record<OrganKey, string> = {
  heart:  'rgba(244,63,117,0.7)',
  liver:  'rgba(34,197,94,0.7)',
  spleen: 'rgba(251,146,60,0.7)',
  lung:   'rgba(167,139,250,0.7)',
  kidney: 'rgba(99,102,241,0.7)',
}

const WILT_FILTER = 'saturate(0.35) brightness(0.82) sepia(0.2)'

/* ── Beet (Heart · Fire · Red) ───────────────────────────────── */
function BeetSVG() {
  return (
    <svg viewBox="0 0 100 118" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Leaves */}
      <ellipse cx="34" cy="30" rx="7" ry="17" fill="#2D7A4F" transform="rotate(-28 34 30)" />
      <ellipse cx="50" cy="24" rx="7" ry="18" fill="#3A8F5A" />
      <ellipse cx="66" cy="30" rx="7" ry="17" fill="#2D7A4F" transform="rotate(28 66 30)" />
      {/* Leaf veins */}
      <line x1="34" y1="40" x2="30" y2="18" stroke="#1A5A30" strokeWidth="0.9" opacity="0.6" />
      <line x1="50" y1="40" x2="50" y2="22" stroke="#1A5A30" strokeWidth="0.9" opacity="0.6" />
      <line x1="66" y1="40" x2="70" y2="18" stroke="#1A5A30" strokeWidth="0.9" opacity="0.6" />
      {/* Stem */}
      <rect x="47" y="37" width="6" height="10" rx="3" fill="#1A5A30" />
      {/* Body shadow */}
      <ellipse cx="52" cy="78" rx="30" ry="26" fill="#7A0E35" opacity="0.25" />
      {/* Main body */}
      <ellipse cx="50" cy="74" rx="30" ry="28" fill="#B31A50" />
      {/* Body highlight */}
      <ellipse cx="40" cy="63" rx="10" ry="8" fill="#D4285E" opacity="0.55" />
      <ellipse cx="44" cy="60" rx="5" ry="4" fill="white" opacity="0.12" />
      {/* Root tail */}
      <path d="M 50 100 Q 54 110 52 117" stroke="#7A0E35" strokeWidth="2.5"
        fill="none" strokeLinecap="round" />
      {/* Heart organ icon */}
      <path
        d="M 44 71 C 44 67 47 65 50 68.5 C 53 65 56 67 56 71 C 56 76 50 81 50 81 C 50 81 44 76 44 71 Z"
        fill="white" opacity="0.88"
      />
    </svg>
  )
}

/* ── Broccoli (Liver · Wood · Green) ─────────────────────────── */
function BroccoliSVG() {
  return (
    <svg viewBox="0 0 100 118" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Floret cluster — outer */}
      <circle cx="33" cy="46" r="16" fill="#1A6B30" />
      <circle cx="67" cy="46" r="16" fill="#1A6B30" />
      <circle cx="50" cy="36" r="18" fill="#1A6B30" />
      <circle cx="50" cy="54" r="14" fill="#1A6B30" />
      {/* Floret cluster — mid tone */}
      <circle cx="33" cy="44" r="13" fill="#21873D" />
      <circle cx="67" cy="44" r="13" fill="#21873D" />
      <circle cx="50" cy="34" r="15" fill="#21873D" />
      {/* Floret buds highlight */}
      <circle cx="28" cy="38" r="7" fill="#2FAB4F" />
      <circle cx="42" cy="30" r="7" fill="#2FAB4F" />
      <circle cx="58" cy="30" r="7" fill="#2FAB4F" />
      <circle cx="72" cy="38" r="7" fill="#2FAB4F" />
      <circle cx="50" cy="26" r="7" fill="#2FAB4F" />
      {/* Stem */}
      <rect x="42" y="58" width="16" height="42" rx="8" fill="#2D7A30" />
      {/* Stem shading */}
      <rect x="45" y="58" width="6" height="42" rx="3" fill="#3A8F3A" opacity="0.6" />
      {/* Eye organ icon */}
      {/* White of eye */}
      <ellipse cx="50" cy="44" rx="11" ry="7" fill="white" opacity="0.88" />
      {/* Iris */}
      <circle cx="50" cy="44" r="4.5" fill="#1A3D8A" />
      {/* Pupil */}
      <circle cx="50" cy="44" r="2.5" fill="#0A1A3A" />
      {/* Eye shine */}
      <circle cx="52" cy="42.5" r="1.2" fill="white" />
      {/* Eyelid arcs */}
      <path d="M 39 44 Q 50 37 61 44" stroke="#1A4A20" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M 39 44 Q 50 51 61 44" stroke="#1A4A20" strokeWidth="1" fill="none" opacity="0.5" />
    </svg>
  )
}

/* ── Sweet Pumpkin (Spleen · Earth · Yellow-Orange) ──────────── */
function PumpkinSVG() {
  return (
    <svg viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stem */}
      <rect x="46" y="12" width="8" height="16" rx="4" fill="#2D6A20" />
      {/* Leaf + tendril */}
      <ellipse cx="38" cy="14" rx="10" ry="6" fill="#3A8030" transform="rotate(-20 38 14)" />
      <path d="M 54 14 Q 65 8 68 16 Q 64 20 58 17" stroke="#3A8030" strokeWidth="2" fill="none" />
      {/* Body ribs (5 lobes) */}
      <ellipse cx="50" cy="68" rx="14" ry="32" fill="#C47010" />
      <ellipse cx="36" cy="68" rx="14" ry="30" fill="#C47010" />
      <ellipse cx="64" cy="68" rx="14" ry="30" fill="#C47010" />
      <ellipse cx="24" cy="70" rx="11" ry="25" fill="#BA6A0C" />
      <ellipse cx="76" cy="70" rx="11" ry="25" fill="#BA6A0C" />
      {/* Main body over */}
      <ellipse cx="50" cy="68" rx="38" ry="32" fill="#D47A12" />
      {/* Rib dividers */}
      <path d="M 50 36 Q 46 52 50 100" stroke="#BA6A0C" strokeWidth="1.5" opacity="0.5" />
      <path d="M 38 40 Q 34 60 38 98" stroke="#BA6A0C" strokeWidth="1" opacity="0.4" />
      <path d="M 62 40 Q 66 60 62 98" stroke="#BA6A0C" strokeWidth="1" opacity="0.4" />
      <path d="M 27 52 Q 24 68 28 96" stroke="#BA6A0C" strokeWidth="1" opacity="0.3" />
      <path d="M 73 52 Q 76 68 72 96" stroke="#BA6A0C" strokeWidth="1" opacity="0.3" />
      {/* Highlight */}
      <ellipse cx="40" cy="55" rx="9" ry="7" fill="#E8920A" opacity="0.55" />
      <ellipse cx="43" cy="52" rx="4" ry="3" fill="white" opacity="0.12" />
      {/* Stomach wave organ icon */}
      <rect x="35" y="63" width="30" height="15" rx="7" fill="white" opacity="0.82" />
      <path d="M 37 70 Q 41 65 45 70 Q 49 75 53 70 Q 57 65 63 70"
        stroke="#C47010" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/* ── Onion (Lung · Metal · White/Cream) ──────────────────────── */
function OnionSVG() {
  return (
    <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Green top shoot */}
      <path d="M 44 22 Q 38 8 44 2 Q 50 8 48 22" fill="#3A8030" />
      <path d="M 52 24 Q 58 10 64 6 Q 66 16 56 24" fill="#2D6A20" />
      {/* Outer skin (light purple-gold) */}
      <ellipse cx="50" cy="72" rx="34" ry="44" fill="#D4A85A" opacity="0.5" />
      {/* Outer layer */}
      <ellipse cx="50" cy="72" rx="32" ry="42" fill="#F0E4C8" />
      {/* Mid layer */}
      <ellipse cx="50" cy="74" rx="26" ry="36" fill="#F8F0DC" />
      {/* Inner layer */}
      <ellipse cx="50" cy="76" rx="19" ry="28" fill="white" />
      {/* Purple tips */}
      <ellipse cx="50" cy="30" rx="28" ry="12" fill="#9B5DB5" opacity="0.55" />
      <ellipse cx="50" cy="32" rx="20" ry="8" fill="#B066CC" opacity="0.4" />
      {/* Layer lines (showing cross-section feel) */}
      <ellipse cx="50" cy="72" rx="32" ry="42" stroke="#D4A85A" strokeWidth="1" fill="none" opacity="0.4" />
      <ellipse cx="50" cy="74" rx="26" ry="36" stroke="#D4B870" strokeWidth="0.8" fill="none" opacity="0.35" />
      {/* Roots */}
      {[44, 47, 50, 53, 56].map((x, i) => (
        <path key={i} d={`M ${x} 113 Q ${x + (i - 2) * 2} 118 ${x + (i - 2) * 3} 120`}
          stroke="#C8A860" strokeWidth="1" fill="none" strokeLinecap="round" />
      ))}
      {/* Lung organ icon */}
      <path d="M 36 72 Q 30 62 32 54 Q 38 50 42 56 Q 44 62 44 72 Z"
        fill="white" opacity="0.82" stroke="#7C3AED" strokeWidth="0.8" />
      <path d="M 64 72 Q 70 62 68 54 Q 62 50 58 56 Q 56 62 56 72 Z"
        fill="white" opacity="0.82" stroke="#7C3AED" strokeWidth="0.8" />
      <rect x="44" y="66" width="12" height="6" rx="3" fill="white" opacity="0.82" />
    </svg>
  )
}

/* ── Black Bean (Kidney · Water · Black) ─────────────────────── */
function BlackBeanSVG() {
  return (
    <svg viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stem & tendrils */}
      <path d="M 50 20 Q 40 12 36 16 Q 40 22 48 22" stroke="#2D4A20" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 50 20 Q 58 10 64 14 Q 60 22 52 22" stroke="#2D4A20" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Pod outer */}
      <ellipse cx="50" cy="68" rx="36" ry="38" fill="#12122A" />
      {/* Pod highlight ridge */}
      <path d="M 18 62 Q 22 40 50 36 Q 78 40 82 62 Q 82 90 50 100 Q 18 90 18 62 Z"
        fill="#1A1A38" />
      {/* Pod sheen */}
      <ellipse cx="38" cy="52" rx="9" ry="6" fill="#2E2E52" opacity="0.7" />
      <ellipse cx="40" cy="50" rx="4" ry="3" fill="white" opacity="0.08" />
      {/* Bean bumps (3 beans showing inside) */}
      {[30, 50, 70].map((cx, i) => (
        <g key={i}>
          <ellipse cx={cx} cy={68 + (i === 1 ? -4 : 4)} rx="11" ry="13"
            fill="#1E1E3A" stroke="#2D2D50" strokeWidth="1" />
          {/* Kidney indent line */}
          <path d={`M ${cx - 4} ${68 + (i === 1 ? -4 : 4) - 5} Q ${cx - 8} ${68 + (i === 1 ? -4 : 4)} ${cx - 4} ${68 + (i === 1 ? -4 : 4) + 5}`}
            stroke="#12122A" strokeWidth="1.5" fill="none" />
          <ellipse cx={cx + 2} cy={68 + (i === 1 ? -8 : 0)} rx="3" ry="2"
            fill="white" opacity="0.06" />
        </g>
      ))}
      {/* Kidney organ icon */}
      <path
        d="M 40 68 Q 34 60 36 54 Q 42 50 46 56 Q 48 62 48 68 Z"
        fill="#4F46E5" opacity="0.75"
      />
      <path
        d="M 60 68 Q 66 60 64 54 Q 58 50 54 56 Q 52 62 52 68 Z"
        fill="#4F46E5" opacity="0.75"
      />
    </svg>
  )
}

const SVGS: Record<OrganKey, React.FC> = {
  heart: BeetSVG,
  liver: BroccoliSVG,
  spleen: PumpkinSVG,
  lung: OnionSVG,
  kidney: BlackBeanSVG,
}

const LABELS: Record<OrganKey, { vegetable: string; emoji: string }> = {
  heart:  { vegetable: '비트',   emoji: '🩺' },
  liver:  { vegetable: '브로콜리', emoji: '🌿' },
  spleen: { vegetable: '단호박', emoji: '🎃' },
  lung:   { vegetable: '양파',   emoji: '🧅' },
  kidney: { vegetable: '검은콩', emoji: '🫘' },
}

const STATE_LABEL: Record<HealthState, string> = {
  glowing: '건강 충만',
  normal:  '보통',
  wilting: '주의 필요',
}

const STATE_COLOR: Record<HealthState, string> = {
  glowing: '#16A34A',
  normal:  '#B45309',
  wilting: '#9F1239',
}

/* ── Main component ───────────────────────────────────────────── */
export function VegetableAvatar({ organ, state, size = 120 }: Props) {
  const SVGComponent = SVGS[organ]
  const label = LABELS[organ]
  const glowColor = GLOW[organ]

  const glowFilter = state === 'glowing'
    ? `drop-shadow(0 0 14px ${glowColor}) drop-shadow(0 0 28px ${glowColor})`
    : state === 'wilting'
      ? WILT_FILTER
      : 'none'

  const animClass =
    state === 'glowing' ? 'garden-float garden-glow'
    : state === 'wilting' ? 'garden-wilt'
    : 'garden-breathe'

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={animClass}
        style={{
          width: size,
          height: size,
          filter: glowFilter,
          transition: 'filter 0.6s ease',
          transformOrigin: 'center bottom',
        }}
      >
        <SVGComponent />
      </div>

      {/* Sparkles for glowing state */}
      {state === 'glowing' && (
        <div className="flex gap-1 -mt-1">
          {['✦', '✧', '✦'].map((s, i) => (
            <span key={i} className="text-yellow-400 garden-sparkle text-xs"
              style={{ animationDelay: `${i * 0.3}s` }}>{s}</span>
          ))}
        </div>
      )}

      {/* Wilting droop indicator */}
      {state === 'wilting' && (
        <div className="flex gap-1 -mt-1">
          {['·', '·', '·'].map((s, i) => (
            <span key={i} className="text-slate-400 text-xs">{s}</span>
          ))}
        </div>
      )}

      <div className="text-center">
        <p className="text-sm font-bold text-slate-800">{label.vegetable}</p>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${STATE_COLOR[state]}18`, color: STATE_COLOR[state] }}
        >
          {STATE_LABEL[state]}
        </span>
      </div>
    </div>
  )
}
