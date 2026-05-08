'use client'

import { useMemo } from 'react'
import { getCyclePhase, getPhaseColor } from '@/lib/cycle-utils'
import { useOnboardingProfile, isHighConcern } from '@/lib/onboarding-profile'
import { useAuth } from '@/hooks/useAuth'
import type { CyclePhase } from '@/types/health'

/* ── Cycle constants (must match dashboard) ───────────────────── */
const MOCK_LAST_PERIOD = new Date(2026, 3, 8)
const CYCLE_LENGTH = 28
const PERIOD_LENGTH = 5

/* ── 28-day normalized (0–100) hormone curves ─────────────────── */
const E2 = [10,10,11,13,11,18,26,37,51,66,79,89,97,100,76,48,42,50,53,51,47,43,38,32,26,20,16,12]
const P4 = [2,2,2,2,3,3,3,4,4,5,5,5,6,6,8,16,30,46,63,76,86,91,89,78,60,41,24,10]

/* ── SVG helpers (viewBox 0 0 280 96) ─────────────────────────── */
const CHART_H = 86   // data area bottom y
function yv(v: number) { return 4 + (100 - v) * 0.82 }

function linePath(data: number[]) {
  let d = `M 0,${yv(data[0])}`
  for (let i = 1; i < data.length; i++) {
    const x1 = (i - 1) * 10, x2 = i * 10
    const cpx = (x1 + x2) / 2
    d += ` C ${cpx},${yv(data[i-1])} ${cpx},${yv(data[i])} ${x2},${yv(data[i])}`
  }
  return d
}

function areaPath(data: number[]) {
  let d = `M 0,${CHART_H} L 0,${yv(data[0])}`
  for (let i = 1; i < data.length; i++) {
    const x1 = (i - 1) * 10, x2 = i * 10
    const cpx = (x1 + x2) / 2
    d += ` C ${cpx},${yv(data[i-1])} ${cpx},${yv(data[i])} ${x2},${yv(data[i])}`
  }
  d += ` L ${(data.length - 1) * 10},${CHART_H} Z`
  return d
}

/* ── Phase bands (x-range in the 280-wide chart) ─────────────── */
const BANDS = [
  { id: 'menstrual',  x: 0,   w: 50,  fill: 'rgba(217,79,92,0.13)',   label: '생리기' },
  { id: 'follicular', x: 50,  w: 70,  fill: 'rgba(61,139,86,0.10)',   label: '난포기' },
  { id: 'ovulation',  x: 120, w: 40,  fill: 'rgba(112,72,192,0.12)',  label: '배란기' },
  { id: 'luteal',     x: 160, w: 120, fill: 'rgba(184,135,11,0.10)',  label: '황체기' },
]

/* ── Phase metadata ───────────────────────────────────────────── */
const META: Record<CyclePhase, {
  emoji: string; title: string; subtitle: string; body: string
  e2: string; p4: string; color: string; bg: string; border: string
}> = {
  menstrual: {
    emoji: '🩸', title: '생리기',
    subtitle: '모든 호르몬이 가장 낮은 시기예요',
    body: '자궁 내막이 탈락하는 시기입니다. 에스트로겐과 프로게스테론 모두 낮아 면역력이 예민해질 수 있어요. 몸이 가장 많은 에너지를 소비하는 구간입니다.',
    e2: '30–50 pg/mL', p4: '0.1–0.7 ng/mL',
    color: '#d94f5c', bg: 'rgba(217,79,92,0.07)', border: 'rgba(217,79,92,0.22)',
  },
  follicular: {
    emoji: '🌱', title: '난포기',
    subtitle: '에스트로겐이 서서히 상승하는 시기예요',
    body: '에스트로겐이 점차 증가하며 자궁 내막이 두꺼워집니다. 집중력과 에너지가 올라오며 기분이 밝아지는 가장 활기찬 구간이에요.',
    e2: '50–200 pg/mL', p4: '0.2–1.5 ng/mL',
    color: '#3d8b56', bg: 'rgba(61,139,86,0.07)', border: 'rgba(61,139,86,0.22)',
  },
  ovulation: {
    emoji: '✨', title: '배란기',
    subtitle: '에스트로겐이 피크를 찍는 시기예요',
    body: 'LH 급증과 함께 배란이 유도됩니다. 기초 체온이 일시 하락 후 상승하며, 신체적·정신적 능력이 최고조에 달하는 구간이에요.',
    e2: '200–400 pg/mL', p4: '0.5–2.5 ng/mL',
    color: '#7048c0', bg: 'rgba(112,72,192,0.07)', border: 'rgba(112,72,192,0.22)',
  },
  luteal: {
    emoji: '🌙', title: '황체기',
    subtitle: '프로게스테론이 급상승하는 시기예요',
    body: '프로게스테론이 급증하며 체온이 높게 유지됩니다. PMS 증상이 나타날 수 있으며, 몸이 휴식과 따뜻함을 원하는 구간이에요.',
    e2: '100–200 pg/mL', p4: '5–20 ng/mL',
    color: '#b8870b', bg: 'rgba(184,135,11,0.07)', border: 'rgba(184,135,11,0.22)',
  },
}

