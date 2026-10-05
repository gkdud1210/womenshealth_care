/**
 * 첫 로그인 "요즘 뭐가 불편하세요?" 문진 → 케어카드 자동 추천
 *
 * 각 답변 보기에 케어카드별 가중치를 매겨 점수를 합산하고, 점수가 높은 카드를
 * 자동으로 선택해요. 사용자는 온보딩 화면이나 설정 > 케어 카드 재선택에서 언제든 수정할 수 있고,
 * 선택된 케어카드(user.careTypes)는 루디아피드·루디아 모임의 추천 순서에 그대로 쓰여요.
 */

import { CARE_CASES, type CareCaseId } from '@/data/careCases'
import type { MeetupCategory } from '@/data/meetupData'

type Weights = Partial<Record<CareCaseId, number>>

export interface IntakeOption {
  id: string
  label: string
  emoji: string
  weights: Weights
}

export interface IntakeStep {
  id: 'symptoms' | 'goals' | 'situation'
  title: string
  subtitle: string
  options: IntakeOption[]
}

// 증상 보기 id는 src/data/symptomOptions.ts와 맞춰서, 루디아 호출의
// "지금 뭐가 불편하세요?" 진단 시트에서 온보딩 답변을 미리 체크해 둘 수 있게 해요.
export const INTAKE_STEPS: IntakeStep[] = [
  {
    id: 'symptoms',
    title: '요즘 몸에서 불편한 게 있나요?',
    subtitle: '해당하는 걸 모두 골라주세요. 사소한 것도 괜찮아요.',
    options: [
      { id: 'fatigue',         emoji: '😴', label: '이유 없이 쉽게 피곤해요',        weights: { mental_brain: 2, weight_metabolic: 1, organ_monitoring: 1 } },
      { id: 'gut_bloating',    emoji: '🤢', label: '소화가 안 되고 더부룩해요',      weights: { gut_detox: 3, skin_beauty: 1 } },
      { id: 'irregular_bowel', emoji: '🚽', label: '변비나 잦은 설사가 있어요',      weights: { gut_detox: 3 } },
      { id: 'poor_sleep',      emoji: '🌙', label: '잠들기 어렵거나 자주 깨요',      weights: { mental_brain: 3, hormone_female: 1 } },
      { id: 'stress',          emoji: '😣', label: '스트레스가 심하고 예민해요',     weights: { mental_brain: 3, hormone_female: 1 } },
      { id: 'memory_fog',      emoji: '🌫️', label: '머리가 멍하고 집중이 안돼요',   weights: { mental_brain: 3, senior_wellness: 1 } },
      { id: 'period_pain',     emoji: '🩸', label: '생리통·PMS가 심해요',           weights: { hormone_female: 3 } },
      { id: 'irregular_cycle', emoji: '📅', label: '생리 주기가 불규칙해요',         weights: { hormone_female: 3, organ_monitoring: 1 } },
      { id: 'cold_body',       emoji: '🥶', label: '손발이나 아랫배가 차가워요',     weights: { hormone_female: 2, musculoskeletal_lymph: 1 } },
      { id: 'edema',           emoji: '💧', label: '얼굴이나 다리가 잘 부어요',      weights: { musculoskeletal_lymph: 3, weight_metabolic: 1 } },
      { id: 'neck_shoulder',   emoji: '🦒', label: '목·어깨가 항상 뻐근해요',        weights: { posture_correction: 3, musculoskeletal_lymph: 1 } },
      { id: 'joint_pain',      emoji: '🦵', label: '무릎·허리·관절이 아파요',        weights: { senior_wellness: 2, musculoskeletal_lymph: 2, posture_correction: 1 } },
      { id: 'skin_trouble',    emoji: '🌋', label: '피부 트러블이 반복돼요',         weights: { skin_beauty: 3, gut_detox: 1, hormone_female: 1 } },
      { id: 'hair_loss',       emoji: '✂️', label: '머리가 가늘어지거나 잘 빠져요',  weights: { hair_scalp: 4 } },
      { id: 'craving',         emoji: '🍩', label: '단 음식·야식이 자꾸 당겨요',     weights: { weight_metabolic: 3 } },
      { id: 'palpitation',     emoji: '💓', label: '가슴이 두근거리거나 답답해요',   weights: { mental_brain: 2, organ_monitoring: 2 } },
    ],
  },
  {
    id: 'goals',
    title: '루디아와 함께 어떤 변화를 만들고 싶나요?',
    subtitle: '가장 바라는 걸 골라주세요.',
    options: [
      { id: 'goal_weight',  emoji: '⚖️', label: '체중 감량·붓기 빼기',      weights: { weight_metabolic: 3, musculoskeletal_lymph: 1 } },
      { id: 'goal_muscle',  emoji: '💪', label: '근력·체력 키우기',          weights: { male_wellness: 2, senior_wellness: 1, weight_metabolic: 1 } },
      { id: 'goal_posture', emoji: '🧍', label: '바른 자세·체형 만들기',     weights: { posture_correction: 3 } },
      { id: 'goal_skin',    emoji: '✨', label: '맑은 피부',                weights: { skin_beauty: 3 } },
      { id: 'goal_hair',    emoji: '💇', label: '풍성한 모발·두피 건강',     weights: { hair_scalp: 3 } },
      { id: 'goal_mind',    emoji: '🧘', label: '마음 안정·숙면',            weights: { mental_brain: 3 } },
      { id: 'goal_gut',     emoji: '🌿', label: '편안한 장·디톡스',          weights: { gut_detox: 3 } },
      { id: 'goal_hormone', emoji: '🌸', label: '편안한 생리·호르몬 균형',   weights: { hormone_female: 3 } },
      { id: 'goal_checkup', emoji: '🩺', label: '몸의 이상 신호 미리 알기',  weights: { organ_monitoring: 3 } },
    ],
  },
  {
    id: 'situation',
    title: '나에게 해당하는 게 있나요?',
    subtitle: '없으면 건너뛰어도 괜찮아요.',
    options: [
      { id: 'sit_senior',    emoji: '🌳', label: '50대 이상이에요',                    weights: { senior_wellness: 4 } },
      { id: 'sit_male',      emoji: '🙋‍♂️', label: '남성이에요',                         weights: { male_wellness: 4 } },
      { id: 'sit_recovery',  emoji: '🏥', label: '질환 치료 후 회복 중이에요',          weights: { disease_postcare: 4 } },
      { id: 'sit_diagnosed', emoji: '📋', label: '근종·물혹·갑상선 등 소견을 들었어요', weights: { disease_postcare: 2, organ_monitoring: 3 } },
      { id: 'sit_fertility', emoji: '🍃', label: '임신을 준비 중이에요',                weights: { hormone_female: 3, organ_monitoring: 1 } },
      { id: 'sit_desk',      emoji: '💻', label: '하루 대부분 앉아서 일해요',           weights: { posture_correction: 2, musculoskeletal_lymph: 1 } },
      { id: 'sit_delivery',  emoji: '🛵', label: '배달·외식을 자주 해요',               weights: { gut_detox: 2, weight_metabolic: 1 } },
    ],
  },
]

