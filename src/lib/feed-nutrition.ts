/**
 * 루디아피드 — 게시물 사진 칼로리·영양성분 분석
 *
 * 인스타그램처럼 음식·카페 사진을 올리면 AI 비전(`/api/ludia/feed-nutrition`, dev 전용)이
 * 사진 속 음식/음료를 하나씩 인식해 칼로리와 영양성분을 추정해요.
 * 정적 배포(API 라우트 없음)나 AI 실패 시에는 캡션 텍스트의 음식 키워드로 로컬 추정해요.
 */

import { ludiaApiUrl } from '@/lib/ludia-api'

export interface FeedNutritionItem {
  name: string
  emoji?: string
  calories: number
  protein: number
  carb: number
  fat: number
  sugar: number
  sodium: number   // mg
  caffeine: number // mg
}

export interface FeedNutritionTotal {
  calories: number
  protein: number
  carb: number
  fat: number
  sugar: number
  sodium: number
  caffeine: number
}

export interface FeedNutrition {
  /** 사진/캡션에서 음식·음료를 찾지 못하면 false */
  isFood: boolean
  items: FeedNutritionItem[]
  total: FeedNutritionTotal
  summary: string
  tip?: string
  source: 'ai' | 'caption'
  analyzedAt: string
}

// ── 로컬 키워드 영양 DB (1인분/1잔 기준 대략값) ─────────────────────────────

type DbRow = { keys: string[]; name: string; emoji: string } & Omit<FeedNutritionItem, 'name' | 'emoji'>

const r = (
  keys: string[], name: string, emoji: string,
  calories: number, protein: number, carb: number, fat: number,
  sugar: number, sodium: number, caffeine = 0,
): DbRow => ({ keys, name, emoji, calories, protein, carb, fat, sugar, sodium, caffeine })

