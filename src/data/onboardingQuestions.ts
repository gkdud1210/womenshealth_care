export interface Question {
  id: string
  cardIds: string[]   // 어떤 케어카드에 속하는지
  emoji: string
  category: string
  text: string
  type: 'slider' | 'multiselect' | 'radio'
  options?: string[]
  min?: number
  max?: number
}

export const ALL_QUESTIONS: Question[] = [
  // ── 🩸 생리불순 / 생리통 ──────────────────────────────────
  {
    id: 'period_pain_level',
    cardIds: ['healthy_cycle', 'period_pain'],
    emoji: '🩸', category: '생리통 케어',
    text: '생리통이 가장 심할 때, 1~10점으로 얼마나 아프신가요?',
    type: 'slider', min: 1, max: 10,
  },
  {
    id: 'period_pain_location',
    cardIds: ['healthy_cycle', 'period_pain'],
    emoji: '🩸', category: '생리통 케어',
    text: '주로 어디가 아프신가요? 해당하는 곳을 모두 선택해 주세요.',
    type: 'multiselect',
    options: ['아랫배', '허리', '허벅지', '골반 전체', '머리'],
  },
  {
    id: 'period_pms',
    cardIds: ['healthy_cycle', 'period_pain'],
    emoji: '🩸', category: '생리통 케어',
    text: '생리 전후로 감정 기복(PMS)이 일상생활에 지장을 줄 만큼 힘드신 편인가요?',
    type: 'radio',
    options: ['자주 그래요', '가끔 그래요', '별로 없어요'],
  },

  // ── 🥗 다이어트 & 대사 ──────────────────────────────────
  {
    id: 'diet_water',
    cardIds: ['diet'],
    emoji: '🥗', category: '다이어트 & 대사',
    text: '평소에 물은 얼마나 자주 마시나요? 갈증을 자주 느끼시는 편인가요?',
    type: 'radio',
    options: ['충분히 마셔요', '조금 부족한 것 같아요', '거의 못 마셔요'],
  },
  {
    id: 'diet_craving',
    cardIds: ['diet'],
    emoji: '🥗', category: '다이어트 & 대사',
    text: '야식이나 달콤한 디저트 중 유독 참기 힘든 유혹이 있나요?',
    type: 'multiselect',
    options: ['야식', '달콤한 디저트', '짠 음식', '탄산음료', '없어요'],
  },
  {
    id: 'diet_weight_change',
    cardIds: ['diet'],
    emoji: '🥗', category: '다이어트 & 대사',
    text: '최근 6개월 사이, 이유 없이 체중이 급격하게 변한 적이 있나요?',
    type: 'radio',
    options: ['네, 있어요', '약간 있어요', '없어요'],
  },

  // ── 🕊️ 난임 / 임신 준비 ────────────────────────────────
  {
    id: 'fertility_duration',
    cardIds: ['fertility'],
    emoji: '🕊️', category: '난임 / 임신 준비',
    text: '임신을 준비하신 지 얼마나 되셨나요? 루디아가 주기를 더 세심하게 봐드릴게요.',
    type: 'radio',
    options: ['6개월 미만', '6개월~1년', '1년 이상', '아직 계획 중'],
  },
  {
    id: 'fertility_coldness',
    cardIds: ['fertility'],
    emoji: '🕊️', category: '난임 / 임신 준비',
    text: '평소에 기초 체온이 낮다고 느끼시거나, 손발이 유독 찬 편이신가요?',
    type: 'radio',
    options: ['네, 많이요', '조금 그런 것 같아요', '아니요'],
  },
  {
    id: 'fertility_surgery',
    cardIds: ['fertility'],
    emoji: '🕊️', category: '난임 / 임신 준비',
    text: '과거에 부인과 시술이나 수술을 받으신 경험이 있다면 살짝만 알려주세요.',
    type: 'radio',
    options: ['네, 있어요', '없어요', '말하기 어려워요'],
  },

  // ── 🧴 피부 ────────────────────────────────────────────
  {
    id: 'skin_concerns',
    cardIds: ['skin_acne'],
    emoji: '🧴', category: '피부 관리',
    text: '생리 주기와 상관없이 늘 고민인 피부 문제가 있나요?',
    type: 'multiselect',
    options: ['좁쌀 여드름', '홍조', '건조함', '번들거림', '색소침착'],
  },
  {
    id: 'skin_condition',
    cardIds: ['skin_acne'],
    emoji: '🧴', category: '피부 관리',
    text: '특정 화장품보다 몸 컨디션에 따라 피부가 확 달라지는 편인가요?',
    type: 'radio',
    options: ['자주 그래요', '가끔 그래요', '별로 없어요'],
  },
  {
    id: 'skin_heat',
    cardIds: ['skin_acne'],
    emoji: '🧴', category: '피부 관리',
    text: '평소에 얼굴에 열이 자주 오르는 느낌을 받으시나요?',
    type: 'radio',
    options: ['네, 자주요', '가끔요', '아니요'],
  },

  // ── 💆 모발 & 두피 ──────────────────────────────────────
  {
    id: 'hair_loss',
    cardIds: ['hair_care'],
    emoji: '💆', category: '모발 & 두피',
    text: '머리카락이 예전보다 가늘어졌거나, 머리를 감을 때 빠지는 양이 늘어났나요?',
    type: 'radio',
    options: ['네, 많이요', '조금 그런 것 같아요', '아니요'],
  },
  {
    id: 'hair_scalp',
    cardIds: ['hair_care'],
    emoji: '💆', category: '모발 & 두피',
    text: '두피가 자주 가렵거나 열감이 느껴져서 답답할 때가 있나요?',
    type: 'radio',
    options: ['자주요', '가끔요', '없어요'],
  },
  {
    id: 'hair_stress',
    cardIds: ['hair_care'],
    emoji: '💆', category: '모발 & 두피',
    text: '스트레스를 받으면 정수리 부분이 뜨거워지는 기분이 드시나요?',
    type: 'radio',
    options: ['네, 자주요', '가끔요', '아니요'],
  },

  // ── 🏥 물혹 / 근종 ─────────────────────────────────────
  {
    id: 'fibroid_diagnosis',
    cardIds: ['cyst_fibroid_cancer'],
    emoji: '🏥', category: '자궁 건강',
    text: '최근 산부인과 검진에서 혹이나 근종에 대해 들으신 내용이 있나요?',
    type: 'radio',
    options: ['네, 있어요', '없어요', '검진을 안 했어요'],
  },
  {
    id: 'fibroid_bleeding',
    cardIds: ['cyst_fibroid_cancer'],
    emoji: '🏥', category: '자궁 건강',
    text: '생리 기간이 아닌데도 부정 출혈이 있거나, 생리 양이 갑자기 많아졌나요?',
    type: 'radio',
    options: ['네, 있어요', '가끔요', '없어요'],
  },
  {
    id: 'fibroid_family',
    cardIds: ['cyst_fibroid_cancer'],
    emoji: '🏥', category: '자궁 건강',
    text: '가족 중에 자궁 관련 질환을 겪으신 분이 계신가요?',
    type: 'radio',
    options: ['네', '아니요', '잘 모르겠어요'],
  },

  // ── 🌡️ 갑상선 / 자궁 / 난소 ──────────────────────────
  {
    id: 'thyroid_flush',
    cardIds: ['thyroid_uterus'],
    emoji: '🌡️', category: '갑상선 & 호르몬',
    text: '갑자기 얼굴이 달아오르거나 식은땀이 나서 잠을 설치신 적이 있나요?',
    type: 'radio',
    options: ['자주요', '가끔요', '없어요'],
  },
  {
    id: 'thyroid_brain',
    cardIds: ['thyroid_uterus'],
    emoji: '🌡️', category: '갑상선 & 호르몬',
    text: '요즘 부쩍 건망증이 심해졌거나 안절부절못하는 마음이 드나요?',
    type: 'radio',
    options: ['네, 요즘 그래요', '가끔요', '아니요'],
  },
  {
    id: 'thyroid_joint',
    cardIds: ['thyroid_uterus'],
    emoji: '🌡️', category: '갑상선 & 호르몬',
    text: '관절이 뻣뻣하거나 근육통이 자주 생기지는 않나요?',
    type: 'radio',
    options: ['자주요', '가끔요', '없어요'],
  },

  // ── ⚡ 스트레스 / 자율신경 ────────────────────────────
  {
    id: 'stress_sleep',
    cardIds: ['stress'],
    emoji: '⚡', category: '스트레스 & 자율신경',
    text: '잠들기까지 시간이 오래 걸리거나, 자다가 자주 깨서 피곤하신가요?',
    type: 'radio',
    options: ['자주요', '가끔요', '잘 자요'],
  },
  {
    id: 'stress_heart',
    cardIds: ['stress'],
    emoji: '⚡', category: '스트레스 & 자율신경',
    text: '가슴이 답답하거나 이유 없이 두근거리는 증상이 자주 나타나나요?',
    type: 'radio',
    options: ['자주요', '가끔요', '없어요'],
  },
  {
    id: 'stress_digest',
    cardIds: ['stress'],
    emoji: '⚡', category: '스트레스 & 자율신경',
    text: '소화가 잘 안 되고 늘 배에 가스가 찬 느낌이 드시나요?',
    type: 'radio',
    options: ['자주요', '가끔요', '없어요'],
  },

  // ── 🦴 골다공증 ──────────────────────────────────────
  {
    id: 'osteo_exercise',
    cardIds: ['osteoporosis'],
    emoji: '🦴', category: '운동 & 근력',
    text: '일주일에 땀이 날 정도의 운동을 몇 번 정도 하시나요?',
    type: 'radio',
    options: ['거의 없어요', '1~2회', '3~4회', '5회 이상'],
  },
  {
    id: 'osteo_recovery',
    cardIds: ['osteoporosis'],
    emoji: '🦴', category: '운동 & 근력',
    text: '운동 후에 회복이 빠른 편인가요, 아니면 며칠씩 근육통으로 고생하시나요?',
    type: 'radio',
    options: ['빨리 회복돼요', '보통이에요', '며칠씩 걸려요'],
  },
  {
    id: 'osteo_posture',
    cardIds: ['osteoporosis'],
    emoji: '🦴', category: '운동 & 근력',
    text: '평소 자세가 구부정하거나 거북목 증상으로 어깨가 결리지는 않나요?',
    type: 'radio',
    options: ['자주요', '가끔요', '없어요'],
  },
]

export function getQuestionsForCards(cardIds: string[]): Question[] {
  const seen = new Set<string>()
  return ALL_QUESTIONS.filter(q => {
    if (q.cardIds.some(id => cardIds.includes(id)) && !seen.has(q.id)) {
      seen.add(q.id)
      return true
    }
    return false
  })
}
