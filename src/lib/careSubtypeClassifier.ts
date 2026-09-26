/**
 * 케어카드 세부 체질 분류 엔진 (탈모 카드 제외 11개 카드)
 *
 * '탈모 & 두피 케어'는 기존 hairCareClassifier.ts를 그대로 사용해요.
 * 이 파일은 홍채/EDA/HRV/BMI(MultimodalData)와 온보딩 문진(OnboardingProfile)을
 * 조합해, 선택한 케어카드마다 6개 세부 체질 중 가장 가까운 1~2개를 골라줘요.
 * (같은 방식 — 신호 점수 합산 후 비율로 환산, 2순위가 20% 이상이면 "복합 유형")
 */

import type { MultimodalData } from '@/components/calendar/LudiaInsightCard'
import type { OnboardingProfile } from '@/lib/onboarding-profile'
import { isHighConcern } from '@/lib/onboarding-profile'
import type { CareCaseId } from '@/data/careCases'

export interface CareSubtypeMatch {
  id: string
  score: number
  percent: number
}

export interface CareSubtypeClassification {
  primary: CareSubtypeMatch
  secondary: CareSubtypeMatch | null
  matches: CareSubtypeMatch[]
}

function bmiScore(bmi: number, range: [number, number] | null): number {
  if (!range) return 8 // 체형과 무관한 유형(자세/신경계 등)의 기본 점수
  const [lo, hi] = range
  if (bmi >= lo && bmi <= hi) return 30
  const dist = bmi < lo ? lo - bmi : bmi - hi
  return dist <= 1.5 ? 12 : 0
}

function finalize(scores: Record<string, number>): CareSubtypeClassification {
  const matches = Object.entries(scores)
    .map(([id, score]) => ({ id, score, percent: 0 }))
    .sort((a, b) => b.score - a.score)
  const total = matches.reduce((s, m) => s + m.score, 0)

  if (total === 0) {
    const withPercent = matches.map((m, i) => ({ ...m, percent: i === 0 ? 100 : 0 }))
    return { primary: withPercent[0], secondary: null, matches: withPercent }
  }

  const withPercent = matches.map(m => ({ ...m, percent: Math.round((m.score / total) * 100) }))
  const primary = withPercent[0]
  const second = withPercent[1]
  const secondary = second && second.score > 0 && second.percent >= 20 ? second : null
  return { primary, secondary, matches: withPercent }
}

/** 카드·유형에 관계없이 재사용하는 공통 신호 */
function rawSignals(d: MultimodalData, p: OnboardingProfile) {
  const a = p.answers
  const irisAvg = (d.iris.leftScore + d.iris.rightScore) / 2
  return {
    // ── 홍채 데이터 (DiagnosticReport와 같은 기준값을 써요: skinZone<65, thyroidZone<70) ──
    irisAvgLow: irisAvg < 60,           // 홍채 전체 밀도가 낮음 → 전반적 기력·회복력 저하
    skinZoneLow: d.iris.skinZone < 65,   // 홍채 피부 반사구 저하
    thyroidZoneLow: d.iris.thyroidZone < 70, // 홍채 갑상선 반사구 저하
    stressHigh: d.eda.stressIndex >= 65,
    stressMid: d.eda.stressIndex >= 45,
    lowHRV: d.biosignal.hrv < 38,
    ansLow: d.eda.ansBalance < 35,
    poorSleep: d.biosignal.sleepHours < 6.5 || isHighConcern(a.stress_sleep),
    palpitation: isHighConcern(a.stress_palpitation),
    giHigh: isHighConcern(a.gut_bloating) || isHighConcern(a.gut_bowel),
    postureHigh: isHighConcern(a.posture_neck) || isHighConcern(a.posture_pelvis),
    skinTrouble: isHighConcern(a.skin_cycle_acne),
    skinBeforePeriod: Array.isArray(a.skin_timing) && a.skin_timing.includes('생리 전'),
    dietCraving: isHighConcern(a.diet_craving),
    fatigueHigh: isHighConcern(a.common_fatigue),
    coldness: isHighConcern(a.period_coldness),
    highPeriodPain: typeof a.period_pain_level === 'number' && a.period_pain_level >= 7,
    irregularCycle: a.common_cycle === '많이 불규칙해요' || a.common_cycle === '가끔 불규칙해요',
    maleActivityLow: isHighConcern(a.male_testosterone),
    maleProstate: isHighConcern(a.male_prostate),
    jointStiff: isHighConcern(a.osteo_joint) || isHighConcern(a.senior_mobility),
    lowVitaminD: a.osteo_vitamin_d === '거의 못 해요',
    thyroidAlert: isHighConcern(a.thyroid_checkup) || isHighConcern(a.thyroid_swelling),
    memoryFog: isHighConcern(a.senior_memory),
    fertilityLong: a.fertility_duration === '1년 이상' || a.fertility_duration === '6개월~1년',
    lowBasalTemp: a.fertility_basal_temp === '네, 낮은 편이에요',
    fibroidRisk: isHighConcern(a.fibroid_family) || isHighConcern(a.fibroid_bleeding),
    hairThin: isHighConcern(a.hair_thinning) || isHighConcern(a.hair_loss),
    // 문진만으로는 알 수 없고, 최근 식단 기록(배달·가공식품 비중)에서 계산해 override로 넘겨줘요.
    deliveryFoodHigh: false,
  }
}