// 더 구체적인 키워드(예: 바닐라라떼)를 먼저 둬서 일반 키워드(라떼)보다 먼저 매칭되게 해요.
const FOOD_DB: DbRow[] = [
  // 카페 음료
  r(['바닐라라떼', '바닐라 라떼'], '바닐라 라떼', '🥛', 250, 8, 35, 8, 32, 150, 150),
  r(['카라멜마끼아또', '카라멜 마끼아또'], '카라멜 마키아토', '🥛', 270, 8, 38, 9, 34, 160, 150),
  r(['돌체라떼', '돌체 라떼'], '돌체 라떼', '🥛', 290, 9, 40, 10, 38, 170, 150),
  r(['콜드브루'], '콜드브루', '☕', 10, 0, 1, 0, 0, 10, 200),
  r(['아메리카노', 'americano'], '아메리카노', '☕', 10, 1, 1, 0, 0, 10, 150),
  r(['카페라떼', '라떼', 'latte'], '카페 라떼', '🥛', 180, 10, 14, 9, 13, 140, 150),
  r(['카푸치노'], '카푸치노', '☕', 130, 7, 10, 7, 9, 110, 150),
  r(['에스프레소'], '에스프레소', '☕', 5, 0, 1, 0, 0, 5, 75),
  r(['말차라떼', '녹차라떼'], '말차 라떼', '🍵', 240, 8, 34, 8, 30, 130, 60),
  r(['프라푸치노', '프라페'], '프라푸치노', '🥤', 380, 5, 58, 14, 54, 230, 90),
  r(['버블티', '밀크티'], '버블 밀크티', '🧋', 350, 3, 65, 9, 40, 90, 60),
  r(['스무디'], '과일 스무디', '🥤', 260, 3, 60, 1, 50, 30),
  r(['에이드'], '에이드', '🍋', 180, 0, 45, 0, 42, 20),
  r(['핫초코', '초코라떼'], '핫초코', '🍫', 300, 9, 45, 10, 40, 180),
  // 디저트·베이커리
  r(['크로플'], '크로플', '🧇', 320, 5, 38, 16, 14, 280),
  r(['크루아상', '크로와상'], '크루아상', '🥐', 270, 5, 30, 14, 5, 310),
  r(['소금빵'], '소금빵', '🥐', 240, 5, 30, 11, 3, 450),
  r(['베이글'], '베이글', '🥯', 280, 10, 55, 2, 6, 450),
  r(['마카롱'], '마카롱', '🍬', 90, 2, 12, 4, 11, 10),
  r(['티라미수'], '티라미수', '🍰', 380, 6, 36, 23, 26, 90),
  r(['치즈케이크', '치즈 케이크'], '치즈케이크', '🍰', 400, 7, 32, 28, 24, 280),
  r(['케이크', '케익'], '조각 케이크', '🍰', 350, 4, 45, 17, 32, 200),
  r(['쿠키'], '쿠키', '🍪', 200, 2, 26, 10, 14, 150),
  r(['스콘'], '스콘', '🥐', 350, 6, 45, 16, 12, 400),
  r(['와플'], '와플', '🧇', 310, 7, 38, 14, 12, 380),
  r(['도넛', '도너츠'], '도넛', '🍩', 280, 4, 33, 15, 14, 250),
  r(['빙수'], '빙수', '🍧', 550, 12, 95, 13, 70, 180),
  r(['아이스크림', '젤라또'], '아이스크림', '🍨', 250, 4, 30, 13, 26, 80),
  r(['휘낭시에', '마들렌'], '구움과자', '🧁', 180, 3, 18, 11, 12, 70),
  // 식사
  r(['샐러드'], '샐러드', '🥗', 250, 12, 15, 15, 5, 450),
  r(['포케'], '포케', '🥗', 520, 25, 60, 18, 8, 900),
  r(['샌드위치'], '샌드위치', '🥪', 420, 18, 42, 19, 6, 900),
  r(['햄버거', '버거'], '햄버거', '🍔', 600, 28, 45, 33, 9, 1100),
  r(['피자'], '피자 2조각', '🍕', 560, 24, 64, 22, 7, 1250),
  r(['파스타', '스파게티'], '파스타', '🍝', 650, 20, 85, 24, 8, 1100),
  r(['리조또'], '리조또', '🍚', 600, 15, 75, 25, 4, 1000),
  r(['스테이크'], '스테이크', '🥩', 550, 45, 5, 38, 1, 600),
  r(['초밥', '스시'], '초밥 10pc', '🍣', 480, 22, 80, 6, 12, 1100),
  r(['라멘'], '라멘', '🍜', 700, 25, 80, 30, 5, 2600),
  r(['라면'], '라면', '🍜', 500, 10, 75, 17, 4, 1800),
  r(['마라탕'], '마라탕', '🌶️', 800, 30, 70, 45, 6, 3000),
  r(['떡볶이'], '떡볶이', '🌶️', 480, 9, 100, 5, 18, 1400),
  r(['치킨'], '치킨 반마리', '🍗', 900, 60, 30, 58, 3, 1800),
  r(['삼겹살'], '삼겹살 1인분', '🥓', 700, 30, 0, 64, 0, 90),
  r(['비빔밥'], '비빔밥', '🍚', 580, 20, 90, 15, 8, 1100),
  r(['김밥'], '김밥 1줄', '🍙', 480, 14, 75, 13, 5, 1000),
  r(['돈까스', '돈가스'], '돈가스', '🍖', 800, 30, 70, 43, 6, 1300),
  r(['쌀국수'], '쌀국수', '🍜', 480, 22, 75, 8, 5, 1900),
  r(['덮밥', '규동'], '덮밥', '🍚', 650, 25, 95, 18, 10, 1300),
  r(['브런치', '에그베네딕트'], '브런치 플레이트', '🍳', 650, 25, 45, 40, 6, 1200),
  r(['오트밀', '그래놀라', '요거트볼'], '요거트볼', '🥣', 320, 12, 45, 9, 20, 90),
  r(['아보카도토스트', '아보카도 토스트'], '아보카도 토스트', '🥑', 380, 10, 35, 22, 3, 450),
  r(['토스트'], '토스트', '🍞', 330, 12, 38, 14, 8, 600),
]

function emptyTotal(): FeedNutritionTotal {
  return { calories: 0, protein: 0, carb: 0, fat: 0, sugar: 0, sodium: 0, caffeine: 0 }
}

export function sumItems(items: FeedNutritionItem[]): FeedNutritionTotal {
  return items.reduce((t, i) => ({
    calories: t.calories + i.calories,
    protein:  t.protein  + i.protein,
    carb:     t.carb     + i.carb,
    fat:      t.fat      + i.fat,
    sugar:    t.sugar    + i.sugar,
    sodium:   t.sodium   + i.sodium,
    caffeine: t.caffeine + i.caffeine,
  }), emptyTotal())
}