/* ── Personalized LUDIA advice ────────────────────────────────── */
type Answers = Record<string, string | string[] | number>

function getAdvice(phase: CyclePhase, answers: Answers, careTypes: string[]) {
  const cautions: string[] = []
  const tips: string[] = []

  const base: Record<CyclePhase, { c: string[]; t: string[] }> = {
    menstrual: {
      c: ['과격한 운동이나 찬 음식은 생리통을 악화시킬 수 있어요', '면역력이 낮아지는 시기라 무리한 일정을 피해요'],
      t: ['따뜻한 찜질과 생강차가 생리통 완화에 효과적이에요', '철분 풍부 식품(시금치·두부·깨)을 챙겨 드세요', '가벼운 스트레칭으로 골반 긴장을 풀어주세요'],
    },
    follicular: {
      c: ['에너지가 넘치는 시기지만 무리하면 탈진할 수 있어요'],
      t: ['새로운 운동 루틴·프로젝트를 시작하기 좋은 때예요', '단백질과 복합 탄수화물로 에너지를 보충해주세요', '중요한 발표나 미팅 일정을 이 시기에 잡아보세요'],
    },
    ovulation: {
      c: ['배란일 전후 기초 체온이 변동할 수 있으니 관찰해요'],
      t: ['고강도 운동을 즐기기에 최적의 타이밍이에요', '아연·비타민 B6가 배란 기능을 지원해줘요', '에너지와 집중력이 최고조 — 중요한 일에 집중해보세요'],
    },
    luteal: {
      c: ['PMS 증상(부종·유방통·감정 기복)이 나타날 수 있어요', '카페인·당분 과다 섭취는 증상을 악화시켜요'],
      t: ['마그네슘(견과류·다크초콜릿)이 PMS 완화에 효과적이에요', '저강도 운동(걷기·수영)을 추천해요', '오메가-3가 염증과 기분 안정에 도움이 돼요'],
    },
  }

  cautions.push(...base[phase].c)
  tips.push(...base[phase].t)

  // personalize by care type & answers
  if ((careTypes.includes('period_pain') || careTypes.includes('healthy_cycle')) && phase === 'menstrual') {
    if (isHighConcern(answers['period_pain_level'])) {
      cautions.push('생리통이 심할 경우 진통제는 식후 복용을 권장해요')
      tips.push('아랫배 온찜질을 15–20분씩 해주세요')
    }
    if (isHighConcern(answers['period_coldness']))
      tips.push('아랫배가 차갑다면 복대나 핫팩으로 따뜻하게 유지해요')
  }

  if ((careTypes.includes('stress') || isHighConcern(answers['stress_sleep'])) && phase === 'luteal') {
    cautions.push('황체기는 스트레스 호르몬이 더 예민하게 반응하는 시기예요')
    tips.push('잠들기 1시간 전 핸드폰을 끄고 이완 루틴을 만들어보세요')
  }

  if ((careTypes.includes('skin_acne') || isHighConcern(answers['skin_cycle_acne'])) && phase === 'luteal') {
    cautions.push('황체기에 피지 분비 증가로 턱·입 주변 트러블이 생기기 쉬워요')
    tips.push('논코메도제닉(non-comedogenic) 제품을 사용해 보세요')
  }

  if ((careTypes.includes('diet') || isHighConcern(answers['diet_craving'])) && phase === 'luteal') {
    cautions.push('단 음식 욕구가 강해지는 시기 — 혈당 스파이크를 주의해요')
    tips.push('달콤한 것이 당긴다면 다크초콜릿 1–2조각이 더 나은 선택이에요')
  }

  if ((careTypes.includes('hair_care') || isHighConcern(answers['hair_loss'])) && phase === 'menstrual')
    tips.push('생리기는 두피 혈액순환이 약해져요 — 두피 마사지가 탈모 예방에 도움이 돼요')

  return { cautions, tips }
}

