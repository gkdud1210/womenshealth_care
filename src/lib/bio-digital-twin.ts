/**
 * Bio-Digital Twin Controller
 * TKM(Traditional Korean Medicine) + Western biometric fusion
 *
 * TKM 오장(五臟) 이론을 바탕으로 홍채·BMI·HRV·EDA 4가지 생체 데이터를
 * 통합하여 각 장기의 종합 건강 상태를 산출합니다.
 */

import type { OrganKey } from './tkm-scoring'

/* ── Input types ──────────────────────────────────────────────── */

/**
 * 홍채(虹彩) 분석 — 선천 체질(先天體質) 데이터
 * 홍채 각 zone의 점·색소 밀도가 높을수록 해당 장기 취약성이 높음 (0-100)
 */
export interface IrisData {
  heartZone:  number   // 동공 3-4링 — 심(心)장 체질 취약도
  liverZone:  number   // 좌측 4-5링 — 간(肝) 체질 취약도
  spleenZone: number   // 중심 3링   — 비(脾)장 체질 취약도
  lungZone:   number   // 외측 5-6링 — 폐(肺) 체질 취약도
  kidneyZone: number   // 하부 6-7링 — 신(腎)장 체질 취약도
}

export interface BioInputs {
  iris: IrisData    // 홍채: 선천 체질 (불변)
  bmi:  number      // BMI: 체형·토양 품질 (15–40)
  hrv:  number      // 심박 변이도 ms (20–100) — 기(氣) 흐름
  eda:  number      // 피부전도도 μS (0–20) — 화(火)·스트레스 반응
}

/* ── Derived state types ──────────────────────────────────────── */

/** BMI → 토양(土壤) 품질: 장기 에너지의 '성장 환경' */
export type SoilQuality = 'dry' | 'optimal' | 'heavy'

/** EDA → 스트레스 경계 레벨 */
export type AlertLevel = 'calm' | 'moderate' | 'high'

/**
 * 성장 단계 0-4
 * 0: 씨앗  1: 새싹  2: 유묘  3: 성숙  4: 만개(滿開)
 */
export type GrowthStage = 0 | 1 | 2 | 3 | 4

/**
 * 캐릭터 애니메이션 모드
 * float: 기본 부유  sluggish: 무거운/기 부족  vibrate: 스트레스
 * sensitive: 폐 취약(얇은 껍질)  bloom: 충만·활기
 */
export type AnimationMode = 'float' | 'sluggish' | 'vibrate' | 'sensitive' | 'bloom'

export interface OrganBioState {
  organ: OrganKey

  /* 홍채 체질 점수 (선천, 100에서 뺀 값이 높을수록 취약) */
  constitutionScore: number    // 0-100 (높을수록 취약)

  /* 토양 품질 (BMI 파생) */
  soilQuality: SoilQuality
  bmiFactor: number            // 0.82–1.00 성장 효율 보정계수

  /* 활력 점수 (HRV × BMI 보정) */
  vitalityScore: number        // 0-100

  /* EDA 스트레스 */
  alertLevel: AlertLevel
  edaPenalty: number           // 0-15 최종 점수에서 차감

  /* 종합 */
  comprehensiveScore: number   // 0-100
  growthStage: GrowthStage
  animationMode: AnimationMode
}

export interface BioTwinResult {
  organStates: Record<OrganKey, OrganBioState>
  soilQuality: SoilQuality
  alertLevel: AlertLevel
  overallVitality: number   // 0-100 (5개 장기 평균)
}

/* ── Helper functions ─────────────────────────────────────────── */

function getSoilQuality(bmi: number): SoilQuality {
  // TKM: BMI 과잉 → '습담(濕痰)' 축적 → 기 흐름 저해
  // BMI 부족 → '기혈 부족(氣血不足)' → 영양 기반 취약
  if (bmi > 25)   return 'heavy'
  if (bmi < 18.5) return 'dry'
  return 'optimal'
}

function getBmiFactor(sq: SoilQuality): number {
  // heavy: 대사 효율 ↓, 에너지 전달 저항 ↑
  if (sq === 'heavy') return 0.82
  // dry: 영양 저장 ↓, 회복 여력 부족
  if (sq === 'dry')   return 0.88
  return 1.0
}

function normalizeHrv(hrv: number): number {
  // HRV 20ms = 자율신경 불균형, 100ms = 최적 균형
  // TKM 기(氣) 순환 지표로 해석
  return Math.max(0, Math.min(100, ((hrv - 20) / 80) * 100))
}

function getAlertLevel(eda: number): AlertLevel {
  // EDA > 15μS: 교감신경 과활성 → TKM '화(火)' 항진 상태
  // EDA 8-15μS: 중등도 활성화
  if (eda > 15) return 'high'
  if (eda > 8)  return 'moderate'
  return 'calm'
}

function getEdaPenalty(level: AlertLevel): number {
  // 스트레스가 높을수록 장기 기능 억압 → 성장 점수 차감
  if (level === 'high')     return 15
  if (level === 'moderate') return 5
  return 0
}

function getGrowthStage(score: number): GrowthStage {
  if (score >= 80) return 4
  if (score >= 60) return 3
  if (score >= 40) return 2
  if (score >= 20) return 1
  return 0
}

function getIrisZoneScore(iris: IrisData, organ: OrganKey): number {
  const map: Record<OrganKey, number> = {
    heart:  iris.heartZone,
    liver:  iris.liverZone,
    spleen: iris.spleenZone,
    lung:   iris.lungZone,
    kidney: iris.kidneyZone,
  }
  return map[organ]
}

