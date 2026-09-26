// ── 끼니 ────────────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner'

export const MEAL_META: Record<MealType, { label: string; emoji: string; timeHint: string }> = {
  breakfast: { label: '아침', emoji: '🌅', timeHint: '05:00–10:00' },
  lunch:     { label: '점심', emoji: '☀️', timeHint: '11:00–14:00' },
  dinner:    { label: '저녁', emoji: '🌙', timeHint: '17:00–21:00' },
}

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner']

// ── 케어카드(체질)별 식단 프로필 ─────────────────────────────────────────────
//
// 케어카드마다 하루 권장 칼로리 범위와 식단에서 챙기면 좋은 것 / 줄이면 좋은 것을 정의해요.
// 여러 케어카드를 골랐다면 첫 번째로 매칭되는 프로필을 기준으로 하고, boost/avoid는 합쳐요.

export interface CareMealProfile {
  dailyKcal: [number, number]
  focus: string
  boost: string[]
  avoid: string[]
  /** 이 체질에 맞는 루디아샵 식단 상품을 고를 때 우선 매칭할 키워드 */
  shopKeywords: string[]
}

export const CARE_MEAL_PROFILES: Record<string, CareMealProfile> = {
  weight_metabolic: {
    dailyKcal: [1400, 1700],
    focus: '저탄수 · 고단백 위주로, 정제 탄수화물은 줄여요',
    boost: ['식이섬유', '저GI 탄수화물', '단백질'],
    avoid: ['튀김류', '단순당 디저트', '과한 탄수화물'],
    shopKeywords: ['저칼로리', '체중관리', '나트륨_낮음'],
  },
  male_wellness: {
    dailyKcal: [2400, 2800],
    focus: '고단백 · 고칼로리로 근성장을 지원해요',
    boost: ['단백질', '아연', '복합 탄수화물'],
    avoid: ['과음', '정제당'],
    shopKeywords: ['고단백', '근성장_지원', '남성호르몬_케어'],
  },
  gut_detox: {
    dailyKcal: [1600, 1900],
    focus: '장에 부담 적은 발효식 · 식이섬유 위주 식단이 좋아요',
    boost: ['식이섬유', '발효식품', '수분'],
    avoid: ['자극적인 음식', '과도한 유제품', '밀가루 과다'],
    shopKeywords: ['장건강', '식이섬유_보충', '소화편함'],
  },
  hormone_female: {
    dailyKcal: [1700, 2000],
    focus: '철분·마그네슘이 담긴 따뜻한 한 끼를 챙겨요',
    boost: ['철분', '마그네슘', '오메가3'],
    avoid: ['카페인 과다', '찬 음식', '과한 나트륨'],
    shopKeywords: ['철분', '호르몬_균형', '균형식단'],
  },
  mental_brain: {
    dailyKcal: [1700, 2000],
    focus: '혈당 급변을 막는 저GI 식사로 멘탈 컨디션을 지켜요',
    boost: ['오메가3', '비타민B', '트립토판'],
    avoid: ['정제당 급증', '과한 카페인'],
    shopKeywords: ['균형식단', '혈당관리', '저GI'],
  },
  skin_beauty: {
    dailyKcal: [1600, 1900],
    focus: '항산화·장-피부 축을 위한 채소·항산화 식재료 위주예요',
    boost: ['항산화', '비타민C', '식이섬유'],
    avoid: ['튀김류', '고당 디저트', '유제품 과다'],
    shopKeywords: ['항산화', '장건강', '저칼로리'],
  },
  disease_postcare: {
    dailyKcal: [1500, 1800],
    focus: '소화가 편하고 자극이 적은 부드러운 식사가 좋아요',
    boost: ['단백질', '비타민', '소화 편한 조리법'],
    avoid: ['자극적인 양념', '기름진 튀김', '날음식'],
    shopKeywords: ['소화편함', '저자극', '면역_지원'],
  },
  organ_monitoring: {
    dailyKcal: [1600, 1900],
    focus: '나트륨은 줄이고 항산화 식재료를 꾸준히 챙겨요',
    boost: ['항산화', '요오드 균형', '식이섬유'],
    avoid: ['과한 나트륨', '가공식품'],
    shopKeywords: ['나트륨_낮음', '균형식단'],
  },
  musculoskeletal_lymph: {
    dailyKcal: [1600, 1900],
    focus: '부종을 줄이는 칼륨 식품과 수분 섭취가 도움돼요',
    boost: ['칼륨', '단백질', '수분'],
    avoid: ['짠 국물', '가공육'],
    shopKeywords: ['부종관리', '나트륨_낮음'],
  },
  posture_correction: {
    dailyKcal: [1700, 2000],
    focus: '뼈·근육을 지지하는 칼슘·단백질 위주 식단이 좋아요',
    boost: ['칼슘', '단백질', '비타민D'],
    avoid: ['카페인 과다', '탄산음료'],
    shopKeywords: ['균형식단', '고단백'],
  },
  hair_scalp: {
    dailyKcal: [1700, 2000],
    focus: '두피 열을 낮추는 저자극·항산화 식단이 좋아요',
    boost: ['아연', '비오틴', '항산화'],
    avoid: ['자극적인 음식', '기름진 튀김'],
    shopKeywords: ['항산화', '저칼로리'],
  },
}

export const DEFAULT_MEAL_PROFILE: CareMealProfile = {
  dailyKcal: [1800, 2100],
  focus: '채소·단백질·탄수화물이 고루 담긴 균형식이 좋아요',
  boost: ['채소', '단백질'],
  avoid: [],
  shopKeywords: ['균형식단'],
}