/* ── Page component ───────────────────────────────────────────── */
export default function CyclePage() {
  const { user } = useAuth()
  const profile = useOnboardingProfile()

  const today = useMemo(() => new Date(), [])
  const cycleDay = useMemo(() => {
    const diff = Math.floor((today.getTime() - MOCK_LAST_PERIOD.getTime()) / 86400000)
    return (diff % CYCLE_LENGTH) + 1
  }, [today])
  const phase = useMemo(() => getCyclePhase(cycleDay, CYCLE_LENGTH, PERIOD_LENGTH), [cycleDay])
  const meta = META[phase]

  // SVG chart values
  const dayIdx  = Math.min(cycleDay - 1, 27)
  const todayX  = dayIdx * 10
  const todayE2 = yv(E2[dayIdx])
  const todayP4 = yv(P4[dayIdx])

  const e2Line = useMemo(() => linePath(E2), [])
  const e2Area = useMemo(() => areaPath(E2), [])
  const p4Line = useMemo(() => linePath(P4), [])
  const p4Area = useMemo(() => areaPath(P4), [])

  const { cautions, tips } = useMemo(
    () => getAdvice(phase, profile.answers, profile.careTypes),
    [phase, profile],
  )

  return (
    <div className="min-h-screen pb-28 px-4 pt-5 max-w-lg mx-auto"
      style={{ background: 'linear-gradient(160deg,#fdf6f9 0%,#fce9f0 45%,#f8eeff 100%)' }}>

      {/* ── Header ── */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <h1 className="text-xl font-bold text-slate-800">호르몬 사이클</h1>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
            {meta.emoji} D+{cycleDay}
          </span>
        </div>
        <p className="text-xs text-slate-400">28일 주기 기준 · {user?.name ?? ''}님의 오늘</p>
      </div>

      {/* ── Hormone Chart ── */}
      <div className="rounded-3xl p-4 mb-4"
        style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 6px 32px rgba(158,18,57,0.08)', border: '1px solid rgba(255,255,255,0.95)' }}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">호르몬 변화 곡선 (28일)</p>

        {/* Responsive SVG wrapper */}
        <div className="relative w-full" style={{ paddingBottom: '34%' }}>
          <svg
            viewBox="0 0 270 92"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Phase background bands */}
            {BANDS.map(b => (
              <rect key={b.id} x={b.x} y={0} width={b.w} height={CHART_H} fill={b.fill} rx="0" />
            ))}
            {/* Band separators */}
            {[50, 120, 160].map(x => (
              <line key={x} x1={x} y1={0} x2={x} y2={CHART_H}
                stroke="rgba(180,180,200,0.5)" strokeWidth="0.6" strokeDasharray="2,2" />
            ))}

            {/* E2 area + line */}
            <path d={e2Area} fill="rgba(244,63,117,0.13)" />
            <path d={e2Line} fill="none" stroke="#f43f75" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />

            {/* P4 area + line */}
            <path d={p4Area} fill="rgba(168,85,247,0.11)" />
            <path d={p4Line} fill="none" stroke="#a855f7" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />

            {/* X axis baseline */}
            <line x1={0} y1={CHART_H} x2={270} y2={CHART_H}
              stroke="rgba(200,200,220,0.5)" strokeWidth="0.5" />

            {/* Today vertical marker */}
            <line x1={todayX} y1={0} x2={todayX} y2={CHART_H}
              stroke="rgba(30,16,53,0.55)" strokeWidth="1" strokeDasharray="3,2" />

            {/* Today dots */}
            <circle cx={todayX} cy={todayE2} r="3.5" fill="#f43f75" stroke="white" strokeWidth="1.2" />
            <circle cx={todayX} cy={todayP4} r="3.5" fill="#a855f7" stroke="white" strokeWidth="1.2" />

            {/* Day tick labels */}
            {[1, 7, 14, 21, 28].map(d => (
              <text key={d} x={(d-1)*10} y={CHART_H + 6} textAnchor="middle"
                fontSize="5.5" fill="rgba(100,100,120,0.7)">{d}</text>
            ))}

            {/* "오늘" label */}
            {todayX > 10 && todayX < 260 && (
              <text x={todayX} y={CHART_H + 6} textAnchor="middle"
                fontSize="5.5" fill={meta.color} fontWeight="bold">오늘</text>
            )}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-2">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="inline-block w-5 h-0.5 rounded" style={{ background: '#f43f75' }} />
            에스트로겐 E2
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="inline-block w-5 h-0.5 rounded" style={{ background: '#a855f7' }} />
            프로게스테론 P4
          </span>
        </div>

        {/* Phase label bar */}
        <div className="flex mt-3 rounded-xl overflow-hidden text-center">
          {BANDS.map(b => (
            <div key={b.id}
              style={{ flex: b.w, background: b.fill, padding: '4px 0', color: getPhaseColor(b.id as CyclePhase) }}
              className="text-[9px] font-bold leading-none">
              {b.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Today's Phase Card ── */}
      <div className="rounded-3xl p-5 mb-4"
        style={{ background: meta.bg, border: `1.5px solid ${meta.border}`, boxShadow: '0 4px 20px rgba(158,18,57,0.06)' }}>
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl">{meta.emoji}</span>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: meta.color }}>
              오늘 D+{cycleDay}일
            </p>
            <h2 className="text-base font-bold text-slate-800 mb-0.5">{meta.title}</h2>
            <p className="text-xs font-semibold mb-2" style={{ color: meta.color }}>{meta.subtitle}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{meta.body}</p>
          </div>
        </div>

        {/* Hormone range pills */}
        <div className="flex gap-2">
          <div className="flex-1 rounded-2xl px-3 py-2.5 text-center"
            style={{ background: 'rgba(244,63,117,0.1)', border: '1px solid rgba(244,63,117,0.18)' }}>
            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wide mb-0.5">E2 에스트로겐</p>
            <p className="text-xs font-bold text-slate-700">{meta.e2}</p>
          </div>
          <div className="flex-1 rounded-2xl px-3 py-2.5 text-center"
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.18)' }}>
            <p className="text-[9px] font-bold text-purple-400 uppercase tracking-wide mb-0.5">P4 프로게스테론</p>
            <p className="text-xs font-bold text-slate-700">{meta.p4}</p>
          </div>
        </div>
      </div>

      {/* ── LUDIA Personalized Guide ── */}
      <div className="rounded-3xl p-5 mb-4"
        style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 6px 32px rgba(158,18,57,0.08)', border: '1px solid rgba(255,255,255,0.95)' }}>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-2xl flex items-center justify-center flex-none"
            style={{ background: 'linear-gradient(135deg,#f43f75,#a855f7)', boxShadow: '0 3px 12px rgba(244,63,117,0.3)' }}>
            <span className="text-[11px] font-black text-white">L</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">루디아의 오늘 가이드</p>
            <p className="text-[10px] text-slate-400 mt-0.5">기질 & 진단 데이터 기반 맞춤 조언</p>
          </div>
        </div>

        {/* Cautions */}
        {cautions.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">⚠ 오늘 조심하세요</p>
            <div className="space-y-1.5">
              {cautions.map((c, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-2xl"
                  style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <span className="text-amber-400 text-xs flex-none mt-0.5">!</span>
                  <p className="text-xs text-slate-700 leading-relaxed">{c}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        {tips.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">✦ 루디아 추천</p>
            <div className="space-y-1.5">
              {tips.map((t, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-2xl"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.16)' }}>
                  <span className="text-emerald-500 text-xs flex-none mt-0.5">✓</span>
                  <p className="text-xs text-slate-700 leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── All-phase hormone reference table ── */}
      <div className="rounded-3xl p-5"
        style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 6px 32px rgba(158,18,57,0.08)', border: '1px solid rgba(255,255,255,0.95)' }}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">주기별 호르몬 정상 범위</p>
        <div className="space-y-2">
          {(Object.entries(META) as [CyclePhase, typeof META[CyclePhase]][]).map(([id, m]) => {
            const active = id === phase
            return (
              <div key={id}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all"
                style={{
                  background: active ? m.bg : 'rgba(248,248,252,0.7)',
                  border: `1.5px solid ${active ? m.border : 'rgba(230,230,240,0.6)'}`,
                }}>
                <span className="text-xl flex-none">{m.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-xs font-bold text-slate-800">{m.title}</p>
                    {active && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: m.color, color: 'white' }}>지금</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    E2 {m.e2} · P4 {m.p4}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-4 leading-relaxed">
          수치는 일반적인 28일 주기 평균값이며 개인차가 있습니다.<br />
          정확한 호르몬 수치는 혈액 검사로만 확인 가능해요.
        </p>
      </div>
    </div>
  )
}
