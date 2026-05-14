export type OrganKey = 'heart' | 'liver' | 'spleen' | 'lung' | 'kidney'
export type HealthState = 'glowing' | 'normal' | 'wilting'

export interface TemperamentInfo {
  title: string        // 기질 이름
  subtitle: string     // 한 줄 설명
  nature: string       // 본성
  traits: string[]     // 성격 특성
  weakness: string     // 취약점
  harmony: string[]    // 조화를 위한 생활 습관
  foods: string[]      // 권장 식품
  color: string
  emoji: string
}

export const TEMPERAMENTS: Record<OrganKey, TemperamentInfo> = {
  heart: {
    title: '열정의 불꽃 기질',
    subtitle: '화(火) · 심(心) — 따뜻한 빛을 전하는 사람',
    nature: '따뜻하고 열정적인 에너지로 주변에 기쁨을 전하는 존재입니다. 감수성이 풍부하고 직관이 뛰어나 사람들의 마음을 잘 읽습니다.',
    traits: ['감정이 풍부하고 사교적', '창의적이며 열정적', '직관력이 뛰어남', '빠른 공감 능력'],
    weakness: '과도한 열정으로 쉽게 소진될 수 있습니다. 스트레스가 쌓이면 심박수나 수면에 민감하게 반응해요.',
    harmony: ['하루 5분 심호흡 명상', '자기 전 스마트폰 차단', '격렬한 감정 기복 줄이기', '규칙적인 수면 패턴 유지'],
    foods: ['비트', '토마토', '석류', '산딸기', '홍삼'],
    color: '#C41A4A',
    emoji: '🔥',
  },
  liver: {
    title: '성장하는 나무 기질',
    subtitle: '목(木) · 간(肝) — 도전과 창조의 에너지',
    nature: '강한 생명력과 추진력을 지닌 사람입니다. 새로운 시작을 두려워하지 않고, 목표를 향해 꾸준히 나아가는 힘이 있어요.',
    traits: ['계획적이고 목표 지향적', '창의적 사고력', '강한 추진력', '독립적이고 도전적'],
    weakness: '억눌린 감정이 근육 긴장이나 눈 피로로 나타날 수 있습니다. 과도한 업무가 쌓이면 몸이 먼저 신호를 보내요.',
    harmony: ['20분마다 눈 스트레칭', '저녁 야외 산책', '감정을 글로 표현하기', '스트레칭과 요가'],
    foods: ['브로콜리', '시금치', '쑥갓', '부추', '결명자'],
    color: '#1A7A3A',
    emoji: '🌿',
  },
  spleen: {
    title: '대지의 안정 기질',
    subtitle: '토(土) · 비(脾) — 포용과 신뢰의 에너지',
    nature: '든든하고 신뢰할 수 있는 존재입니다. 주변을 품어 안는 따뜻한 포용력으로 공동체의 중심이 됩니다.',
    traits: ['배려심이 깊고 포용적', '안정을 추구함', '신중하고 꼼꼼함', '조화를 중시'],
    weakness: '지나친 걱정과 반추가 소화기계에 부담을 줍니다. 에너지 소모 후 회복 속도가 느려요.',
    harmony: ['규칙적인 식사 시간 지키기', '식후 10분 가벼운 산책', '걱정 일기 쓰기', '따뜻한 족욕'],
    foods: ['단호박', '고구마', '당근', '율무', '대추'],
    color: '#A16207',
    emoji: '🌍',
  },
  lung: {
    title: '맑은 공기 기질',
    subtitle: '금(金) · 폐(肺) — 순수와 질서의 에너지',
    nature: '섬세한 감각과 높은 심미안을 가진 사람입니다. 아름다움과 질서를 추구하며 주변 환경에 깊이 감응합니다.',
    traits: ['완벽주의 성향', '규율과 원칙 중시', '섬세한 감수성', '높은 심미안'],
    weakness: '슬픔이나 상실감을 억누르면 호흡이 얕아지고 피부가 건조해집니다. 환절기 면역 변화에 특히 민감해요.',
    harmony: ['복식 호흡 연습', '슬픔을 충분히 표현하기', '실내 가습과 환기 관리', '피부 보습 루틴'],
    foods: ['도라지', '배', '양파', '연근', '흰목이버섯'],
    color: '#7C3AED',
    emoji: '🌬️',
  },
  kidney: {
    title: '깊은 물의 기질',
    subtitle: '수(水) · 신(腎) — 지혜와 생명력의 근원',
    nature: '생명 에너지의 뿌리를 담당하는 깊이 있는 사람입니다. 뛰어난 통찰력과 지혜로 본질을 꿰뚫어 봅니다.',
    traits: ['내성적이고 관찰력이 뛰어남', '깊이 있는 사고', '뛰어난 직관과 통찰', '신중하고 침착함'],
    weakness: '두려움과 불안이 지속되면 호르몬 균형과 관절에 영향을 줍니다. 몸이 쉽게 붓고 피로가 쌓여요.',
    harmony: ['하루 1.5L 이상 수분 섭취', '발·발목 따뜻하게 유지', '족욕으로 하체 순환 촉진', '과도한 성생활·야근 피하기'],
    foods: ['검은콩', '검은깨', '미역', '김', '블루베리'],
    color: '#1E1B4B',
    emoji: '💧',
  },
}