export type SignalOverrides = Partial<ReturnType<typeof rawSignals>>

/** 실시간 증상 체크(사용자가 직접 고른 증상 칩)를 신호에 얹어요. 증상 칩이 true면 항상 우선해요. */
function commonSignals(d: MultimodalData, p: OnboardingProfile, overrides?: SignalOverrides) {
  const base = rawSignals(d, p)
  const merged = overrides ? { ...base, ...overrides } : base
  return { ...merged, bmi: d.biosignal.bmi }
}

type Signals = ReturnType<typeof commonSignals>
type ScoreFn = (bmi: (range: [number, number] | null) => number, s: Signals) => Record<string, number>

/** 탈모 6유형(hairCareClassifier.ts와 동일한 점수식) — 카드 간 교차 비교를 위해 같은 신호 체계로 재계산해요. */
const HAIR_SCORER: ScoreFn = (bmi, s) => ({
  stress_ans: (s.stressHigh ? 15 : 0) + (s.lowHRV ? 15 : 0) + (s.ansLow ? 10 : 0) + (s.poorSleep ? 10 : 0) + (s.bmi >= 18.5 && s.bmi < 23 ? 5 : 0),
  metabolic_damp_heat: (s.bmi >= 25 ? 25 : 0) + (s.skinTrouble ? 10 : 0) + (s.dietCraving ? 10 : 0) + (s.deliveryFoodHigh ? 8 : 0),
  deficiency: (s.bmi < 18.5 ? 30 : 0) + (s.fatigueHigh ? 10 : 0) + (s.irisAvgLow ? 10 : 0),
  hormonal_dht: 8 + (s.bmi >= 21 && s.bmi <= 26 ? 10 : 0) + (s.hairThin ? 15 : 0),
  gut_inflammation: (s.giHigh ? 25 : 0) + (s.bmi >= 23 && s.bmi <= 27 ? 10 : 0) + (s.skinTrouble ? 8 : 0) + (s.deliveryFoodHigh ? 10 : 0),
  cervical_capillary: (s.postureHigh ? 28 : 0) + (s.fatigueHigh ? 5 : 0) + (s.palpitation ? 5 : 0),
})

