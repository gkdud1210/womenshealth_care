import type { ShopProduct } from '@/data/shopProducts'

// ── 루디아샵 상품 분류 (쇼핑몰 메뉴) ────────────────────────────────────────
//
// 큰 분류(영양제·식품·뷰티…) → 세부 분류(비타민·유산균…)로 나눠요.
// 고민별(주기·호르몬 등) 분류는 shopProducts.ts 의 CATEGORY_META 를 그대로 써요.

export interface ShopSub { id: string; label: string; emoji: string }
export interface ShopDept {
  id: string
  label: string
  emoji: string
  color: string
  bg: string
  subs: ShopSub[]
}

export const SHOP_DEPTS: ShopDept[] = [
  { id: 'supplement', label: '영양제', emoji: '💊', color: '#e11d48', bg: '#fff1f2', subs: [
    { id: 'vitamin',    label: '비타민·면역',   emoji: '🍊' },
    { id: 'omega',      label: '오메가·GLA',    emoji: '🐟' },
    { id: 'probiotics', label: '유산균',        emoji: '🦠' },
    { id: 'fertility',  label: '임신 준비',     emoji: '🤰' },
    { id: 'sleep',      label: '수면·스트레스', emoji: '🌙' },
  ] },
  { id: 'food', label: '식품', emoji: '🥗', color: '#16a34a', bg: '#f0fdf4', subs: [
    { id: 'salad',        label: '샐러드·도시락', emoji: '🥙' },
    { id: 'subscription', label: '식단 구독',     emoji: '📦' },
    { id: 'tea',          label: '차·음료',       emoji: '🍵' },
    { id: 'snack',        label: '건강 간식',     emoji: '🥜' },
  ] },
  { id: 'beauty', label: '뷰티·바디', emoji: '🧴', color: '#9333ea', bg: '#faf5ff', subs: [
    { id: 'bodywash', label: '바디워시',       emoji: '🫧' },
    { id: 'lotion',   label: '바디로션·오일',  emoji: '🧴' },
    { id: 'aroma',    label: '아로마·향',      emoji: '🌿' },
    { id: 'skincare', label: '스킨케어',       emoji: '✨' },
  ] },
  { id: 'feminine', label: '여성용품', emoji: '🌸', color: '#db2777', bg: '#fdf2f8', subs: [
    { id: 'pad',    label: '생리대·패드',  emoji: '🩷' },
    { id: 'ywash',  label: '여성청결제',   emoji: '💧' },
    { id: 'period', label: '생리 케어템',  emoji: '🔥' },
  ] },
  { id: 'fitness', label: '운동용품', emoji: '🧘', color: '#2563eb', bg: '#eff6ff', subs: [
    { id: 'mat',  label: '요가·필라테스', emoji: '🧘' },
    { id: 'wear', label: '운동복',        emoji: '👟' },
    { id: 'gear', label: '홈트 기구',     emoji: '🏋️' },
  ] },
  { id: 'home', label: '홈케어·기기', emoji: '🏠', color: '#ea580c', bg: '#fff7ed', subs: [
    { id: 'device',     label: '찜질·온열',     emoji: '♨️' },
    { id: 'sleepgoods', label: '수면용품',      emoji: '😴' },
    { id: 'testkit',    label: '자가 검사 키트', emoji: '🧪' },
  ] },
]

// 기존 상품의 세부 분류 (새 상품은 shopSub 필드에 직접 적어요)
const SUB_BY_PRODUCT: Record<string, string> = {
  lymphia_inner_rest_oil: 'lotion',
  ph_balance_wash: 'ywash',
  gla_supplement: 'omega',
  magnesium_lotion: 'lotion',
  lavender_aroma_rollon: 'aroma',
  theanine_magnesium: 'sleep',
  organic_pad: 'pad',
  ewg_clean_bodywash: 'bodywash',
  curcumin_immunity: 'vitamin',
  folate_inositol: 'fertility',
  coq10_antioxidant: 'fertility',
  ludia_salad_subscription: 'subscription',
  lowcal_balance_lunchbox: 'salad',
  highprotein_bulkup_lunchbox: 'salad',
  gentle_recovery_meal_subscription: 'subscription',
}

export function productSub(p: ShopProduct): string | null {
  return p.shopSub ?? SUB_BY_PRODUCT[p.id] ?? null
}

export function productDept(p: ShopProduct): ShopDept | null {
  const sub = productSub(p)
  return sub ? SHOP_DEPTS.find(d => d.subs.some(s => s.id === sub)) ?? null : null
}

export function findDept(id: string | null) {
  return SHOP_DEPTS.find(d => d.id === id) ?? null
}

// ── 광고 배너 ───────────────────────────────────────────────────────────────

export interface ShopAd {
  id: string
  eyebrow: string
  title: string
  sub: string
  cta: string
  emoji: string
  gradient: string
  /** 누르면 갈 곳 — 큰 분류 / 세부 분류 / 상품 */
  to: { dept: string; sub?: string } | { product: string }
}

export const SHOP_ADS: ShopAd[] = [
  { id: 'ad-period', eyebrow: '생리 전 1주 케어', title: '아랫배를 따뜻하게,\n온열 케어템 모음', sub: '찜질팩 · 온열 복대 · 생리컵',
    cta: '케어템 보러가기', emoji: '🔥', gradient: 'linear-gradient(135deg,#fb7185,#e11d48)', to: { dept: 'feminine', sub: 'period' } },
  { id: 'ad-salad', eyebrow: '새벽 배송', title: '한 끼 320kcal\n샐러드 정기구독', sub: '루디아 AI가 칼로리·나트륨을 맞춰요',
    cta: '구독 알아보기', emoji: '🥗', gradient: 'linear-gradient(135deg,#4ade80,#15803d)', to: { product: 'ludia_salad_subscription' } },
  { id: 'ad-fertility', eyebrow: '임신 준비', title: '엽산 · 이노시톨 ·\nCoQ10 한 번에', sub: '가임 준비 영양제 모아보기',
    cta: '영양제 보기', emoji: '🤰', gradient: 'linear-gradient(135deg,#fbbf24,#ea580c)', to: { dept: 'supplement', sub: 'fertility' } },
  { id: 'ad-fitness', eyebrow: '루디아제휴 회원 추천', title: '집에서도 필라테스,\n홈트 용품 기획전', sub: '요가 매트 · 폼롤러 · 레깅스',
    cta: '기획전 보기', emoji: '🧘', gradient: 'linear-gradient(135deg,#818cf8,#4338ca)', to: { dept: 'fitness' } },
]

/** 상품 목록 중간에 끼워 넣는 작은 광고 */
export const SHOP_MID_AD: ShopAd = {
  id: 'ad-sleep', eyebrow: '오늘 밤 푹 자고 싶다면', title: '수면·스트레스 케어', sub: '테아닌 · 마그네슘 영양제',
  cta: '보기', emoji: '🌙', gradient: 'linear-gradient(135deg,#6366f1,#a855f7)', to: { dept: 'supplement', sub: 'sleep' },
}
