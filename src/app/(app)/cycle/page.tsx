'use client'

import { useMemo, useEffect, useState } from 'react'
import { getPhaseColor } from '@/lib/cycle-utils'
import { useOnboardingProfile, isHighConcern } from '@/lib/onboarding-profile'
import { useAuth } from '@/hooks/useAuth'
import { useCycleData } from '@/hooks/useCycleData'
import type { CyclePhase } from '@/types/health'

/* ── 28-day normalized (0–100) hormone curves ─────────────────── */
const E2 = [10,10,11,13,11,18,26,37,51,66,79,89,97,100,76,48,42,50,53,51,47,43,38,32,26,20,16,12]
const P4 = [2,2,2,2,3,3,3,4,4,5,5,5,6,6,8,16,30,46,63,76,86,91,89,78,60,41,24,10]

/* ── 40-week pregnancy hormone curves (normalized 0–100) ────────
   P_HCG : hCG (인간 융모성 생식선 자극 호르몬) — peaks ~week 8, then drops
   P_E2  : Estrogens (에스트로겐) — gradually rises through week 40
   P_P4  : Progesterone (프로게스테론) — rises and plateaus ~week 36
   ─────────────────────────────────────────────────────────────── */
const P_HCG = [0,2,8,20,45,72,90,100,98,85,65,45,28,18,14,12,11,11,11,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10]
const P_E2  = [0,1,2,3,4,5,6,7,8,9,10,11,13,15,17,19,22,26,30,35,40,46,52,58,64,70,75,80,84,87,90,92,94,96,97,98,99,100,100,100,100]
const P_P4  = [0,2,5,9,13,17,21,26,30,34,38,42,46,49,53,57,61,65,68,71,74,77,80,82,84,86,88,90,91,93,94,96,97,98,99,100,99,96,90,84,78]

/* ── Pregnancy SVG helpers (41 points, width=270) ─────────────── */
const PREG_W = 270
function pregX(i: number) { return (i / 40) * PREG_W }

function pregLinePath(data: number[]) {
  let d = `M ${pregX(0)},${yv(data[0])}`
  for (let i = 1; i < data.length; i++) {
    const cpx = (pregX(i - 1) + pregX(i)) / 2
    d += ` C ${cpx},${yv(data[i-1])} ${cpx},${yv(data[i])} ${pregX(i)},${yv(data[i])}`
  }
  return d
}
function pregAreaPath(data: number[]) {
  let d = `M ${pregX(0)},${CHART_H} L ${pregX(0)},${yv(data[0])}`
  for (let i = 1; i < data.length; i++) {
    const cpx = (pregX(i - 1) + pregX(i)) / 2
    d += ` C ${cpx},${yv(data[i-1])} ${cpx},${yv(data[i])} ${pregX(i)},${yv(data[i])}`
  }
  d += ` L ${pregX(40)},${CHART_H} Z`
  return d
}

/* ── Pregnancy trimester reference data ──────────────────────── */
interface TrimesterRef {
  label: string; emoji: string; weeks: string
  hcg: string; e2: string; p4: string
  color: string; bg: string; border: string
}
const TRIMESTER_REF: TrimesterRef[] = [
  {
    label: '1삼분기', emoji: '🌱', weeks: '1–12주',
    hcg: '1,000–200,000 mIU/mL', e2: '500–7,000 pg/mL', p4: '11–44 ng/mL',
    color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)',
  },
  {
    label: '2삼분기', emoji: '🌿', weeks: '13–27주',
    hcg: '6,000–70,000 mIU/mL', e2: '2,000–12,000 pg/mL', p4: '25–90 ng/mL',
    color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)',
  },
  {
    label: '3삼분기', emoji: '🍃', weeks: '28–40주',
    hcg: '3,000–15,000 mIU/mL', e2: '6,000–30,000 pg/mL', p4: '65–290 ng/mL',
    color: '#059669', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.25)',
  },
]
function getTrimester(w: number): TrimesterRef {
  if (w <= 12) return TRIMESTER_REF[0]
  if (w <= 27) return TRIMESTER_REF[1]
  return TRIMESTER_REF[2]
}

/* ── SVG helpers (viewBox 0 0 270 92) ─────────────────────────── */
const CHART_H = 86
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

/* ── Phase bands ──────────────────────────────────────────────── */
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

/* ── Personalized advice ──────────────────────────────────────── */
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

