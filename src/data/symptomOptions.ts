import type { SignalOverrides } from '@/lib/careSubtypeClassifier'

// ── "지금 뭐가 불편하세요?" 증상 체크리스트 ───────────────────────────────────
//
// 케어카드 선택과 무관하게, 증상만 골라도 72개 세부 체질 전체를 교차 진단할 수
// 있도록 각 증상을 진단 엔진의 신호(SignalOverrides)에 직접 연결해요.

export interface SymptomOption {
  id: string
  label: string
  emoji: string
  overrides: SignalOverrides
}

export const SYMPTOM_OPTIONS: SymptomOption[] = [
  { id: 'fatigue', label: '이유 없이 쉽게 피곤해요', emoji: '😴', overrides: { fatigueHigh: true } },
  { id: 'gut_bloating', label: '소화가 안 되고 더부룩해요', emoji: '🤢', overrides: { giHigh: true } },
  { id: 'irregular_bowel', label: '변비나 잦은 설사가 있어요', emoji: '🚽', overrides: { giHigh: true } },
  { id: 'poor_sleep', label: '잠들기 어렵거나 자주 깨요', emoji: '🌙', overrides: { poorSleep: true } },
  { id: 'cold_body', label: '손발이나 아랫배가 차가워요', emoji: '🥶', overrides: { coldness: true } },
  { id: 'edema', label: '얼굴이나 다리가 잘 부어요', emoji: '💧', overrides: { coldness: true, ansLow: true } },
  { id: 'stress', label: '스트레스가 심하고 예민해요', emoji: '😣', overrides: { stressHigh: true } },
  { id: 'palpitation', label: '가슴이 두근거리거나 답답해요', emoji: '💓', overrides: { palpitation: true } },
  { id: 'joint_pain', label: '무릎·관절이 뻣뻣하거나 아파요', emoji: '🦵', overrides: { jointStiff: true } },
  { id: 'neck_shoulder', label: '목·어깨가 항상 뻐근해요', emoji: '🦒', overrides: { postureHigh: true } },
  { id: 'skin_trouble', label: '피부 트러블이 반복돼요', emoji: '🌋', overrides: { skinTrouble: true } },
  { id: 'craving', label: '단 음식·자극적인 음식이 당겨요', emoji: '🍩', overrides: { dietCraving: true } },
  { id: 'hair_loss', label: '머리가 가늘어지거나 잘 빠져요', emoji: '✂️', overrides: { hairThin: true } },
  { id: 'period_pain', label: '생리통이 심해요', emoji: '🩸', overrides: { highPeriodPain: true } },
  { id: 'irregular_cycle', label: '생리 주기가 불규칙해요', emoji: '📅', overrides: { irregularCycle: true } },
  { id: 'low_male_energy', label: '근력·활력이 예전 같지 않아요', emoji: '💪', overrides: { maleActivityLow: true } },
  { id: 'memory_fog', label: '머리가 멍하고 집중이 안돼요', emoji: '🌫️', overrides: { memoryFog: true } },
  { id: 'thyroid_concern', label: '검진에서 갑상선 등 주의 소견을 들었어요', emoji: '🦋', overrides: { thyroidAlert: true } },
  { id: 'fertility_concern', label: '임신 준비 중인데 잘 안돼요', emoji: '🍃', overrides: { fertilityLong: true, lowBasalTemp: true } },
  { id: 'low_hrv', label: '가슴 두근거림·불규칙한 맥박이 느껴져요', emoji: '📉', overrides: { lowHRV: true, palpitation: true } },
]