function getAnimationMode(
  soilQuality: SoilQuality,
  vitalityScore: number,
  alertLevel: AlertLevel,
  organ: OrganKey,
  lungIrisScore: number,
): AnimationMode {
  // 무거운 토양 + 낮은 활력 → 무겁고 느린 움직임
  if (soilQuality === 'heavy' && vitalityScore < 40) return 'sluggish'
  // 고(高) EDA → 스트레스 진동 효과
  if (alertLevel === 'high') return 'vibrate'
  // 폐(肺) 취약 홍채 → 얇은 껍질 민감 효과
  if (organ === 'lung' && lungIrisScore > 70) return 'sensitive'
  // 높은 활력 → 만개(滿開) 블룸 효과
  if (vitalityScore >= 80) return 'bloom'
  return 'float'
}

/* ── Main calculation ─────────────────────────────────────────── */

/**
 * calculateComprehensiveHealth
 *
 * Formula:
 *   basePotential     = (100 - irisZoneScore) / 100          [선천 체질 기반]
 *   currentEfficiency = normalizedHrv × bmiFactor             [현재 기 효율]
 *   comprehensiveScore = basePotential×30 + currentEfficiency×70 - edaPenalty
 */
export function calculateComprehensiveHealth(inputs: BioInputs): BioTwinResult {
  const organs: OrganKey[] = ['heart', 'liver', 'spleen', 'lung', 'kidney']

  const soilQuality = getSoilQuality(inputs.bmi)
  const bmiFactor   = getBmiFactor(soilQuality)
  const alertLevel  = getAlertLevel(inputs.eda)
  const edaPenalty  = getEdaPenalty(alertLevel)
  const hrvScore    = normalizeHrv(inputs.hrv)

  const organStates = {} as Record<OrganKey, OrganBioState>

  for (const organ of organs) {
    const irisZoneScore    = getIrisZoneScore(inputs.iris, organ)
    // constitutionScore: 취약도 (높을수록 약함)
    const constitutionScore = irisZoneScore
    // basePotential: 선천 건강 잠재력 (취약도 반전)
    const basePotential     = (100 - irisZoneScore) / 100

    // 현재 에너지 효율 = HRV 정상화 × BMI 보정계수
    const vitalityScore = Math.max(0, Math.min(100, hrvScore * bmiFactor))

    // 종합 점수 = 선천(30%) + 현재 활력(70%) - EDA 스트레스 패널티
    const raw = basePotential * 30 + (vitalityScore / 100) * 70
    const comprehensiveScore = Math.max(0, Math.min(100, raw - edaPenalty))

    const growthStage = getGrowthStage(comprehensiveScore)
    const animationMode = getAnimationMode(
      soilQuality, vitalityScore, alertLevel, organ, inputs.iris.lungZone
    )

    organStates[organ] = {
      organ,
      constitutionScore,
      soilQuality,
      bmiFactor,
      vitalityScore,
      alertLevel,
      edaPenalty,
      comprehensiveScore,
      growthStage,
      animationMode,
    }
  }

  const overallVitality = Math.round(
    organs.reduce((s, o) => s + organStates[o].comprehensiveScore, 0) / organs.length
  )

  return { organStates, soilQuality, alertLevel, overallVitality }
}

/* ── Default / preset values ──────────────────────────────────── */

export const DEFAULT_IRIS: IrisData = {
  heartZone: 30, liverZone: 25, spleenZone: 20, lungZone: 35, kidneyZone: 28,
}

export const PRESETS: Record<string, { label: string; emoji: string; inputs: BioInputs }> = {
  healthy: {
    label: '건강한 날',
    emoji: '✨',
    inputs: { iris: DEFAULT_IRIS, bmi: 22, hrv: 80, eda: 4 },
  },
  stressed: {
    label: '스트레스 많은 날',
    emoji: '😰',
    inputs: { iris: DEFAULT_IRIS, bmi: 22, hrv: 35, eda: 17 },
  },
  exhausted: {
    label: '과로 후',
    emoji: '😴',
    inputs: { iris: DEFAULT_IRIS, bmi: 24, hrv: 28, eda: 14 },
  },
  peak: {
    label: '컨디션 최고',
    emoji: '🌟',
    inputs: { iris: DEFAULT_IRIS, bmi: 21, hrv: 95, eda: 2 },
  },
}

/* ── Soil visual config ───────────────────────────────────────── */
export const SOIL_STYLE: Record<SoilQuality, { color: string; label: string; desc: string }> = {
  optimal: { color: '#5D4037', label: '비옥한 토양',  desc: 'BMI 18.5–25 · 최적 성장 환경' },
  heavy:   { color: '#6D4C41', label: '밀도 높은 토양', desc: 'BMI > 25 · 배수 개선 필요' },
  dry:     { color: '#8D6E63', label: '건조한 토양',  desc: 'BMI < 18.5 · 영양 보충 필요' },
}

/* ── Growth stage config ──────────────────────────────────────── */
export const GROWTH_CONFIG: Record<GrowthStage, {
  label: string; emoji: string; scale: number; brightness: number; soilOverlay: number
}> = {
  0: { label: '씨앗',   emoji: '🌰', scale: 0.50, brightness: 0.65, soilOverlay: 0.70 },
  1: { label: '새싹',   emoji: '🌱', scale: 0.65, brightness: 0.78, soilOverlay: 0.45 },
  2: { label: '유묘',   emoji: '🌿', scale: 0.80, brightness: 0.88, soilOverlay: 0.25 },
  3: { label: '성숙',   emoji: '🌾', scale: 0.92, brightness: 0.96, soilOverlay: 0.08 },
  4: { label: '만개',   emoji: '🌸', scale: 1.00, brightness: 1.10, soilOverlay: 0.00 },
}