const SCORERS: Partial<Record<CareCaseId, ScoreFn>> = {
  weight_metabolic: (bmi, s) => ({
    weight_metabolic__water_retention: bmi([23, 26]) + (s.coldness ? 15 : 0) + (s.ansLow ? 5 : 0),
    weight_metabolic__insulin_spike: bmi([25, 60]) + (s.dietCraving ? 15 : 0) + (s.poorSleep ? 5 : 0) + (s.deliveryFoodHigh ? 10 : 0),
    weight_metabolic__cortisol_binge: bmi([22, 27]) + (s.stressHigh ? 15 : 0) + (s.poorSleep ? 10 : 0),
    weight_metabolic__weak_lean_obese: bmi([18.5, 21.5]) + (s.fatigueHigh ? 12 : 0) + (s.irisAvgLow ? 8 : 0),
    weight_metabolic__gut_imbalance: bmi([23, 27]) + (s.giHigh ? 18 : 0) + (s.skinTrouble ? 6 : 0) + (s.deliveryFoodHigh ? 8 : 0),
    weight_metabolic__thyroid_slow: bmi([25, 60]) + (s.thyroidAlert ? 20 : 0) + (s.thyroidZoneLow ? 15 : 0),
  }),
  male_wellness: (bmi, s) => ({
    male_wellness__adrenal_cortisol: bmi([18.5, 21]) + (s.stressHigh ? 15 : 0) + (s.maleActivityLow ? 10 : 0),
    male_wellness__insulin_visceral: bmi([24.5, 60]) + (s.dietCraving ? 12 : 0),
    male_wellness__digestion_weak: bmi([10, 18.5]) + (s.giHigh ? 12 : 0) + (s.irisAvgLow ? 8 : 0),
    male_wellness__pelvic_lymph: bmi([22, 26]) + (s.maleProstate ? 20 : 0) + (s.coldness ? 5 : 0),
    male_wellness__liver_overload: bmi([23, 26]) + (s.skinTrouble ? 10 : 0) + (s.fatigueHigh ? 8 : 0) + (s.deliveryFoodHigh ? 15 : 0),
    male_wellness__circadian_broken: bmi(null) + (s.poorSleep ? 20 : 0) + (s.maleActivityLow ? 8 : 0),
  }),
  posture_correction: (bmi, s) => ({
    posture_correction__cervical_lymph: bmi(null) + (s.postureHigh ? 25 : 0),
    posture_correction__swayback: bmi(null) + (s.postureHigh ? 15 : 0) + (s.fatigueHigh ? 5 : 0),
    posture_correction__pelvic_vein: bmi(null) + (s.postureHigh ? 12 : 0) + (s.coldness ? 5 : 0),
    posture_correction__fascia_tight: bmi(null) + (s.stressHigh ? 20 : 0) + (s.ansLow ? 8 : 0),
    posture_correction__lumbar_visceral: bmi([25, 60]) + (s.dietCraving ? 10 : 0),
    posture_correction__weak_core: bmi([10, 18.5]) + (s.fatigueHigh ? 10 : 0) + (s.irisAvgLow ? 8 : 0),
  }),
  gut_detox: (bmi, s) => ({
    gut_detox__toxin_stuck: bmi([24, 60]) + (s.giHigh ? 20 : 0) + (s.skinTrouble ? 5 : 0) + (s.deliveryFoodHigh ? 10 : 0),
    gut_detox__nervous_ibs: bmi([18.5, 21.5]) + (s.giHigh ? 12 : 0) + (s.stressHigh ? 15 : 0),
    gut_detox__low_stomach_acid: bmi([10, 18.5]) + (s.giHigh ? 10 : 0),
    gut_detox__leaky_gut: bmi([21, 25]) + (s.giHigh ? 10 : 0) + (s.skinTrouble ? 12 : 0) + (s.deliveryFoodHigh ? 10 : 0),
    gut_detox__cold_abdomen: bmi([22, 25]) + (s.coldness ? 20 : 0),
    gut_detox__sibo_gas: bmi(null) + (s.giHigh ? 25 : 0),
  }),
  mental_brain: (bmi, s) => ({
    mental_brain__sympathetic_tense: bmi([18.5, 22.9]) + (s.stressHigh ? 15 : 0) + (s.poorSleep ? 15 : 0),
    mental_brain__adrenal_burnout: bmi(null) + (s.fatigueHigh ? 20 : 0) + (s.lowHRV ? 10 : 0),
    mental_brain__brain_fog: bmi(null) + (s.postureHigh ? 22 : 0) + (s.memoryFog ? 10 : 0),
    mental_brain__gut_brain_toxin: bmi([23, 60]) + (s.giHigh ? 18 : 0) + (s.deliveryFoodHigh ? 10 : 0),
    mental_brain__serotonin_deficiency: bmi([10, 18.5]) + (s.fatigueHigh ? 10 : 0) + (s.dietCraving ? 8 : 0) + (s.irisAvgLow ? 8 : 0),
    mental_brain__circadian_broken: bmi(null) + (s.poorSleep ? 25 : 0),
  }),
  hormone_female: (bmi, s) => ({
    hormone_female__cold_stasis: bmi([22, 25]) + (s.coldness ? 15 : 0) + (s.highPeriodPain ? 15 : 0),
    hormone_female__pms_explosive: bmi([18.5, 22.9]) + (s.stressHigh ? 12 : 0) + (s.irregularCycle ? 8 : 0),
    hormone_female__estrogen_dominance: bmi([24, 60]) + (s.irregularCycle ? 18 : 0) + (s.skinTrouble ? 6 : 0) + (s.deliveryFoodHigh ? 10 : 0),
    hormone_female__implantation_weak: bmi([10, 18.5]) + (s.fertilityLong ? 15 : 0) + (s.lowBasalTemp ? 10 : 0) + (s.irisAvgLow ? 8 : 0),
    hormone_female__gut_uterus_axis: bmi([21, 25]) + (s.giHigh ? 15 : 0) + (s.highPeriodPain ? 8 : 0),
    hormone_female__pelvic_congestion: bmi(null) + (s.postureHigh ? 15 : 0) + (s.highPeriodPain ? 10 : 0),
  }),
  disease_postcare: (bmi, s) => ({
    disease_postcare__cold_blood_stasis: bmi([22, 25]) + (s.coldness ? 15 : 0) + (s.fibroidRisk ? 15 : 0),
    disease_postcare__immune_cold: bmi([18.5, 21]) + (s.fatigueHigh ? 18 : 0) + (s.coldness ? 8 : 0) + (s.irisAvgLow ? 10 : 0),
    disease_postcare__liver_overload: bmi([24.5, 60]) + (s.fatigueHigh ? 12 : 0) + (s.deliveryFoodHigh ? 12 : 0),
    disease_postcare__prediabetes: bmi([25, 60]) + (s.dietCraving ? 12 : 0),
    disease_postcare__hypertension_risk: bmi([22, 26]) + (s.stressHigh ? 15 : 0) + (s.palpitation ? 10 : 0),
    disease_postcare__spine_surgery: bmi(null) + (s.postureHigh ? 20 : 0),
  }),
  skin_beauty: (bmi, s) => ({
    skin_beauty__gut_skin_axis: bmi([22, 26]) + (s.giHigh ? 15 : 0) + (s.skinTrouble ? 15 : 0) + (s.deliveryFoodHigh ? 8 : 0) + (s.skinZoneLow ? 8 : 0),
    skin_beauty__insulin_sebum: bmi([24, 60]) + (s.dietCraving ? 12 : 0) + (s.skinTrouble ? 10 : 0) + (s.deliveryFoodHigh ? 8 : 0) + (s.skinZoneLow ? 8 : 0),
    skin_beauty__barrier_dry: bmi([18.5, 21.5]) + (s.stressHigh ? 15 : 0) + (s.skinZoneLow ? 10 : 0),
    skin_beauty__estrogen_low_elasticity: bmi([20, 25]) + (s.skinBeforePeriod ? 20 : 0) + (s.skinZoneLow ? 8 : 0),
    skin_beauty__upper_heat: bmi([22, 25]) + (s.coldness ? 12 : 0) + (s.skinTrouble ? 8 : 0) + (s.skinZoneLow ? 6 : 0),
    skin_beauty__weak_dermis: bmi([10, 18.5]) + (s.fatigueHigh ? 10 : 0) + (s.irisAvgLow ? 8 : 0) + (s.skinZoneLow ? 8 : 0),
  }),
  musculoskeletal_lymph: (bmi, s) => ({
    musculoskeletal_lymph__leg_edema: bmi([22, 25]) + (s.coldness ? 15 : 0),
    musculoskeletal_lymph__trapezius_tension: bmi(null) + (s.postureHigh ? 25 : 0),
    musculoskeletal_lymph__pelvic_asymmetry: bmi(null) + (s.postureHigh ? 15 : 0),
    musculoskeletal_lymph__muscle_rigid: bmi([18.5, 22.9]) + (s.stressHigh ? 18 : 0),
    musculoskeletal_lymph__insulin_joint: bmi([25, 60]) + (s.jointStiff ? 18 : 0) + (s.dietCraving ? 6 : 0) + (s.deliveryFoodHigh ? 8 : 0),
    musculoskeletal_lymph__weak_bone_density: bmi([10, 18.5]) + (s.lowVitaminD ? 10 : 0) + (s.irisAvgLow ? 8 : 0),
  }),
  organ_monitoring: (bmi, s) => ({
    organ_monitoring__thyroid_slow: bmi([24, 60]) + (s.thyroidAlert ? 25 : 0) + (s.thyroidZoneLow ? 15 : 0),
    organ_monitoring__pelvic_organ: bmi([22, 25]) + (s.coldness ? 15 : 0) + (s.fibroidRisk ? 12 : 0),
    organ_monitoring__liver_detox: bmi([24, 60]) + (s.fatigueHigh ? 12 : 0) + (s.deliveryFoodHigh ? 15 : 0),
    organ_monitoring__pancreas_stress: bmi([25, 60]) + (s.dietCraving ? 12 : 0) + (s.deliveryFoodHigh ? 8 : 0),
    organ_monitoring__cardiovascular: bmi([22, 26]) + (s.stressHigh ? 15 : 0) + (s.palpitation ? 12 : 0),
    organ_monitoring__immune_weak: bmi([10, 18.5]) + (s.fatigueHigh ? 15 : 0) + (s.irisAvgLow ? 10 : 0),
  }),
  senior_wellness: (bmi, s) => ({
    senior_wellness__joint_arthritis: bmi([24.5, 60]) + (s.jointStiff ? 20 : 0),
    senior_wellness__sarcopenia: bmi([10, 18.5]) + (s.jointStiff ? 8 : 0) + (s.fatigueHigh ? 10 : 0) + (s.irisAvgLow ? 8 : 0),
    senior_wellness__metabolic_complex: bmi([25, 60]) + (s.palpitation ? 10 : 0) + (s.deliveryFoodHigh ? 10 : 0),
    senior_wellness__brain_circulation: bmi(null) + (s.memoryFog ? 20 : 0) + (s.poorSleep ? 10 : 0),
    senior_wellness__spinal_stenosis: bmi(null) + (s.postureHigh ? 18 : 0) + (s.jointStiff ? 8 : 0),
    senior_wellness__constipation: bmi([23, 26]) + (s.giHigh ? 20 : 0),
  }),
}