const OPTION_BY_ID: Record<string, IntakeOption> = Object.fromEntries(
  INTAKE_STEPS.flatMap(s => s.options).map(o => [o.id, o]),
)

export interface CareRecommendation {
  id: CareCaseId
  score: number
  /** 이 카드를 추천하게 만든 답변 라벨 (점수 높은 순) */
  reasons: string[]
}

const MAX_AUTO_SELECT = 3

/** 문진 답변(보기 id 목록)으로 케어카드 점수를 매겨 추천 순으로 돌려줘요. */
export function scoreCareCards(answerIds: string[]): CareRecommendation[] {
  const acc = new Map<CareCaseId, { score: number; reasons: { label: string; w: number }[] }>()
  for (const id of answerIds) {
    const opt = OPTION_BY_ID[id]
    if (!opt) continue
    for (const [card, w] of Object.entries(opt.weights) as [CareCaseId, number][]) {
      const cur = acc.get(card) ?? { score: 0, reasons: [] }
      cur.score += w
      cur.reasons.push({ label: opt.label, w })
      acc.set(card, cur)
    }
  }
  return Array.from(acc.entries())
    .map(([id, v]) => ({
      id, score: v.score,
      reasons: v.reasons.sort((a, b) => b.w - a.w).map(r => r.label),
    }))
    .sort((a, b) => b.score - a.score || CARE_ORDER[a.id] - CARE_ORDER[b.id])
}

