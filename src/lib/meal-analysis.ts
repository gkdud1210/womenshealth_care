/**
 * 루디아 호출 — 식단 분석 로직
 *
 * AI 비전 분석(`/api/ludia/vision-nutrition`, dev 전용)이 불가능한 배포 환경에서도
 * 항상 동작하도록, 음식 태그 기반 로컬 칼로리 추정 + 케어카드 맞춤 평가를 제공해요.
 * 루디아샵 식단 상품 추천은 AI/로컬 분석 결과 여부와 상관없이 항상 이 파일에서 계산해요.
 */

import { SHOP_PRODUCTS, type ShopProduct } from '@/data/shopProducts'
import {
  mealTargetKcal, FOOD_TAGS,
  type MealType, type Portion, type CareMealProfile,
} from '@/data/mealWellness'

export interface MealFood {
  name: string
  calories: number
}

/** 이 끼니가 집밥인지 배달·외식·가공식품 위주인지 — 사진 AI가 추정하거나 직접 선택해요.
 *  '독소·환경 노출' 원인 진단과 주간 추이에 반영돼요. */
export type DietPattern = 'home' | 'delivery' | 'processed' | 'unclear'

export const DIET_PATTERN_META: Record<DietPattern, { label: string; emoji: string }> = {
  home:      { label: '집밥·직접 조리', emoji: '🍚' },
  delivery:  { label: '배달·외식',      emoji: '🛵' },
  processed: { label: '가공·인스턴트',  emoji: '📦' },
  unclear:   { label: '잘 모르겠어요',   emoji: '🤔' },
}

export interface MealAnalysisResult {
  foods: MealFood[]
  totalCalories: number
  protein?: number
  carb?: number
  fat?: number
  dietPattern: DietPattern
  dietPatternNote?: string
  assessment: string
  addSuggestions: string[]
  removeSuggestions: string[]
  source: 'ai' | 'manual'
}

const MEAL_LABEL: Record<MealType, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁' }

// ── 루디아샵 식단 상품 추천 ───────────────────────────────────────────────

export function recommendMealProducts(profile: CareMealProfile, limit = 2): ShopProduct[] {
  const pool = SHOP_PRODUCTS.filter(p => p.category === 'meal_wellness')
  const scored = pool
    .map(p => ({ p, score: p.ludiaTags.filter(t => profile.shopKeywords.includes(t)).length }))
    .sort((a, b) => b.score - a.score)
  const matched = scored.filter(s => s.score > 0).slice(0, limit).map(s => s.p)
  if (matched.length >= limit) return matched
  const rest = pool.filter(p => !matched.includes(p)).slice(0, limit - matched.length)
  return [...matched, ...rest]
}

// ── 로컬 태그 기반 칼로리 추정 (수동 선택 폴백) ────────────────────────────

export function estimateFromTags(
  selections: { tagId: string; portion: Portion }[],
): { foods: MealFood[]; totalCalories: number; protein: number; carb: number; fat: number } {
  let totalCalories = 0
  let protein = 0
  let carb = 0
  let fat = 0
  const foods: MealFood[] = []
  for (const sel of selections) {
    const tag = FOOD_TAGS.find(t => t.id === sel.tagId)
    if (!tag) continue
    const kcal = tag.kcal[sel.portion]
    totalCalories += kcal
    protein += tag.protein[sel.portion]
    carb += tag.carb[sel.portion]
    fat += tag.fat[sel.portion]
    foods.push({ name: `${tag.emoji} ${tag.label} · ${sel.portion}`, calories: kcal })
  }
  return { foods, totalCalories, protein, carb, fat }
}

// ── 케어카드 맞춤 평가 문구 (AI 실패 시 로컬 생성에도, UI 보조 텍스트에도 사용) ──

export function buildLocalAssessment(
  mealType: MealType,
  totalCalories: number,
  profile: CareMealProfile,
): { assessment: string; addSuggestions: string[]; removeSuggestions: string[] } {
  const [lo, hi] = mealTargetKcal(profile, mealType)
  const label = MEAL_LABEL[mealType]

  let assessment: string
  if (totalCalories < lo * 0.7) {
    assessment = `${label} 식사량이 목표(${lo}~${hi}kcal)보다 많이 부족해요. 에너지가 떨어지기 쉬우니 다음 끼니에서 꼭 보충해주세요.`
  } else if (totalCalories < lo) {
    assessment = `목표보다 살짝 가벼운 ${label}이에요. ${profile.boost[0] ?? '단백질'}을 조금 더 채워도 좋아요.`
  } else if (totalCalories <= hi) {
    assessment = `${label} 식사가 목표 범위(${lo}~${hi}kcal) 안에 잘 맞아요. ${profile.focus}`
  } else if (totalCalories <= hi * 1.3) {
    assessment = `목표보다 살짝 높아요. 다음 끼니를 가볍게 조절하면 하루 전체 균형은 맞출 수 있어요.`
  } else {
    assessment = `목표(${lo}~${hi}kcal)보다 꽤 높은 편이에요.${profile.avoid[0] ? ` ${profile.avoid[0]}은 줄이고,` : ''} 다음 끼니는 가볍게 구성해보세요.`
  }

  return {
    assessment,
    addSuggestions: profile.boost.slice(0, 2),
    removeSuggestions: totalCalories > hi ? profile.avoid.slice(0, 2) : [],
  }
}

export function buildManualResult(
  mealType: MealType,
  selections: { tagId: string; portion: Portion }[],
  profile: CareMealProfile,
  dietPattern: DietPattern = 'unclear',
): MealAnalysisResult {
  const { foods, totalCalories, protein, carb, fat } = estimateFromTags(selections)
  const { assessment, addSuggestions, removeSuggestions } = buildLocalAssessment(mealType, totalCalories, profile)
  return { foods, totalCalories, protein, carb, fat, dietPattern, assessment, addSuggestions, removeSuggestions, source: 'manual' }
}