/** 주어진 케어카드의 세부 체질을 진단 신호로 분류해요. 지원하지 않는 카드(예: 탈모)는 null. */
export function classifyCareSubtype(
  careCaseId: CareCaseId,
  data: MultimodalData,
  profile: OnboardingProfile,
  overrides?: SignalOverrides,
): CareSubtypeClassification | null {
  const scorer = careCaseId === 'hair_scalp' ? HAIR_SCORER : SCORERS[careCaseId]
  if (!scorer) return null
  const signals = commonSignals(data, profile, overrides)
  const bmiFn = (range: [number, number] | null) => bmiScore(signals.bmi, range)
  const scores = scorer(bmiFn, signals)
  return finalize(scores)
}

// ── 증상 우선 · 카드 전체 교차 진단 ──────────────────────────────────────────
//
// "지금 뭐가 불편하세요?" 흐름에서 써요. 사용자가 선택한 케어카드와 무관하게
// 12개 카드 × 6유형(72개) 전체를 같은 신호 체계로 한 번에 채점해서, 가장 점수가
// 높은 것을 전체 1순위로 돌려줘요. 증상 칩으로 고른 신호가 최우선 반영돼요.

export interface GlobalSubtypeMatch {
  careCaseId: CareCaseId
  subtypeId: string
  score: number
  percent: number
}

