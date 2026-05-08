type Answer = string | string[] | number

export type ScoreTier = 'keep_going' | 'need_care' | 'warning'

export interface DiscomfortResult {
  total: number
  raw: number
  maxPossible: number
  tier: ScoreTier
  breakdown: Record<string, number>
}

const RADIO_SCORES: Record<string, Record<string, number>> = {
  common_cycle:         { '규칙적이에요': 0,       '가끔 불규칙해요': 5,       '많이 불규칙해요': 10 },
  common_fatigue:       { '자주 그래요': 10,        '가끔 그래요': 5,           '별로 없어요': 0 },
  common_sleep:         { '자주 그래요': 10,        '가끔 그래요': 5,           '잘 자는 편이에요': 0 },
  period_coldness:      { '자주 그래요': 10,        '가끔 그래요': 5,           '거의 없어요': 0 },
  skin_cycle_acne:      { '네, 주기적으로 나요': 10, '가끔 그런 것 같아요': 5,  '별로 없어요': 0 },
  thyroid_checkup:      { '네, 있어요': 10,         '없어요': 0,                '검진을 안 했어요': 5 },
  thyroid_swelling:     { '자주 그래요': 10,        '가끔 그래요': 5,           '없어요': 0 },
  fertility_duration:   { '6개월 미만': 2,          '6개월~1년': 5,             '1년 이상': 10, '아직 계획 중': 0 },
  fertility_basal_temp: { '네, 낮은 편이에요': 10,  '잘 모르겠어요': 5,         '아니요': 0 },
  fibroid_family:       { '네, 있어요': 10,         '없어요': 0,                '잘 모르겠어요': 5 },
  fibroid_bleeding:     { '네, 있어요': 10,         '한 번 있었어요': 5,        '없어요': 0 },
  diet_craving:         { '자주 그래요': 10,        '가끔 그래요': 5,           '별로 없어요': 0 },
  stress_sleep:         { '자주 그래요': 10,        '가끔 그래요': 5,           '잘 자는 편이에요': 0 },
  stress_palpitation:   { '자주 그래요': 10,        '가끔 그래요': 5,           '없어요': 0 },
  osteo_joint:          { '자주 그래요': 10,        '가끔 그래요': 5,           '없어요': 0 },
  osteo_vitamin_d:      { '규칙적으로 해요': 0,     '가끔 해요': 5,             '거의 못 해요': 10 },
  hair_thinning:        { '네, 느껴요': 10,         '조금 그런 것 같아요': 5,   '아니요': 0 },
  hair_loss:            { '많이 늘었어요': 10,      '조금 늘었어요': 5,         '비슷해요': 0 },
}

// 의학적 위험 신호 → 점수 2배
const HIGH_WEIGHT_IDS = new Set(['thyroid_checkup', 'fibroid_bleeding'])

// 멀티셀렉트: 선택 항목 수 × 3점 (최대 10점)
const MULTISELECT_IDS = new Set(['skin_timing', 'diet_stubborn'])

function getRawScore(id: string, answer: Answer): number {
  if (id === 'period_pain_level') {
    return typeof answer === 'number' ? answer : 0
  }
  if (MULTISELECT_IDS.has(id)) {
    return Array.isArray(answer) ? Math.min(answer.length * 3, 10) : 0
  }
  const map = RADIO_SCORES[id]
  if (map && typeof answer === 'string') return map[answer] ?? 0
  return 0
}

export function computeDiscomfortScore(answers: Record<string, Answer>): DiscomfortResult {
  const breakdown: Record<string, number> = {}
  let raw = 0
  let maxPossible = 0

  for (const [id, answer] of Object.entries(answers)) {
    if (answer === null || answer === undefined) continue
    const baseScore = getRawScore(id, answer)
    const weight = HIGH_WEIGHT_IDS.has(id) ? 2 : 1
    breakdown[id] = baseScore * weight
    raw += baseScore * weight
    maxPossible += 10 * weight
  }

  const total = maxPossible > 0 ? Math.round((raw / maxPossible) * 100) : 0

  let tier: ScoreTier
  if (total <= 30) tier = 'keep_going'
  else if (total <= 70) tier = 'need_care'
  else tier = 'warning'

  return { total, raw, maxPossible, tier, breakdown }
}

export const TIER_CONFIG: Record<ScoreTier, {
  label: string
  description: string
  message: string
  color: string
  bg: string
}> = {
  keep_going: {
    label: 'Keep Going! 💚',
    description: '건강한 리듬을 잘 유지하고 있어요',
    message: '현재 아주 좋은 리듬이에요! 지금처럼 관리해 보세요.',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
  },
  need_care: {
    label: 'Need Care 💛',
    description: '집중 관리가 필요한 상태예요',
    message: '불균형이 시작되거나 특정 주기에 불편함이 있어요. 루디아가 함께 관리해 드릴게요.',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
  },
  warning: {
    label: 'Warning ⚠️',
    description: '전문적인 대응이 필요할 수 있어요',
    message: '일상생활에 지장이 있거나 의학적 확인이 필요한 징후가 보여요. 전문 의료진과 상담을 권장드려요.',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
  },
}

export const SCORE_KEY = 'ludia_score_v1'