/** 여러 케어카드를 반영해 하나의 프로필로 합쳐요 (첫 매칭 기준 + boost/avoid/키워드 합산) */
export function resolveMealProfile(careTypes: string[]): CareMealProfile {
  const matched = careTypes.map(c => CARE_MEAL_PROFILES[c]).filter((p): p is CareMealProfile => !!p)
  if (matched.length === 0) return DEFAULT_MEAL_PROFILE
  const base = matched[0]
  const boost = Array.from(new Set(matched.flatMap(p => p.boost))).slice(0, 4)
  const avoid = Array.from(new Set(matched.flatMap(p => p.avoid))).slice(0, 4)
  const shopKeywords = Array.from(new Set(matched.flatMap(p => p.shopKeywords)))
  return { ...base, boost, avoid, shopKeywords }
}

/** 진단(홍채+BMI+문진)으로 나온 세부 체질의 식습관 정보를 얹어 더 정밀한 프로필을 만들어요.
 *  탈모 6유형(HairCareType)과 다른 11개 카드 세부 체질(CareSubtype)이 같은 모양(diet.good/avoid + mechanism)을
 *  공유해서 하나의 함수로 처리할 수 있어요. */
export function refineMealProfileWithSubtype(
  base: CareMealProfile,
  subtype: { diet: { good: string[]; avoid: string[] }; mechanism: string } | null,
): CareMealProfile {
  if (!subtype) return base
  const boost = Array.from(new Set([...subtype.diet.good, ...base.boost])).slice(0, 5)
  const avoid = Array.from(new Set([...subtype.diet.avoid, ...base.avoid])).slice(0, 5)
  return { ...base, boost, avoid, focus: subtype.mechanism }
}

/** 끼니별 목표 칼로리 (하루 범위를 3등분, 저녁은 살짝 가볍게) */
export function mealTargetKcal(profile: CareMealProfile, meal: MealType): [number, number] {
  const [lo, hi] = profile.dailyKcal
  const weight = meal === 'dinner' ? 0.3 : meal === 'breakfast' ? 0.32 : 0.38
  return [Math.round(lo * weight), Math.round(hi * weight)]
}

// ── 로컬 폴백용 음식 태그 (AI 비전 분석이 불가능할 때 수동 선택) ─────────────

export type Portion = '적게' | '보통' | '많이'
export const PORTIONS: Portion[] = ['적게', '보통', '많이']

export interface FoodTag {
  id: string
  label: string
  emoji: string
  kcal: Record<Portion, number>
  protein: Record<Portion, number>
  carb: Record<Portion, number>
  fat: Record<Portion, number>
}

export const FOOD_TAGS: FoodTag[] = [
  { id: 'grain',   label: '밥·면·빵',        emoji: '🍚',
    kcal: { 적게: 140, 보통: 280, 많이: 420 }, protein: { 적게: 3, 보통: 6, 많이: 9 },
    carb: { 적게: 30, 보통: 60, 많이: 90 }, fat: { 적게: 1, 보통: 2, 많이: 3 } },
  { id: 'protein', label: '고기·생선·두부·계란', emoji: '🍗',
    kcal: { 적게: 120, 보통: 220, 많이: 340 }, protein: { 적게: 12, 보통: 22, 많이: 34 },
    carb: { 적게: 1, 보통: 2, 많이: 3 }, fat: { 적게: 7, 보통: 13, 많이: 20 } },
  { id: 'veggie',  label: '채소·나물·샐러드',  emoji: '🥗',
    kcal: { 적게: 25, 보통: 60, 많이: 110 }, protein: { 적게: 1, 보통: 2, 많이: 4 },
    carb: { 적게: 4, 보통: 10, 많이: 18 }, fat: { 적게: 0, 보통: 1, 많이: 2 } },
  { id: 'soup',    label: '국·찌개·스프',     emoji: '🍲',
    kcal: { 적게: 60, 보통: 130, 많이: 220 }, protein: { 적게: 3, 보통: 7, 많이: 12 },
    carb: { 적게: 5, 보통: 10, 많이: 16 }, fat: { 적게: 2, 보통: 5, 많이: 9 } },
  { id: 'fried',   label: '튀김·부침·볶음',   emoji: '🍤',
    kcal: { 적게: 100, 보통: 220, 많이: 380 }, protein: { 적게: 3, 보통: 6, 많이: 10 },
    carb: { 적게: 8, 보통: 16, 많이: 26 }, fat: { 적게: 6, 보통: 14, 많이: 24 } },
  { id: 'dairy',   label: '유제품·치즈',      emoji: '🧀',
    kcal: { 적게: 60, 보통: 120, 많이: 200 }, protein: { 적게: 3, 보통: 7, 많이: 12 },
    carb: { 적게: 3, 보통: 6, 많이: 10 }, fat: { 적게: 4, 보통: 9, 많이: 15 } },
  { id: 'fruit',   label: '과일',            emoji: '🍎',
    kcal: { 적게: 40, 보통: 80, 많이: 140 }, protein: { 적게: 0, 보통: 1, 많이: 1 },
    carb: { 적게: 10, 보통: 20, 많이: 35 }, fat: { 적게: 0, 보통: 0, 많이: 0 } },
  { id: 'dessert', label: '디저트·음료',      emoji: '🍰',
    kcal: { 적게: 80, 보통: 180, 많이: 320 }, protein: { 적게: 1, 보통: 2, 많이: 3 },
    carb: { 적게: 12, 보통: 26, 많이: 46 }, fat: { 적게: 3, 보통: 7, 많이: 12 } },
]
