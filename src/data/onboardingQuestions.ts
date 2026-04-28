export interface Question {
  id: string
  cardIds: string[]
  common?: boolean   // true = shown to everyone regardless of card selection
  emoji: string
  category: string
  text: string
  type: 'slider' | 'multiselect' | 'radio'
  options?: string[]
  min?: number
  max?: number
}

export const ALL_QUESTIONS: Question[] = [
  // ── 공통 질문 (모든 사용자에게 표시) ───────────────────────────
  {
    id: 'common_cycle',
    cardIds: [],
    common: true,
    emoji: '🌙', category: '기본 건강',
    text: '평소 생리 주기가 규칙적인 편인가요? 아니면 들쑥날쑥한가요?',
    type: 'radio',
    options: ['규칙적이에요', '가끔 불규칙해요', '많이 불규칙해요'],
  },
  {
    id: 'common_fatigue',
    cardIds: [],
    common: true,
    emoji: '🌙', category: '기본 건강',
    text: '요즘 평소보다 쉽게 피곤하거나 기력이 떨어진다고 느끼시나요?',
    type: 'radio',
    options: ['자주 그래요', '가끔 그래요', '별로 없어요'],
  },
  {
    id: 'common_sleep',
    cardIds: [],
    common: true,
    emoji: '🌙', category: '기본 건강',
    text: '수면의 질이 어떤가요? 자고 나도 개운하지 않은 편인가요?',
    type: 'radio',
    options: ['자주 그래요', '가끔 그래요', '잘 자는 편이에요'],
  },

  // ── 🩸 건강한 생리주기 / 생리통 관리 ───────────────────────────
  {
    id: 'period_pain_level',
    cardIds: ['healthy_cycle', 'period_pain'],
    emoji: '🩸', category: '생리통 케어',
    text: '생리통이 가장 심할 때, 1부터 10까지 점수를 매긴다면 몇 점 정도인가요?',
    type: 'slider', min: 1, max: 10,
  },
  {
    id: 'period_coldness',
    cardIds: ['healthy_cycle', 'period_pain'],
    emoji: '🩸', category: '생리통 케어',
    text: '혹시 아랫배가 묵직하거나 차갑다고 느껴질 때가 자주 있으신가요?',
    type: 'radio',
    options: ['자주 그래요', '가끔 그래요', '거의 없어요'],
  },

  // ── ✨ 여드름 / 피부 질환 ────────────────────────────────────
  {
    id: 'skin_cycle_acne',
    cardIds: ['skin_acne'],
    emoji: '✨', category: '피부 관리',
    text: '주기별로 반복되는 얄미운 트러블이 있나요? 주로 턱이나 입 주변인가요?',
    type: 'radio',
    options: ['네, 주기적으로 나요', '가끔 그런 것 같아요', '별로 없어요'],
  },
  {
    id: 'skin_timing',
    cardIds: ['skin_acne'],
    emoji: '✨', category: '피부 관리',
    text: '피부가 갑자기 건조해지거나 홍조가 올라오는 시기가 언제인지 궁금해요.',
    type: 'multiselect',
    options: ['생리 전', '생리 중', '생리 후', '주기와 무관해요'],
  },

  // ── 📈 갑상선 / 자궁 / 난소 관리 ───────────────────────────────
  {
    id: 'thyroid_checkup',
    cardIds: ['thyroid_uterus'],
    emoji: '📈', category: '갑상선 & 호르몬',
    text: '최근 검진에서 \'주의\'가 필요하다는 이야기를 들으신 적이 있나요?',
    type: 'radio',
    options: ['네, 있어요', '없어요', '검진을 안 했어요'],
  },
  {
    id: 'thyroid_swelling',
    cardIds: ['thyroid_uterus'],
    emoji: '📈', category: '갑상선 & 호르몬',
    text: '갑자기 이유 없이 피곤하거나 몸이 붓는 느낌을 자주 받으시나요?',
    type: 'radio',
    options: ['자주 그래요', '가끔 그래요', '없어요'],
  },

  // ── 🍃 난임 ───────────────────────────────────────────────────
  {
    id: 'fertility_duration',
    cardIds: ['fertility'],
    emoji: '🍃', category: '난임 / 임신 준비',
    text: '임신을 준비하신 지 얼마나 되셨나요? 루디아가 배란일을 더 세밀하게 봐드릴게요.',
    type: 'radio',
    options: ['6개월 미만', '6개월~1년', '1년 이상', '아직 계획 중'],
  },
  {
    id: 'fertility_basal_temp',
    cardIds: ['fertility'],
    emoji: '🍃', category: '난임 / 임신 준비',
    text: '기초 체온을 쟀을 때, 평소보다 온도가 낮게 나오는 편인가요?',
    type: 'radio',
    options: ['네, 낮은 편이에요', '잘 모르겠어요', '아니요'],
  },

  // ── 🛡️ 물혹 / 근종 / 암 ───────────────────────────────────────
  {
    id: 'fibroid_family',
    cardIds: ['cyst_fibroid_cancer'],
    emoji: '🛡️', category: '자궁 건강',
    text: '가족 중에 비슷한 고민을 하셨던 분이 계신가요? (유전적 단서 확인)',
    type: 'radio',
    options: ['네, 있어요', '없어요', '잘 모르겠어요'],
  },
  {
    id: 'fibroid_bleeding',
    cardIds: ['cyst_fibroid_cancer'],
    emoji: '🛡️', category: '자궁 건강',
    text: '생리 기간이 아닌데도 부정 출혈이 있어서 당황하신 적이 있나요?',
    type: 'radio',
    options: ['네, 있어요', '한 번 있었어요', '없어요'],
  },

  // ── ⚖️ 다이어트 ──────────────────────────────────────────────
  {
    id: 'diet_craving',
    cardIds: ['diet'],
    emoji: '⚖️', category: '다이어트 & 대사',
    text: '생리 전후로 식욕을 참기 힘들거나 단것이 유독 당기는 편인가요?',
    type: 'radio',
    options: ['자주 그래요', '가끔 그래요', '별로 없어요'],
  },
  {
    id: 'diet_stubborn',
    cardIds: ['diet'],
    emoji: '⚖️', category: '다이어트 & 대사',
    text: '운동을 해도 유독 살이 잘 안 빠진다고 느껴지는 부위가 있나요?',
    type: 'multiselect',
    options: ['배', '허벅지 / 엉덩이', '팔', '고르게 빠지는 편이에요'],
  },

  // ── 🌬️ 스트레스 관리 ─────────────────────────────────────────
  {
    id: 'stress_sleep',
    cardIds: ['stress'],
    emoji: '🌬️', category: '스트레스 & 자율신경',
    text: '잠들기까지 30분 이상 걸리거나, 자다가 자주 깨서 피곤하신가요?',
    type: 'radio',
    options: ['자주 그래요', '가끔 그래요', '잘 자는 편이에요'],
  },
  {
    id: 'stress_palpitation',
    cardIds: ['stress'],
    emoji: '🌬️', category: '스트레스 & 자율신경',
    text: '가슴이 답답하거나 이유 없이 두근거리는 증상이 나타나기도 하나요?',
    type: 'radio',
    options: ['자주 그래요', '가끔 그래요', '없어요'],
  },

  // ── 🦴 골다공증 ───────────────────────────────────────────────
  {
    id: 'osteo_joint',
    cardIds: ['osteoporosis'],
    emoji: '🦴', category: '운동 & 근력',
    text: '평소에 무릎이나 손목 관절이 뻣뻣하다고 느껴질 때가 있으신가요?',
    type: 'radio',
    options: ['자주 그래요', '가끔 그래요', '없어요'],
  },
  {
    id: 'osteo_vitamin_d',
    cardIds: ['osteoporosis'],
    emoji: '🦴', category: '운동 & 근력',
    text: '햇빛을 쬐는 산책이나 비타민 D 섭취를 규칙적으로 하고 계신가요?',
    type: 'radio',
    options: ['규칙적으로 해요', '가끔 해요', '거의 못 해요'],
  },

  // ── ✂️ 모발 관리 ──────────────────────────────────────────────
  {
    id: 'hair_thinning',
    cardIds: ['hair_care'],
    emoji: '✂️', category: '모발 & 두피',
    text: '머리카락이 예전보다 가늘어졌거나 두피가 화끈거리는 느낌이 드시나요?',
    type: 'radio',
    options: ['네, 느껴요', '조금 그런 것 같아요', '아니요'],
  },
  {
    id: 'hair_loss',
    cardIds: ['hair_care'],
    emoji: '✂️', category: '모발 & 두피',
    text: '샴푸 할 때 빠지는 머리카락 양이 평소보다 늘어난 것 같아 걱정되시나요?',
    type: 'radio',
    options: ['많이 늘었어요', '조금 늘었어요', '비슷해요'],
  },
]

export function getQuestionsForCards(cardIds: string[]): Question[] {
  const seen = new Set<string>()
  const result: Question[] = []

  // First: common questions (shown to everyone)
  for (const q of ALL_QUESTIONS) {
    if (q.common && !seen.has(q.id)) {
      seen.add(q.id)
      result.push(q)
    }
  }

  // Then: card-specific questions for selected cards
  for (const q of ALL_QUESTIONS) {
    if (!q.common && q.cardIds.some(id => cardIds.includes(id)) && !seen.has(q.id)) {
      seen.add(q.id)
      result.push(q)
    }
  }

  return result
}
