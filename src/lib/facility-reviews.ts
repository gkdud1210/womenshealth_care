import type { FacilityType } from '@/data/facilityData'

// ── 시설 리뷰 ────────────────────────────────────────────────────────────────
// 시설마다 사진·글 리뷰와 장점 키워드를 남겨요. 모임 대화방처럼 지금은 기기(localStorage)에 저장돼요.
// 키워드는 리뷰를 쓴 사람이 고른 것을 모아서 "가격 저렴 12" 처럼 시설의 장점으로 보여줘요.

export const REVIEWS_KEY = 'ludia_facility_reviews_v1'

/** 리뷰 한 개에 올릴 수 있는 사진 수 */
export const MAX_REVIEW_PHOTOS = 3
/** 시설 하나에 보관하는 최대 리뷰 수 (사진 때문에 용량이 커지지 않도록) */
const MAX_PER_FACILITY = 100

export interface FacilityReview {
  id: string
  facilityId: string
  authorId: string
  authorName: string
  /** 별점 1 – 5 (별점 기능 전에 쓴 리뷰에는 없어요) */
  rating?: number
  text: string
  images: string[]
  keywords: string[]
  createdAt: string
}

/** facilityId → 리뷰 (최신순) */
export type ReviewMap = Record<string, FacilityReview[]>

// 어느 시설에나 쓸 수 있는 장점
const COMMON_KEYWORDS = ['가격 저렴', '주차 편리', '시설 깔끔', '친절해요', '한산해요', '대중교통 편리']

// 시설 종류별로 더 고를 수 있는 장점
const TYPE_KEYWORDS: Partial<Record<FacilityType, string[]>> = {
  pool:          ['물이 깨끗해요', '세면도구 비치', '수건 대여', '드라이기 비치', '샤워실 넓어요', '사물함 넉넉', '레인 여유', '강습 좋아요'],
  sports_center: ['세면도구 비치', '수건 대여', '드라이기 비치', '샤워실 넓어요', '사물함 넉넉', '강습 좋아요'],
  badminton:     ['코트 넓어요', '바닥 미끄럼 없어요', '조명 밝아요', '냉난방 잘돼요', '초보도 편해요', '샤워실 있어요', '강습 좋아요'],
  tennis:        ['코트 관리 잘돼요', '야간 조명', '예약 쉬워요', '초보도 편해요'],
  fitness:       ['기구 다양해요', '수건 대여', '운동복 대여', '드라이기 비치', '여성 친화적', 'PT 좋아요'],
  yoga:          ['강사님 친절', '소수 정예', '매트 제공', '여성 친화적', '초보도 편해요'],
  climbing:      ['문제 다양해요', '장비 대여', '초보도 편해요', '샤워실 있어요'],
  jogging:       ['코스 평탄해요', '경치 좋아요', '화장실 있어요', '밤에도 밝아요', '그늘 많아요'],
  walking:       ['경치 좋아요', '그늘 많아요', '화장실 있어요', '밤에도 밝아요', '유모차 가능'],
  kitchen:       ['조리도구 완비', '공간 넓어요', '예약 쉬워요', '뒷정리 편해요'],
}

export function keywordOptions(type: FacilityType): string[] {
  return Array.from(new Set([...COMMON_KEYWORDS, ...(TYPE_KEYWORDS[type] ?? [])]))
}

export function loadReviews(): ReviewMap {
  if (typeof window === 'undefined') return {}
  try {
    const s = localStorage.getItem(REVIEWS_KEY)
    const parsed = s ? JSON.parse(s) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch { return {} }
}

/** 저장 공간이 모자라면 false — 사진을 줄여 달라고 안내해요 */
export function saveReviews(map: ReviewMap): boolean {
  try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(map)); return true } catch { return false }
}

export function addReview(map: ReviewMap, review: FacilityReview): ReviewMap {
  const list = [review, ...(map[review.facilityId] ?? [])].slice(0, MAX_PER_FACILITY)
  return { ...map, [review.facilityId]: list }
}

export function removeReview(map: ReviewMap, facilityId: string, reviewId: string): ReviewMap {
  return { ...map, [facilityId]: (map[facilityId] ?? []).filter(r => r.id !== reviewId) }
}

/** 평균 별점 (소수 첫째 자리) — 별점 있는 리뷰가 없으면 null */
export function averageRating(reviews: FacilityReview[]): { avg: number; count: number } | null {
  const rated = reviews.filter(r => typeof r.rating === 'number')
  if (rated.length === 0) return null
  const sum = rated.reduce((a, r) => a + (r.rating ?? 0), 0)
  return { avg: Math.round((sum / rated.length) * 10) / 10, count: rated.length }
}

/** 키워드별로 몇 명이 골랐는지 — 많은 순 */
export function keywordStats(reviews: FacilityReview[]): { keyword: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const r of reviews) for (const k of r.keywords) counts.set(k, (counts.get(k) ?? 0) + 1)
  return Array.from(counts, ([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword, 'ko'))
}