/** 1일 권장량(성인 여성 기준 대략값) — 퍼센트 바 표시에 써요. */
export const DAILY_REFERENCE: FeedNutritionTotal = {
  calories: 2000, protein: 55, carb: 300, fat: 54, sugar: 50, sodium: 2000, caffeine: 400,
}

/** 사진 분석이 불가능할 때 캡션 텍스트의 음식 키워드로 추정해요. */
export function estimateFromCaption(caption: string): FeedNutrition {
  const text = caption.toLowerCase().replace(/\s+/g, '')
  const items: FeedNutritionItem[] = []
  let rest = text
  for (const row of FOOD_DB) {
    const hit = row.keys.find(k => rest.includes(k.toLowerCase().replace(/\s+/g, '')))
    if (!hit) continue
    // 같은 글자를 두 번 세지 않도록 (예: '바닐라라떼' 매칭 후 '라떼' 중복 방지)
    rest = rest.split(hit.toLowerCase().replace(/\s+/g, '')).join('|')
    const { keys: _keys, ...item } = row
    items.push(item)
  }
  const total = sumItems(items)
  const isFood = items.length > 0
  return {
    isFood,
    items,
    total,
    summary: isFood
      ? `캡션에 적힌 ${items.map(i => i.name).join(', ')} 기준으로 추정했어요. 실제 양과 레시피에 따라 차이가 있을 수 있어요.`
      : '사진 AI 분석을 사용할 수 없고, 캡션에서도 음식 이름을 찾지 못했어요. 캡션에 메뉴 이름을 적으면 추정해 드릴게요.',
    tip: isFood ? buildTip(total) : undefined,
    source: 'caption',
    analyzedAt: new Date().toISOString(),
  }
}

export function buildTip(t: FeedNutritionTotal): string | undefined {
  if (t.sugar >= 40) return `당류가 ${Math.round(t.sugar)}g으로 하루 권장량에 가까워요. 음료는 시럽을 빼거나 사이즈를 줄여보세요.`
  if (t.sodium >= 1500) return `나트륨이 ${Math.round(t.sodium)}mg으로 높은 편이에요. 국물은 남기고 물을 충분히 마셔주세요.`
  if (t.caffeine >= 300) return `카페인이 ${Math.round(t.caffeine)}mg이에요. 오후엔 디카페인으로 바꾸면 수면에 도움이 돼요.`
  if (t.calories >= 900) return '한 끼로는 칼로리가 높은 편이에요. 다음 끼니는 채소·단백질 위주로 가볍게 맞춰보세요.'
  if (t.calories > 0 && t.protein < 10 && t.calories >= 250) return '단백질이 부족한 구성이에요. 계란·요거트·두유 같은 단백질을 곁들이면 좋아요.'
  return undefined
}

// ── AI 비전 분석 (dev 서버 전용) ───────────────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/data:(.*);base64/)?.[1] ?? 'image/jpeg'
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? Math.max(0, v) : 0)

async function callFeedVisionApi(images: string[], caption: string): Promise<FeedNutrition | null> {
  try {
    const fd = new FormData()
    images.slice(0, 4).forEach((img, i) => fd.append('file', dataUrlToBlob(img), `photo-${i}.jpg`))
    fd.append('caption', caption.slice(0, 500))
    const res = await fetch(ludiaApiUrl('feed-nutrition'), { method: 'POST', body: fd, signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return null
    const data = await res.json()
    if (data.error || !Array.isArray(data.items)) return null
    const items: FeedNutritionItem[] = data.items.map((i: Record<string, unknown>) => ({
      name: String(i.name ?? '음식'),
      emoji: typeof i.emoji === 'string' ? i.emoji : undefined,
      calories: num(i.calories), protein: num(i.protein), carb: num(i.carb), fat: num(i.fat),
      sugar: num(i.sugar), sodium: num(i.sodium), caffeine: num(i.caffeine),
    }))
    const total = sumItems(items)
    return {
      isFood: data.isFood !== false && items.length > 0,
      items,
      total,
      summary: String(data.summary ?? ''),
      tip: typeof data.tip === 'string' && data.tip ? data.tip : buildTip(total),
      source: 'ai',
      analyzedAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/** 게시물 사진(+캡션)을 분석해요. AI 실패 시 캡션 기반 추정으로 자동 폴백. */
export async function analyzeFeedPost(images: string[], caption: string): Promise<FeedNutrition> {
  if (images.length > 0) {
    const ai = await callFeedVisionApi(images, caption)
    if (ai) return ai
  }
  return estimateFromCaption(caption)
}