const CARE_ORDER = Object.fromEntries(CARE_CASES.map((c, i) => [c.id, i])) as Record<CareCaseId, number>

/** 자동 선택할 카드: 1등 점수의 1/3 이상이면서 3점 이상인 카드를 최대 3개까지. */
export function autoSelectCareCards(recs: CareRecommendation[]): CareCaseId[] {
  if (recs.length === 0) return []
  const top = recs[0].score
  const picked = recs.filter(r => r.score >= 3 && r.score >= top / 3).slice(0, MAX_AUTO_SELECT)
  return (picked.length ? picked : recs.slice(0, 1)).map(r => r.id)
}

// ── 저장 (루디아 호출 증상 진단 시트 사전 체크용) ─────────────────────────────

export const INTAKE_KEY = 'ludia_intake_v1'

export function saveIntake(answerIds: string[]) {
  try { localStorage.setItem(INTAKE_KEY, JSON.stringify(answerIds)) } catch {}
}

export function loadIntake(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const v = JSON.parse(localStorage.getItem(INTAKE_KEY) || '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

// ── 케어카드 → 루디아 모임 종목 추천 ────────────────────────────────────────

export const CARE_MEETUP_CATEGORIES: Record<CareCaseId, MeetupCategory[]> = {
  hair_scalp:            ['walking', 'mind', 'cooking'],
  weight_metabolic:      ['running', 'gym', 'dance', 'cooking'],
  male_wellness:         ['gym', 'climbing', 'running', 'golf'],
  posture_correction:    ['yoga', 'swimming', 'climbing'],
  gut_detox:             ['cooking', 'walking', 'yoga'],
  mental_brain:          ['mind', 'yoga', 'study', 'walking'],
  hormone_female:        ['yoga', 'walking', 'mind', 'cooking'],
  disease_postcare:      ['walking', 'mind', 'cooking'],
  skin_beauty:           ['yoga', 'cooking', 'swimming'],
  musculoskeletal_lymph: ['swimming', 'yoga', 'walking', 'cycling'],
  organ_monitoring:      ['walking', 'study', 'hiking'],
  senior_wellness:       ['walking', 'swimming', 'golf', 'hiking'],
}

/** 선택된 케어카드 순서를 존중해 추천 모임 종목을 중복 없이 모아요. */
export function recommendedMeetupCategories(careTypes: string[]): MeetupCategory[] {
  const out: MeetupCategory[] = []
  for (const id of careTypes) {
    for (const c of CARE_MEETUP_CATEGORIES[id as CareCaseId] ?? []) {
      if (!out.includes(c)) out.push(c)
    }
  }
  return out
}

// ── 루디아에게 물어보기 — 내 케어카드·증상 맞춤 질문 예시 ─────────────────────

const CARE_ASK_EXAMPLES: Record<CareCaseId, string[]> = {
  hair_scalp:            ['머리가 자꾸 빠져', '두피에 열이 올라와', '탈모에 좋은 음식 알려줘', '두피가 가려워', '머리카락이 가늘어졌어', '샴푸 어떻게 해야 해?'],
  weight_metabolic:      ['야식이 자꾸 당겨', '살이 안 빠지는 이유가 뭘까?', '다이어트 식단 추천해줘', '단 게 너무 먹고 싶어', '식욕이 폭발해', '공복 운동 괜찮아?'],
  male_wellness:         ['근력 키우려면 뭘 먹어?', '요즘 활력이 떨어졌어', '단백질 얼마나 먹어야 해?', '벌크업 운동 추천해줘', '아침에 개운하지 않아'],
  posture_correction:    ['목·어깨가 뻐근해', '거북목 스트레칭 알려줘', '골반이 틀어진 것 같아', '허리가 아파', '오래 앉아 있으면 힘들어'],
  gut_detox:             ['배가 자주 더부룩해', '변비에 좋은 음식 알려줘', '배가 자주 아파', '가스가 자주 차', '유산균 먹어야 해?', '소화가 안 돼'],
  mental_brain:          ['스트레스가 너무 심해', '잠을 잘 못 자', '밤에 자꾸 깨', '집중이 안 돼', '요즘 예민해진 것 같아', '불안감이 심해'],
  hormone_female:        ['생리통이 심해', '다음 생리 언제야?', 'PMS 때 뭘 먹으면 좋아?', '배란일은 언제야?', '생리 주기가 불규칙해', '아랫배가 차가워'],
  disease_postcare:      ['면역 높이는 식단 알려줘', '근종에 안 좋은 음식은?', '회복기에 운동해도 돼?', '기력이 없어', '간에 좋은 음식 알려줘'],
  skin_beauty:           ['피부 트러블이 심해', '얼굴이 푸석해', '피부가 건조해', '얼굴이 자주 붉어져', '턱 여드름이 나', '피부에 좋은 음식 알려줘'],
  musculoskeletal_lymph: ['다리가 잘 부어', '몸이 뻣뻣해', '부종 빼는 방법 알려줘', '종아리가 저려', '림프 마사지 어떻게 해?'],
  organ_monitoring:      ['갑상선 이상 신호가 뭐야?', '정기 검진 언제 받아야 해?', '기초체온이 낮아', '가슴이 두근거려', '오늘 컨디션 어때?'],
  senior_wellness:       ['무릎이 아픈데 운동해도 돼?', '근감소 막으려면 뭘 먹어?', '어떤 운동이 좋을까?', '혈압 관리 어떻게 해?', '기억력이 떨어졌어'],
}

const SYMPTOM_ASK_EXAMPLES: Record<string, string> = {
  fatigue: '요즘 너무 피곤해', gut_bloating: '소화가 안 돼', irregular_bowel: '변비가 심해',
  poor_sleep: '밤에 자꾸 깨', stress: '스트레스가 너무 심해', memory_fog: '집중이 안 돼',
  period_pain: '생리통이 심해', irregular_cycle: '생리 주기가 불규칙해', cold_body: '손발이 너무 차가워',
  edema: '부종이 있어', neck_shoulder: '목이랑 어깨가 뻐근해', joint_pain: '허리가 아파',
  skin_trouble: '피부 트러블이 심해', hair_loss: '머리가 많이 빠져', craving: '단 게 자꾸 당겨',
  palpitation: '가슴이 두근거려',
}

/** 내 케어카드·온보딩 증상과 관련된 질문 추천 목록 (관련도 높은 순, 중복 없음).
 *  온보딩 증상 → 케어카드별 질문을 번갈아 담아서 한 카드에 치우치지 않게 해요. */
export function personalSuggestionPool(careTypes: string[], intakeIds: string[]): string[] {
  const out: string[] = []
  const push = (q?: string) => { if (q && !out.includes(q)) out.push(q) }
  intakeIds.forEach(id => push(SYMPTOM_ASK_EXAMPLES[id]))
  const lists = careTypes.map(id => CARE_ASK_EXAMPLES[id as CareCaseId] ?? [])
  const maxLen = Math.max(0, ...lists.map(l => l.length))
  for (let i = 0; i < maxLen; i++) lists.forEach(l => push(l[i]))
  return out
}
