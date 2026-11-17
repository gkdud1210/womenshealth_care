import type { FacilityType } from '@/data/facilityData'
import type { MeetupCategory } from '@/data/meetupData'

// ── 루디아피드 관심 테마 ────────────────────────────────────────────────────
//
// 케어카드 말고, 내가 좋아하는 운동·뷰티·제휴 테마로 피드를 골라 봐요.
// 테마를 고르면 그 테마와 관련된 글(키워드·운동 종목)과 루디아 크루 시설, 같이 할 모임을 한 번에 보여줘요.

export type ThemeSection = '운동' | '뷰티·힐링' | '생활·제휴'

export interface FeedTheme {
  id: string
  label: string
  emoji: string
  section: ThemeSection
  gradient: string
  /** 글 제목·본문·종목에 이 말이 들어 있으면 관련 글이에요 */
  keywords: string[]
  /** 이 종류의 글은 키워드가 없어도 관련 글이에요 (예: 요리 → 레시피) */
  postTypes?: string[]
  /** 함께 보여줄 루디아 크루 시설 종류 (빈 배열이면 모든 제휴 시설) */
  facilityTypes: FacilityType[]
  /** 같이 할 모임 종목 */
  meetup?: MeetupCategory
}

const SPORT = 'linear-gradient(135deg,#3b82f6,#06b6d4)'
const BEAUTY = 'linear-gradient(135deg,#ec4899,#a855f7)'
const LIFE = 'linear-gradient(135deg,#f59e0b,#f43f75)'

export const FEED_THEMES: FeedTheme[] = [
  // 운동
  { id: 'swim',      label: '수영',          emoji: '🏊', section: '운동', gradient: SPORT,
    keywords: ['수영', '자유형', '평영', '배영', '접영', '수영장', '물살'], facilityTypes: ['pool', 'sports_center'], meetup: 'swimming' },
  { id: 'gym',       label: '헬스',          emoji: '💪', section: '운동', gradient: SPORT,
    keywords: ['헬스', '웨이트', '스쿼트', '데드리프트', '근력', '근육', 'pt'], facilityTypes: ['fitness', 'sports_center'], meetup: 'gym' },
  { id: 'yoga',      label: '요가·필라테스', emoji: '🧘', section: '운동', gradient: SPORT,
    keywords: ['요가', '필라테스', '스트레칭', '골반', '코어'], facilityTypes: ['yoga'], meetup: 'yoga' },
  { id: 'tennis',    label: '테니스',        emoji: '🎾', section: '운동', gradient: SPORT,
    keywords: ['테니스', '포핸드', '백핸드', '서브'], facilityTypes: ['tennis'], meetup: 'tennis' },
  { id: 'badminton', label: '배드민턴',      emoji: '🏸', section: '운동', gradient: SPORT,
    keywords: ['배드민턴', '셔틀콕', '하이클리어', '스매시'], facilityTypes: ['badminton', 'sports_center'], meetup: 'badminton' },
  { id: 'golf',      label: '골프',          emoji: '⛳', section: '운동', gradient: SPORT,
    keywords: ['골프', '스윙', '어드레스', '백스윙'], facilityTypes: ['golf'], meetup: 'golf' },
  { id: 'running',   label: '러닝',          emoji: '🏃', section: '운동', gradient: SPORT,
    keywords: ['러닝', '달리기', '조깅', '마라톤'], facilityTypes: ['jogging'], meetup: 'running' },
  { id: 'walking',   label: '걷기·등산',     emoji: '🚶', section: '운동', gradient: SPORT,
    keywords: ['걷기', '산책', '등산', '트레킹', '만보'], facilityTypes: ['walking'], meetup: 'walking' },
  { id: 'climbing',  label: '클라이밍',      emoji: '🧗', section: '운동', gradient: SPORT,
    keywords: ['클라이밍', '볼더링', '암벽'], facilityTypes: ['climbing'], meetup: 'climbing' },

  // 뷰티·힐링
  { id: 'massage',   label: '마사지·스파',   emoji: '💆', section: '뷰티·힐링', gradient: BEAUTY,
    keywords: ['마사지', '스파', '찜질', '사우나', '림프', '붓기', '반신욕'], facilityTypes: ['massage', 'spa', 'sauna'] },
  { id: 'hair',      label: '헤어·두피',     emoji: '💇', section: '뷰티·힐링', gradient: BEAUTY,
    keywords: ['미용실', '헤어', '두피', '탈모', '머리카락', '모발', '펌', '염색'], facilityTypes: ['hair_salon', 'head_spa'] },
  { id: 'brow',      label: '반영구·속눈썹', emoji: '✏️', section: '뷰티·힐링', gradient: BEAUTY,
    keywords: ['반영구', '눈썹', '속눈썹', '아이라인'], facilityTypes: ['semi_permanent', 'lash'] },
  { id: 'nail',      label: '네일',          emoji: '💅', section: '뷰티·힐링', gradient: BEAUTY,
    keywords: ['네일', '손톱', '발톱', '패디'], facilityTypes: ['nail'] },
  { id: 'skin',      label: '피부·왁싱',     emoji: '🧖', section: '뷰티·힐링', gradient: BEAUTY,
    keywords: ['피부', '여드름', '트러블', '홍조', '보습', '왁싱', '기미'], facilityTypes: ['skincare', 'waxing'] },

  // 생활·제휴
  { id: 'cooking',   label: '요리·레시피',   emoji: '🍳', section: '생활·제휴', gradient: LIFE,
    keywords: ['레시피', '요리', '쿠킹', '베이킹'], postTypes: ['recipe'], facilityTypes: ['kitchen'], meetup: 'cooking' },
  { id: 'partner',   label: '제휴 혜택',     emoji: '🎁', section: '생활·제휴', gradient: LIFE,
    keywords: ['제휴', '할인', '회원가', '혜택'], facilityTypes: [] },
]

export const THEME_SECTIONS: ThemeSection[] = ['운동', '뷰티·힐링', '생활·제휴']

export function findTheme(id: string | null): FeedTheme | null {
  return FEED_THEMES.find(t => t.id === id) ?? null
}

/** 이 글이 테마와 관련 있는지 — 운동 종목·제목·본문·후기 루틴에서 키워드를 찾아요 */
export function postMatchesTheme(
  post: { type: string; title: string; content: string; sport?: string; review?: { routine?: string; exercise?: string; diet?: string } },
  theme: FeedTheme,
): boolean {
  if (theme.postTypes?.includes(post.type)) return true
  const hay = [post.sport ?? '', post.title, post.content,
    post.review?.routine ?? '', post.review?.exercise ?? '', post.review?.diet ?? ''].join(' ').toLowerCase()
  return theme.keywords.some(k => hay.includes(k.toLowerCase()))
}

// ── 내 관심 테마 (기기에 기억해요) ──────────────────────────────────────────

const MY_THEMES_KEY = 'ludia_feed_my_themes_v1'

export function loadMyThemes(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(MY_THEMES_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter(id => typeof id === 'string' && findTheme(id)) : []
  } catch { return [] }
}

export function saveMyThemes(ids: string[]) {
  try { localStorage.setItem(MY_THEMES_KEY, JSON.stringify(ids)) } catch {}
}