export interface OrganInfo {
  key: OrganKey
  name: string
  element: string
  elementColor: string
  vegetable: string
  traits: string[]
  advice: { glowing: string; normal: string; wilting: string }
}

export interface Question {
  id: string
  organ: OrganKey
  text: string
}

export interface OrganScore {
  organ: OrganKey
  raw: number    // 2–10
  pct: number    // 0–100
  state: HealthState
}

export interface GardenResult {
  primary: OrganKey
  secondary: OrganKey | null   // tied within 1 point
  scores: Record<OrganKey, OrganScore>
}

/* ── Organ metadata ───────────────────────────────────────────── */
export const ORGANS: Record<OrganKey, OrganInfo> = {
  heart: {
    key: 'heart',
    name: '심장',
    element: '화(火) · 붉음',
    elementColor: '#C41A4A',
    vegetable: '비트',
    traits: ['스트레스', '가슴 두근거림', '불면증'],
    advice: {
      glowing: '심장 에너지가 안정적이에요. 현재 루틴을 유지하며 마음의 여유를 즐기세요.',
      normal: '스트레스 관리에 신경 써보세요. 하루 5분 호흡 명상이 도움이 돼요.',
      wilting: '심장이 지쳐 있어요. 카페인을 줄이고, 잠들기 전 따뜻한 족욕을 추천해요.',
    },
  },
  liver: {
    key: 'liver',
    name: '간',
    element: '목(木) · 초록',
    elementColor: '#1A7A3A',
    vegetable: '브로콜리',
    traits: ['피로감', '근육 뭉침', '눈 피로'],
    advice: {
      glowing: '간 기운이 활기차요. 초록 채소를 꾸준히 드시고 야외 활동을 즐기세요.',
      normal: '눈 스트레칭과 20분마다 먼 곳 바라보기를 실천해보세요.',
      wilting: '간이 피로를 호소하고 있어요. 충분한 수면과 눈·근육 스트레칭이 필요해요.',
    },
  },
  spleen: {
    key: 'spleen',
    name: '비장',
    element: '토(土) · 노랑',
    elementColor: '#A16207',
    vegetable: '단호박',
    traits: ['소화불량', '근력 저하', '에너지 부족'],
    advice: {
      glowing: '비장이 건강해요. 규칙적인 식사 습관이 잘 유지되고 있네요.',
      normal: '식후 10분 가벼운 산책으로 소화를 돕고 에너지를 보충해보세요.',
      wilting: '비장이 지쳐있어요. 따뜻하고 소화 잘 되는 음식(죽, 구운 단호박)을 드세요.',
    },
  },
  lung: {
    key: 'lung',
    name: '폐',
    element: '금(金) · 하양',
    elementColor: '#7C3AED',
    vegetable: '양파',
    traits: ['호흡 불편', '건성 피부', '면역 저하'],
    advice: {
      glowing: '폐 기운이 맑아요. 깊은 복식 호흡을 매일 실천하면 더 좋아질 거예요.',
      normal: '환절기에 수분을 충분히 섭취하고 환기를 자주 해주세요.',
      wilting: '폐가 지쳐있어요. 가습기를 사용하고, 수분이 풍부한 배·도라지를 드세요.',
    },
  },
  kidney: {
    key: 'kidney',
    name: '신장',
    element: '수(水) · 검정',
    elementColor: '#1E1B4B',
    vegetable: '검은콩',
    traits: ['호르몬 불균형', '부종', '뼈·관절 약화'],
    advice: {
      glowing: '신장 에너지가 충만해요. 검은 식품(검은깨, 검은콩)을 꾸준히 드세요.',
      normal: '수분을 자주 섭취하고, 발·발목을 따뜻하게 유지해보세요.',
      wilting: '신장이 약해져 있어요. 짠 음식을 줄이고, 다리 부종 완화를 위해 족욕을 해보세요.',
    },
  },
}