const ALL_SCORE_CARDS: CareCaseId[] = ['hair_scalp', ...(Object.keys(SCORERS) as CareCaseId[])]

export function classifyAcrossAllCards(
  data: MultimodalData,
  profile: OnboardingProfile,
  overrides?: SignalOverrides,
): { primary: GlobalSubtypeMatch; matches: GlobalSubtypeMatch[] } {
  const signals = commonSignals(data, profile, overrides)
  const bmiFn = (range: [number, number] | null) => bmiScore(signals.bmi, range)

  const all: { careCaseId: CareCaseId; subtypeId: string; score: number }[] = []
  for (const careCaseId of ALL_SCORE_CARDS) {
    const scorer = careCaseId === 'hair_scalp' ? HAIR_SCORER : SCORERS[careCaseId]!
    const scores = scorer(bmiFn, signals)
    for (const [subtypeId, score] of Object.entries(scores)) {
      all.push({ careCaseId, subtypeId, score })
    }
  }

  const total = all.reduce((sum, m) => sum + m.score, 0) || 1
  const withPercent = all
    .map(m => ({ ...m, percent: Math.round((m.score / total) * 100) }))
    .sort((a, b) => b.score - a.score)

  return { primary: withPercent[0], matches: withPercent.slice(0, 8) }
}