/* ── Today date label ─────────────────────────────────────────── */
function formatDate(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

/* ── Page component ───────────────────────────────────────────── */
export default function CyclePage() {
  const { user } = useAuth()
  const profile = useOnboardingProfile()
  const cycle = useCycleData(28, 5)

  // Pregnancy mode detection
  const isPregnancy = (user?.cycleMode ?? 'normal') === 'pregnancy'
  const [pregnancyLMP, setPregnancyLMP] = useState<string | null>(null)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ludia_cycle_mode_v1')
      if (saved) {
        const p = JSON.parse(saved)
        if (p.mode === 'pregnancy' && p.pregnancyLMP) setPregnancyLMP(p.pregnancyLMP)
      }
    } catch {}
  }, [isPregnancy])

  const gestWeek = useMemo(() => {
    if (!pregnancyLMP) return 0
    const diff = Math.floor((Date.now() - new Date(pregnancyLMP + 'T00:00:00').getTime()) / 86400000)
    return Math.max(0, Math.min(40, Math.floor(diff / 7)))
  }, [pregnancyLMP])

  const { cycleDay, phase, daysUntilNextPeriod, daysUntilOvulation, hasRealData, lastPeriodStart } = cycle
  const meta = META[phase]

  // All hooks must be called before any early return
  const dayIdx  = Math.min(cycleDay - 1, 27)
  const e2Line = useMemo(() => linePath(E2), [])
  const e2Area = useMemo(() => areaPath(E2), [])
  const p4Line = useMemo(() => linePath(P4), [])
  const p4Area = useMemo(() => areaPath(P4), [])

  const tickLabels = useMemo(() => {
    const TICK_DAYS = [1, 7, 14, 21, 28]
    if (!lastPeriodStart) return TICK_DAYS.map(d => `D${d}`)
    return TICK_DAYS.map(d => {
      const date = new Date(lastPeriodStart.getTime() + (d - 1) * 86400000)
      return `${date.getMonth() + 1}/${date.getDate()}`
    })
  }, [lastPeriodStart])

  const { cautions, tips } = useMemo(
    () => getAdvice(phase, profile.answers, profile.careTypes),
    [phase, profile],
  )

  if (isPregnancy) {
    return <PregnancyCyclePage gestWeek={gestWeek} pregnancyLMP={pregnancyLMP} userName={user?.name ?? '님'} />
  }

  // SVG chart values (normal mode only)
  const todayX  = dayIdx * 10
  const todayE2 = yv(E2[dayIdx])
  const todayP4 = yv(P4[dayIdx])
  const e2Pct = E2[dayIdx]
  const p4Pct = P4[dayIdx]

  const today = new Date()
  const todayLabel = `${today.getMonth() + 1}/${today.getDate()}`
  const nextPeriodDate = lastPeriodStart
    ? new Date(lastPeriodStart.getTime() + 28 * 86400000)
    : null

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
        <p className="text-xs text-slate-400">
          {hasRealData
            ? `마지막 생리 시작일 기준 · ${user?.name ?? ''}님의 오늘`
            : `캘린더에 생리를 기록하면 정확한 주기가 표시돼요`}
        </p>
      </div>

      {/* ── No data nudge ── */}
      {!hasRealData && (
        <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
          style={{ background: 'rgba(244,63,117,0.07)', border: '1.5px dashed rgba(244,63,117,0.3)' }}>
          <span className="text-xl">🩸</span>
          <p className="text-xs text-slate-600 leading-relaxed">
            아직 생리 기록이 없어요. <b>캘린더</b>에서 생리 시작일을 기록하면
            오늘의 호르몬 상태를 정확하게 알 수 있어요.
          </p>
        </div>
      )}

      {/* ── Countdown pills ── */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-2xl px-3 py-3 text-center"
          style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(244,63,117,0.18)', boxShadow: '0 2px 12px rgba(244,63,117,0.07)' }}>
          <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wide mb-1">다음 생리까지</p>
          <p className="text-xl font-black text-slate-800 leading-none">{daysUntilNextPeriod}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">일 남음</p>
          {nextPeriodDate && (
            <p className="text-[9px] text-rose-400 font-semibold mt-1">{formatDate(nextPeriodDate)} 예정</p>
          )}
        </div>

        {daysUntilOvulation !== null ? (
          <div className="flex-1 rounded-2xl px-3 py-3 text-center"
            style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(112,72,192,0.18)', boxShadow: '0 2px 12px rgba(112,72,192,0.07)' }}>
            <p className="text-[9px] font-bold text-purple-400 uppercase tracking-wide mb-1">배란일까지</p>
            <p className="text-xl font-black text-slate-800 leading-none">{daysUntilOvulation}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">일 남음</p>
            {lastPeriodStart && (
              <p className="text-[9px] text-purple-400 font-semibold mt-1">
                {formatDate(new Date(lastPeriodStart.getTime() + (28 - 14) * 86400000))} 예정
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 rounded-2xl px-3 py-3 text-center"
            style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(184,135,11,0.18)', boxShadow: '0 2px 12px rgba(184,135,11,0.07)' }}>
            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wide mb-1">현재 주기 위치</p>
            <p className="text-xl font-black text-slate-800 leading-none">{cycleDay}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">/ 28일차</p>
            <p className="text-[9px] text-amber-500 font-semibold mt-1">{meta.title}</p>
          </div>
        )}

        <div className="flex-1 rounded-2xl px-3 py-3 text-center"
          style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(61,139,86,0.18)', boxShadow: '0 2px 12px rgba(61,139,86,0.07)' }}>
          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wide mb-1">오늘 날짜</p>
          <p className="text-sm font-black text-slate-800 leading-none">{today.getMonth() + 1}/{today.getDate()}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">D+{cycleDay}</p>
          <p className="text-[9px] text-emerald-500 font-semibold mt-1">{meta.emoji} {meta.title}</p>
        </div>
      </div>

      {/* ── Hormone Chart ── */}
      <div className="rounded-3xl p-4 mb-4"
        style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 6px 32px rgba(158,18,57,0.08)', border: '1px solid rgba(255,255,255,0.95)' }}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">호르몬 변화 곡선 (28일 주기)</p>

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

            {/* ── TODAY MARKER ── */}
            {/* Column glow */}
            <rect x={todayX - 6} y={0} width={12} height={CHART_H}
              fill={meta.color} opacity="0.08" rx="1" />

            {/* Solid vertical line */}
            <line x1={todayX} y1={9} x2={todayX} y2={CHART_H}
              stroke={meta.color} strokeWidth="2" opacity="0.9" />

            {/* E2 dot — pulsing ring */}
            <circle cx={todayX} cy={todayE2} r="3.5" fill="#f43f75" opacity="0.5">
              <animate attributeName="r" values="3.5;10;3.5" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.45;0;0.45" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={todayX} cy={todayE2} r="4" fill="#f43f75" stroke="white" strokeWidth="1.6" />

            {/* P4 dot — pulsing ring (offset) */}
            <circle cx={todayX} cy={todayP4} r="3.5" fill="#a855f7" opacity="0.5">
              <animate attributeName="r" values="3.5;10;3.5" dur="2s" begin="0.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.45;0;0.45" dur="2s" begin="0.6s" repeatCount="indefinite" />
            </circle>
            <circle cx={todayX} cy={todayP4} r="4" fill="#a855f7" stroke="white" strokeWidth="1.6" />

            {/* Day tick labels */}
            {[1, 7, 14, 21, 28].map((d, i) => (
              <text key={d} x={(d-1)*10} y={CHART_H + 6} textAnchor="middle"
                fontSize="5.5" fill="rgba(100,100,120,0.7)">{tickLabels[i]}</text>
            ))}

            {/* Date label bubble */}
            <rect
              x={Math.min(Math.max(todayX - 13, 0), 244)} y={0}
              width={26} height={10} rx="3"
              fill={meta.color} opacity="1"
            />
            <text
              x={Math.min(Math.max(todayX, 13), 257)} y={7.5}
              textAnchor="middle" fontSize="5.2" fill="white" fontWeight="bold"
            >{todayLabel}</text>
          </svg>
        </div>

        {/* Live hormone level bars */}
        <div className="mt-3 space-y-2">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="inline-block w-3 h-0.5 rounded" style={{ background: '#f43f75' }} />
                에스트로겐 E2
              </span>
              <span className="text-[10px] font-bold text-rose-400">{meta.e2}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(244,63,117,0.12)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${e2Pct}%`, background: 'linear-gradient(90deg,#f43f75,#ff8fab)' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="inline-block w-3 h-0.5 rounded" style={{ background: '#a855f7' }} />
                프로게스테론 P4
              </span>
              <span className="text-[10px] font-bold text-purple-400">{meta.p4}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(168,85,247,0.12)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${p4Pct}%`, background: 'linear-gradient(90deg,#a855f7,#c084fc)' }} />
            </div>
          </div>
        </div>

        {/* Phase label bar */}
        <div className="flex mt-3 rounded-xl overflow-hidden text-center">
          {BANDS.map(b => (
            <div key={b.id}
              style={{
                flex: b.w,
                background: b.id === phase ? (META[b.id as CyclePhase].color + '33') : b.fill,
                padding: '4px 0',
                color: getPhaseColor(b.id as CyclePhase),
                fontWeight: b.id === phase ? '900' : '700',
                borderBottom: b.id === phase ? `2px solid ${META[b.id as CyclePhase].color}` : '2px solid transparent',
              }}
              className="text-[9px] leading-none">
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
              오늘 D+{cycleDay}일 · {today.getMonth() + 1}월 {today.getDate()}일
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

/* ══════════════════════════════════════════════════════════════════
   임신 호르몬 사이클 페이지
   ══════════════════════════════════════════════════════════════════ */
function PregnancyCyclePage({
  gestWeek, pregnancyLMP, userName,
}: { gestWeek: number; pregnancyLMP: string | null; userName: string }) {
  const trimester = getTrimester(gestWeek)
  const dueDate = pregnancyLMP
    ? new Date(new Date(pregnancyLMP + 'T00:00:00').getTime() + 280 * 86400000)
    : null
  const daysLeft = dueDate
    ? Math.max(0, Math.ceil((dueDate.getTime() - Date.now()) / 86400000))
    : null

  // SVG x position of current week
  const todayX = pregX(Math.min(gestWeek, 40))

  const hcgLine  = useMemo(() => pregLinePath(P_HCG), [])
  const e2Line   = useMemo(() => pregLinePath(P_E2), [])
  const p4Line   = useMemo(() => pregLinePath(P_P4), [])
  const hcgArea  = useMemo(() => pregAreaPath(P_HCG), [])
  const e2Area   = useMemo(() => pregAreaPath(P_E2), [])
  const p4Area   = useMemo(() => pregAreaPath(P_P4), [])

  const todayHCG = yv(P_HCG[Math.min(gestWeek, 40)])
  const todayE2  = yv(P_E2 [Math.min(gestWeek, 40)])
  const todayP4  = yv(P_P4 [Math.min(gestWeek, 40)])

  const TICK_WEEKS = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40]

  return (
    <div className="min-h-screen pb-28 px-4 pt-5 max-w-lg mx-auto"
      style={{ background: 'linear-gradient(160deg,#f0fdf4 0%,#dcfce7 45%,#d1fae5 100%)' }}>

      {/* ── Header ── */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <h1 className="text-xl font-bold text-slate-800">임신 호르몬 변화</h1>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
            style={{ background: trimester.bg, color: trimester.color, border: `1px solid ${trimester.border}` }}>
            {trimester.emoji} {gestWeek}주차
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {pregnancyLMP ? `마지막 생리일 기준 · ${userName}님의 임신 {gestWeek}주` : '캘린더에서 마지막 생리일을 입력하면 정확한 주수가 표시돼요'}
        </p>
      </div>

      {/* ── No LMP nudge ── */}
      {!pregnancyLMP && (
        <div className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1.5px dashed rgba(16,185,129,0.4)' }}>
          <span className="text-xl">🌿</span>
          <p className="text-xs text-slate-600 leading-relaxed">
            <b>캘린더</b>에서 임신/출산 모드로 변경 후 마지막 생리일이나 출산 예정일을 입력하면
            현재 주수와 정확한 호르몬 변화를 확인할 수 있어요.
          </p>
        </div>
      )}

      {/* ── Countdown pills ── */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-2xl px-3 py-3 text-center"
          style={{ background: 'rgba(255,255,255,0.92)', border: `1px solid ${trimester.border}`, boxShadow: '0 2px 12px rgba(16,185,129,0.1)' }}>
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1" style={{ color: trimester.color }}>현재 주수</p>
          <p className="text-xl font-black text-slate-800 leading-none">{gestWeek}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">주차</p>
          <p className="text-[9px] font-semibold mt-1" style={{ color: trimester.color }}>{trimester.label}</p>
        </div>

        <div className="flex-1 rounded-2xl px-3 py-3 text-center"
          style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 2px 12px rgba(16,185,129,0.07)' }}>
          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wide mb-1">삼분기</p>
          <p className="text-lg font-black text-slate-800 leading-none">{trimester.emoji}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">{trimester.weeks}</p>
          <p className="text-[9px] font-semibold text-emerald-500 mt-1">{trimester.label}</p>
        </div>

        <div className="flex-1 rounded-2xl px-3 py-3 text-center"
          style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(245,158,11,0.25)', boxShadow: '0 2px 12px rgba(245,158,11,0.07)' }}>
          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wide mb-1">출산까지</p>
          <p className="text-xl font-black text-slate-800 leading-none">{daysLeft ?? '—'}</p>
          <p className="text-[9px] text-slate-400 mt-0.5">일 남음</p>
          {dueDate && (
            <p className="text-[9px] text-amber-500 font-semibold mt-1">
              {dueDate.getMonth()+1}/{dueDate.getDate()} 예정
            </p>
          )}
        </div>
      </div>

      {/* ── Pregnancy Hormone Chart ── */}
      <div className="rounded-3xl p-4 mb-4"
        style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 6px 32px rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">임신 호르몬 변화 곡선 (0–40주)</p>

        <div className="relative w-full" style={{ paddingBottom: '34%' }}>
          <svg viewBox="0 0 270 92" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">

            {/* Trimester bands */}
            <rect x={0}   y={0} width={pregX(12)} height={CHART_H} fill="rgba(16,185,129,0.07)" />
            <rect x={pregX(12)} y={0} width={pregX(27)-pregX(12)} height={CHART_H} fill="rgba(52,211,153,0.07)" />
            <rect x={pregX(27)} y={0} width={pregX(40)-pregX(27)} height={CHART_H} fill="rgba(5,150,105,0.07)" />
            {[12, 27].map(w => (
              <line key={w} x1={pregX(w)} y1={0} x2={pregX(w)} y2={CHART_H}
                stroke="rgba(16,185,129,0.3)" strokeWidth="0.7" strokeDasharray="2,2" />
            ))}

            {/* hCG area + line (olive green) */}
            <path d={hcgArea} fill="rgba(101,163,13,0.10)" />
            <path d={hcgLine} fill="none" stroke="#65a30d" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />

            {/* Estrogens area + line (orange) */}
            <path d={e2Area} fill="rgba(249,115,22,0.10)" />
            <path d={e2Line} fill="none" stroke="#f97316" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />

            {/* Progesterone line — dashed blue */}
            <path d={p4Area} fill="rgba(59,130,246,0.06)" />
            <path d={p4Line} fill="none" stroke="#3b82f6" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,3" />

            {/* X axis */}
            <line x1={0} y1={CHART_H} x2={PREG_W} y2={CHART_H}
              stroke="rgba(200,200,220,0.5)" strokeWidth="0.5" />

            {/* TODAY marker — only if LMP set */}
            {pregnancyLMP && (
              <>
                <rect x={todayX - 5} y={0} width={10} height={CHART_H}
                  fill="#10b981" opacity="0.07" rx="1" />
                <line x1={todayX} y1={9} x2={todayX} y2={CHART_H}
                  stroke="#10b981" strokeWidth="2" opacity="0.9" />

                {/* hCG dot */}
                <circle cx={todayX} cy={todayHCG} r="3.5" fill="#65a30d" opacity="0.4">
                  <animate attributeName="r" values="3.5;9;3.5" dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2.2s" repeatCount="indefinite" />
                </circle>
                <circle cx={todayX} cy={todayHCG} r="3.5" fill="#65a30d" stroke="white" strokeWidth="1.4" />

                {/* E2 dot */}
                <circle cx={todayX} cy={todayE2} r="3.5" fill="#f97316" opacity="0.4">
                  <animate attributeName="r" values="3.5;9;3.5" dur="2.2s" begin="0.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2.2s" begin="0.5s" repeatCount="indefinite" />
                </circle>
                <circle cx={todayX} cy={todayE2} r="3.5" fill="#f97316" stroke="white" strokeWidth="1.4" />

                {/* P4 dot */}
                <circle cx={todayX} cy={todayP4} r="3.5" fill="#3b82f6" opacity="0.4">
                  <animate attributeName="r" values="3.5;9;3.5" dur="2.2s" begin="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2.2s" begin="1s" repeatCount="indefinite" />
                </circle>
                <circle cx={todayX} cy={todayP4} r="3.5" fill="#3b82f6" stroke="white" strokeWidth="1.4" />

                {/* Week label bubble */}
                <rect x={Math.min(Math.max(todayX - 12, 0), 246)} y={0} width={24} height={10} rx="3"
                  fill="#10b981" opacity="1" />
                <text x={Math.min(Math.max(todayX, 12), 258)} y={7.5}
                  textAnchor="middle" fontSize="5.2" fill="white" fontWeight="bold">
                  {gestWeek}주
                </text>
              </>
            )}

            {/* Tick labels */}
            {TICK_WEEKS.map(w => (
              <text key={w} x={pregX(w)} y={CHART_H + 7} textAnchor="middle"
                fontSize="5" fill="rgba(100,100,120,0.7)">{w}</text>
            ))}
            <text x={135} y={CHART_H + 13} textAnchor="middle" fontSize="4.5" fill="rgba(140,140,160,0.8)">weeks of pregnancy</text>
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 rounded" style={{ background: '#65a30d' }} />
            <span className="text-slate-500">hCG (융모성 생식선자극호르몬)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 rounded" style={{ background: '#f97316' }} />
            <span className="text-slate-500">에스트로겐</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2 border-dashed border-blue-400" style={{ borderColor: '#3b82f6' }} />
            <span className="text-slate-500">프로게스테론</span>
          </span>
        </div>

        {/* Live bars */}
        {pregnancyLMP && (
          <div className="mt-3 space-y-2">
            {[
              { label: 'hCG', val: P_HCG[Math.min(gestWeek,40)], color: '#65a30d', range: trimester.hcg },
              { label: '에스트로겐', val: P_E2[Math.min(gestWeek,40)], color: '#f97316', range: trimester.e2 },
              { label: '프로게스테론', val: P_P4[Math.min(gestWeek,40)], color: '#3b82f6', range: trimester.p4 },
            ].map(({ label, val, color, range }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="inline-block w-3 h-0.5 rounded" style={{ background: color }} />
                    {label}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color }}>{range}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${color}18` }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${val}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trimester label bar */}
        <div className="flex mt-3 rounded-xl overflow-hidden text-center text-[9px]">
          {TRIMESTER_REF.map((t, i) => (
            <div key={i}
              style={{
                flex: i === 0 ? 12 : i === 1 ? 15 : 13,
                background: t.color === trimester.color ? t.color + '33' : t.bg,
                padding: '4px 0', color: t.color, fontWeight: t.color === trimester.color ? '900' : '700',
                borderBottom: t.color === trimester.color ? `2px solid ${t.color}` : '2px solid transparent',
              }}>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Current stage card ── */}
      <div className="rounded-3xl p-5 mb-4"
        style={{ background: trimester.bg, border: `1.5px solid ${trimester.border}`, boxShadow: '0 4px 20px rgba(16,185,129,0.08)' }}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{trimester.emoji}</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: trimester.color }}>
              현재 {gestWeek}주차 · {trimester.label}
            </p>
            <h2 className="text-base font-bold text-slate-800">{trimester.weeks}</h2>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'hCG', range: trimester.hcg, color: '#65a30d' },
            { label: '에스트로겐', range: trimester.e2, color: '#f97316' },
            { label: '프로게스테론', range: trimester.p4, color: '#3b82f6' },
          ].map(({ label, range, color }) => (
            <div key={label} className="rounded-2xl px-2 py-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${color}25` }}>
              <p className="text-[8px] font-bold uppercase tracking-wide mb-0.5" style={{ color }}>
                {label}
              </p>
              <p className="text-[10px] font-bold text-slate-700 leading-tight">{range}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trimester reference table ── */}
      <div className="rounded-3xl p-5"
        style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 6px 32px rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.12)' }}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">삼분기별 호르몬 정상 범위</p>
        <div className="space-y-2">
          {TRIMESTER_REF.map((t) => {
            const active = t.color === trimester.color
            return (
              <div key={t.label}
                className="flex items-center gap-3 px-3 py-3 rounded-2xl transition-all"
                style={{
                  background: active ? t.bg : 'rgba(248,248,252,0.7)',
                  border: `1.5px solid ${active ? t.border : 'rgba(230,230,240,0.6)'}`,
                }}>
                <span className="text-xl flex-none">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs font-bold text-slate-800">{t.label}</p>
                    <span className="text-[9px] text-slate-400">{t.weeks}</span>
                    {active && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: t.color, color: 'white' }}>지금</span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 leading-relaxed">
                    hCG {t.hcg}<br />
                    E2 {t.e2} · P4 {t.p4}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-4 leading-relaxed">
          수치는 일반적인 참고 범위이며 개인차가 있습니다.<br />
          정확한 호르몬 수치는 혈액 검사로만 확인 가능해요.
        </p>
      </div>
    </div>
  )
}