/* ── Survey questions (2 per organ) ──────────────────────────── */
export const QUESTIONS: Question[] = [
  { id: 'h1', organ: 'heart',  text: '스트레스를 받으면 가슴이 두근거리거나 심장이 빨리 뛰나요?' },
  { id: 'h2', organ: 'heart',  text: '잠들기 어렵거나 수면 중 자주 깨어 숙면을 취하지 못하나요?' },
  { id: 'li1', organ: 'liver', text: '눈이 자주 침침하고 장시간 집중하면 눈이 쉽게 피로해지나요?' },
  { id: 'li2', organ: 'liver', text: '목·어깨·종아리 근육이 자주 뭉치고 뻐근한가요?' },
  { id: 'sp1', organ: 'spleen',text: '식사 후 속이 더부룩하거나 소화가 잘 되지 않나요?' },
  { id: 'sp2', organ: 'spleen',text: '팔다리에 힘이 없고 조금만 움직여도 쉽게 피곤해지나요?' },
  { id: 'lu1', organ: 'lung',  text: '환절기에 기침이 잦거나 호흡이 불편하게 느껴지나요?' },
  { id: 'lu2', organ: 'lung',  text: '피부가 쉽게 건조해지거나 감기 등 잔병치레가 잦은가요?' },
  { id: 'k1',  organ: 'kidney',text: '호르몬 변화가 심하거나 감정 기복이 크게 느껴지나요?' },
  { id: 'k2',  organ: 'kidney',text: '몸이 자주 붓거나 허리·관절이 쑤시고 뻐근한가요?' },
]

export const LIKERT = [
  { value: 1, label: '전혀\n없어요' },
  { value: 2, label: '거의\n없어요' },
  { value: 3, label: '가끔\n있어요' },
  { value: 4, label: '자주\n있어요' },
  { value: 5, label: '항상\n있어요' },
]

/* ── Scoring algorithm ────────────────────────────────────────── */
export function calcScores(answers: Record<string, number>): GardenResult {
  const keys: OrganKey[] = ['heart', 'liver', 'spleen', 'lung', 'kidney']
  const scores = {} as Record<OrganKey, OrganScore>

  for (const organ of keys) {
    const qs = QUESTIONS.filter(q => q.organ === organ)
    const raw = qs.reduce((sum, q) => sum + (answers[q.id] ?? 1), 0)
    const pct = Math.round(((raw - 2) / 8) * 100)
    const state: HealthState = raw <= 4 ? 'glowing' : raw >= 7 ? 'wilting' : 'normal'
    scores[organ] = { organ, raw, pct, state }
  }

  const sorted = keys.slice().sort((a, b) => scores[b].raw - scores[a].raw)
  const primary = sorted[0]
  const secondary = scores[sorted[1]].raw >= scores[primary].raw - 1 ? sorted[1] : null

  return { primary, secondary, scores }
}
