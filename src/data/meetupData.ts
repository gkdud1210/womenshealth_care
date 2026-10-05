import { ONLINE_CODE, type PlaceRef } from '@/data/regionData'

// ── 모임 종목 카테고리 ──────────────────────────────────────────────────────

export type MeetupCategory =
  | 'badminton'
  | 'gym'
  | 'yoga'
  | 'running'
  | 'walking'
  | 'tennis'
  | 'swimming'
  | 'hiking'
  | 'cycling'
  | 'climbing'
  | 'dance'
  | 'golf'
  | 'table_tennis'
  | 'volleyball'
  | 'bowling'
  | 'pilates'
  | 'cooking'
  | 'baking'
  | 'tea'
  | 'piano'
  | 'guitar'
  | 'violin'
  | 'singing'
  | 'drawing'
  | 'crafts'
  | 'study'
  | 'mind'
  | 'etc'

export interface CategoryMeta {
  label: string
  emoji: string
  color: string
  bg: string
  gradient: string
}

export const CATEGORY_META: Record<MeetupCategory, CategoryMeta> = {
  badminton: {
    label: '배드민턴', emoji: '🏸', color: '#0891b2', bg: 'rgba(8,145,178,0.1)',
    gradient: 'linear-gradient(135deg,#cffafe,#67e8f9)',
  },
  gym: {
    label: '헬스·웨이트', emoji: '💪', color: '#dc2626', bg: 'rgba(220,38,38,0.1)',
    gradient: 'linear-gradient(135deg,#fee2e2,#fca5a5)',
  },
  yoga: {
    label: '요가', emoji: '🧘', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',
    gradient: 'linear-gradient(135deg,#ede9fe,#c4b5fd)',
  },
  running: {
    label: '러닝', emoji: '🏃', color: '#ea580c', bg: 'rgba(234,88,12,0.1)',
    gradient: 'linear-gradient(135deg,#ffedd5,#fdba74)',
  },
  walking: {
    label: '걷기·산책', emoji: '🚶', color: '#0284c7', bg: 'rgba(2,132,199,0.1)',
    gradient: 'linear-gradient(135deg,#e0f2fe,#7dd3fc)',
  },
  tennis: {
    label: '테니스', emoji: '🎾', color: '#65a30d', bg: 'rgba(101,163,13,0.1)',
    gradient: 'linear-gradient(135deg,#ecfccb,#bef264)',
  },
  swimming: {
    label: '수영', emoji: '🏊', color: '#2563eb', bg: 'rgba(37,99,235,0.1)',
    gradient: 'linear-gradient(135deg,#dbeafe,#93c5fd)',
  },
  hiking: {
    label: '등산·트레킹', emoji: '⛰️', color: '#16a34a', bg: 'rgba(22,163,74,0.1)',
    gradient: 'linear-gradient(135deg,#dcfce7,#86efac)',
  },
  cycling: {
    label: '자전거', emoji: '🚴', color: '#0d9488', bg: 'rgba(13,148,136,0.1)',
    gradient: 'linear-gradient(135deg,#ccfbf1,#5eead4)',
  },
  climbing: {
    label: '클라이밍', emoji: '🧗', color: '#b45309', bg: 'rgba(180,83,9,0.1)',
    gradient: 'linear-gradient(135deg,#fef3c7,#fcd34d)',
  },
  dance: {
    label: '댄스', emoji: '💃', color: '#db2777', bg: 'rgba(219,39,119,0.1)',
    gradient: 'linear-gradient(135deg,#fce7f3,#f9a8d4)',
  },
  golf: {
    label: '골프', emoji: '⛳', color: '#4d7c0f', bg: 'rgba(77,124,15,0.1)',
    gradient: 'linear-gradient(135deg,#f7fee7,#a3e635)',
  },
  table_tennis: {
    label: '탁구', emoji: '🏓', color: '#e11d48', bg: 'rgba(225,29,72,0.1)',
    gradient: 'linear-gradient(135deg,#ffe4e6,#fda4af)',
  },
  volleyball: {
    label: '배구', emoji: '🏐', color: '#d97706', bg: 'rgba(217,119,6,0.1)',
    gradient: 'linear-gradient(135deg,#fef3c7,#fbbf24)',
  },
  bowling: {
    label: '볼링', emoji: '🎳', color: '#475569', bg: 'rgba(71,85,105,0.1)',
    gradient: 'linear-gradient(135deg,#f1f5f9,#cbd5e1)',
  },
  pilates: {
    label: '필라테스', emoji: '🤸', color: '#a21caf', bg: 'rgba(162,28,175,0.1)',
    gradient: 'linear-gradient(135deg,#fae8ff,#f0abfc)',
  },
  cooking: {
    label: '쿠킹·건강식', emoji: '🍳', color: '#ca8a04', bg: 'rgba(202,138,4,0.1)',
    gradient: 'linear-gradient(135deg,#fef9c3,#fde047)',
  },
  baking: {
    label: '베이킹', emoji: '🧁', color: '#c2410c', bg: 'rgba(194,65,12,0.1)',
    gradient: 'linear-gradient(135deg,#ffedd5,#fed7aa)',
  },
  tea: {
    label: '차·티타임', emoji: '🍵', color: '#15803d', bg: 'rgba(21,128,61,0.1)',
    gradient: 'linear-gradient(135deg,#dcfce7,#bbf7d0)',
  },
  piano: {
    label: '피아노', emoji: '🎹', color: '#334155', bg: 'rgba(51,65,85,0.1)',
    gradient: 'linear-gradient(135deg,#f1f5f9,#94a3b8)',
  },
  guitar: {
    label: '기타(악기)', emoji: '🎸', color: '#b91c1c', bg: 'rgba(185,28,28,0.1)',
    gradient: 'linear-gradient(135deg,#fee2e2,#f87171)',
  },
  violin: {
    label: '바이올린·현악', emoji: '🎻', color: '#92400e', bg: 'rgba(146,64,14,0.1)',
    gradient: 'linear-gradient(135deg,#fef3c7,#d97706)',
  },
  singing: {
    label: '노래·합창', emoji: '🎤', color: '#be185d', bg: 'rgba(190,24,93,0.1)',
    gradient: 'linear-gradient(135deg,#fce7f3,#f472b6)',
  },
  drawing: {
    label: '그림·드로잉', emoji: '🎨', color: '#0369a1', bg: 'rgba(3,105,161,0.1)',
    gradient: 'linear-gradient(135deg,#e0f2fe,#38bdf8)',
  },
  crafts: {
    label: '공예·뜨개', emoji: '🧶', color: '#9d174d', bg: 'rgba(157,23,77,0.1)',
    gradient: 'linear-gradient(135deg,#fce7f3,#f9a8d4)',
  },
  study: {
    label: '독서·스터디', emoji: '📚', color: '#4f46e5', bg: 'rgba(79,70,229,0.1)',
    gradient: 'linear-gradient(135deg,#e0e7ff,#a5b4fc)',
  },
  mind: {
    label: '명상·마음챙김', emoji: '🕯️', color: '#9333ea', bg: 'rgba(147,51,234,0.1)',
    gradient: 'linear-gradient(135deg,#f3e8ff,#d8b4fe)',
  },
  etc: {
    label: '기타 모임', emoji: '✨', color: '#e11d5a', bg: 'rgba(225,29,90,0.1)',
    gradient: 'linear-gradient(135deg,#fce7f3,#fbcfe8)',
  },
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_META) as MeetupCategory[]

// ── 종목 분류 (전체 종목 보기 창) ───────────────────────────────────────────

export interface CategorySection {
  label: string
  categories: MeetupCategory[]
}

export interface CategoryGroup {
  id: string
  label: string
  emoji: string
  sections: CategorySection[]   // 세부 분류가 없으면 label '' 인 섹션 하나
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'sports', label: '스포츠', emoji: '🏅',
    sections: [
      { label: '라켓 스포츠', categories: ['badminton', 'tennis', 'table_tennis'] },
      { label: '구기·레저',   categories: ['volleyball', 'golf', 'bowling'] },
      { label: '러닝·걷기',   categories: ['running', 'walking'] },
      { label: '피트니스',    categories: ['gym', 'yoga', 'pilates', 'dance'] },
      { label: '아웃도어',    categories: ['hiking', 'cycling', 'climbing'] },
      { label: '수상 스포츠', categories: ['swimming'] },
    ],
  },
  {
    id: 'food', label: '요리', emoji: '🍳',
    sections: [{ label: '', categories: ['cooking', 'baking', 'tea'] }],
  },
  {
    id: 'music', label: '악기·음악', emoji: '🎵',
    sections: [{ label: '', categories: ['piano', 'guitar', 'violin', 'singing'] }],
  },
  {
    id: 'art', label: '취미·공예', emoji: '🎨',
    sections: [{ label: '', categories: ['drawing', 'crafts'] }],
  },
  {
    id: 'mind', label: '마음·배움', emoji: '🕯️',
    sections: [{ label: '', categories: ['mind', 'study'] }],
  },
  {
    id: 'etc', label: '기타', emoji: '✨',
    sections: [{ label: '', categories: ['etc'] }],
  },
]

export function isMeetupCategory(v: string): v is MeetupCategory {
  return (ALL_CATEGORIES as string[]).includes(v)
}

// ── 사용 언어 ───────────────────────────────────────────────────────────────

export const LANGUAGE_OPTIONS = ['한국어', '한국어·영어', '영어', '현지어'] as const
export type MeetupLanguage = (typeof LANGUAGE_OPTIONS)[number]

// ── 모임 ────────────────────────────────────────────────────────────────────

export interface MeetupPlace extends PlaceRef {
  /** 체육관·스튜디오 등 상세 장소 (자유 입력) */
  venue: string
}

export interface MeetupGroup {
  id: string
  name: string
  category: MeetupCategory
  description: string
  place: MeetupPlace
  /** 현지에 없어도 원격으로 함께할 수 있는 모임 */
  onlineJoinable: boolean
  language: MeetupLanguage
  schedule: string
  /** 현지 기준 시간 안내 (예: '현지시간 기준') */
  timeNote?: string
  maxMembers: number
  memberIds: string[]
  createdBy: string
  createdByName: string
  createdAt: string
}

const daysAgo = (n: number) => new Date(Date.now() - 86400000 * n).toISOString()

export const SEED_GROUPS: MeetupGroup[] = [
  // ── 한국 ──
  {
    id: 'g-badminton-1', name: '주말 배드민턴 클럽', category: 'badminton',
    description: '매주 토요일 아침, 가볍게 땀 흘리며 스트레스 풀어요! 초보자 대환영 🏸',
    place: { country: 'KR', region: 'seoul', city: 'gangnam', venue: '대치 실내체육관' },
    onlineJoinable: false, language: '한국어', schedule: '매주 토 09:00',
    maxMembers: 16, memberIds: ['ludia', 'user-1', 'user-2'],
    createdBy: 'ludia', createdByName: '루디아', createdAt: daysAgo(10),
  },
  {
    id: 'g-gym-1', name: '여성 전용 웨이트 모임', category: 'gym',
    description: '주 3회 같이 헬스장 가요. 호르몬 사이클에 맞춘 루틴 정보도 나눠요 💪',
    place: { country: 'KR', region: 'seoul', city: 'mapo', venue: '홍대 근처 헬스장' },
    onlineJoinable: false, language: '한국어', schedule: '월·수·금 19:00',
    maxMembers: 12, memberIds: ['ludia', 'user-3'],
    createdBy: 'ludia', createdByName: '루디아', createdAt: daysAgo(21),
  },
  {
    id: 'g-yoga-1', name: '퇴근 후 요가 소모임', category: 'yoga',
    description: '생리통·수면의 질 개선을 목표로 하는 힐링 요가 모임이에요 🧘‍♀️',
    place: { country: 'KR', region: 'seoul', city: 'seocho', venue: '요가스튜디오 숨' },
    onlineJoinable: true, language: '한국어', schedule: '매주 화·목 20:00',
    maxMembers: 10, memberIds: ['ludia', 'user-4', 'user-5'],
    createdBy: 'user-4', createdByName: '요가하는언니', createdAt: daysAgo(5),
  },
  {
    id: 'g-cooking-1', name: '건강식 홈쿠킹 클래스', category: 'cooking',
    description: '한 달에 두 번, 임신·항암·다이어트 맞춤 건강식을 함께 만들어요 🍳',
    place: { country: 'KR', region: 'seoul', city: 'seongdong', venue: '쿠킹스튜디오 온' },
    onlineJoinable: false, language: '한국어', schedule: '격주 일 14:00',
    maxMembers: 8, memberIds: ['ludia'],
    createdBy: 'ludia', createdByName: '루디아', createdAt: daysAgo(2),
  },
  {
    id: 'g-running-1', name: '한강 러닝크루', category: 'running',
    description: '주말 아침 한강 러닝 후 브런치까지! 페이스 안 따져요 🏃‍♀️',
    place: { country: 'KR', region: 'seoul', city: 'yeongdeungpo', venue: '여의도 한강공원' },
    onlineJoinable: false, language: '한국어', schedule: '매주 일 07:00',
    maxMembers: 20, memberIds: ['ludia', 'user-6'],
    createdBy: 'user-6', createdByName: 'PT받는중', createdAt: daysAgo(15),
  },
  {
    id: 'g-hiking-kr-1', name: '제주 오름 트레킹', category: 'hiking',
    description: '한 달에 한 번 제주 오름을 천천히 걸어요. 여행 중 합류도 환영! ⛰️',
    place: { country: 'KR', region: 'jeju', city: 'jejusi', venue: '오름 집결지 (매월 공지)' },
    onlineJoinable: false, language: '한국어', schedule: '매월 셋째 주 토 08:00',
    maxMembers: 15, memberIds: ['ludia'],
    createdBy: 'ludia', createdByName: '루디아', createdAt: daysAgo(30),
  },

  // ── 해외 ──
  {
    id: 'g-us-ny-1', name: '뉴욕 플러싱 아침 러닝', category: 'running',
    description: '플러싱 메도우 공원에서 주 2회 러닝해요. 이민 초기 정착 정보도 나눠요 🗽',
    place: { country: 'US', region: 'ny', city: 'flushing', venue: 'Flushing Meadows Corona Park' },
    onlineJoinable: false, language: '한국어·영어', schedule: '매주 수·토 07:00',
    timeNote: '현지시간 기준',
    maxMembers: 20, memberIds: ['user-7', 'user-8'],
    createdBy: 'user-7', createdByName: '뉴욕댁', createdAt: daysAgo(12),
  },
  {
    id: 'g-us-ca-1', name: '어바인 여성 요가 & 브런치', category: 'yoga',
    description: '아이 등원 후 오전 요가. 갱년기·호르몬 케어 이야기도 편하게 나눠요 ☀️',
    place: { country: 'US', region: 'ca', city: 'irvine', venue: 'Irvine Community Center' },
    onlineJoinable: true, language: '한국어', schedule: '매주 화·목 10:00',
    timeNote: '현지시간 기준 (PT)',
    maxMembers: 12, memberIds: ['user-9'],
    createdBy: 'user-9', createdByName: '캘리맘', createdAt: daysAgo(8),
  },
  {
    id: 'g-jp-tokyo-1', name: '도쿄 신오쿠보 배드민턴', category: 'badminton',
    description: '주말 저녁 체육관 대관해서 함께 쳐요. 유학생·주재원 환영 🏸',
    place: { country: 'JP', region: 'tokyo', city: 'shin-okubo', venue: '신주쿠 스포츠센터' },
    onlineJoinable: false, language: '한국어·영어', schedule: '매주 토 18:00',
    timeNote: '현지시간 기준 (JST)',
    maxMembers: 16, memberIds: ['user-10'],
    createdBy: 'user-10', createdByName: '도쿄살이', createdAt: daysAgo(18),
  },
  {
    id: 'g-ca-van-1', name: '밴쿠버 주말 하이킹', category: 'hiking',
    description: '노스밴 근교 트레일을 계절마다 걸어요. 초보 코스부터 시작해요 🌲',
    place: { country: 'CA', region: 'bc', city: 'vancouver', venue: 'North Vancouver 트레일' },
    onlineJoinable: false, language: '한국어·영어', schedule: '격주 토 09:00',
    timeNote: '현지시간 기준 (PT)',
    maxMembers: 14, memberIds: ['user-11'],
    createdBy: 'user-11', createdByName: '밴쿠버새댁', createdAt: daysAgo(25),
  },
  {
    id: 'g-au-syd-1', name: '시드니 스트라스필드 필라테스', category: 'pilates',
    description: '저녁 필라테스 소모임. 워홀·유학생도 부담 없이 오세요 🇦🇺',
    place: { country: 'AU', region: 'nsw', city: 'strathfield', venue: 'Strathfield Studio' },
    onlineJoinable: false, language: '한국어', schedule: '매주 월·목 19:30',
    timeNote: '현지시간 기준 (AEST)',
    maxMembers: 10, memberIds: ['user-12'],
    createdBy: 'user-12', createdByName: '시드니언니', createdAt: daysAgo(6),
  },
  {
    id: 'g-gb-ldn-1', name: '런던 뉴몰든 건강식 쿠킹', category: 'cooking',
    description: '현지 재료로 만드는 한식 기반 건강식. 한 달에 두 번 모여요 🍲',
    place: { country: 'GB', region: 'london', city: 'newmalden', venue: 'New Malden 커뮤니티 키친' },
    onlineJoinable: true, language: '한국어', schedule: '격주 일 13:00',
    timeNote: '현지시간 기준 (GMT)',
    maxMembers: 8, memberIds: ['user-13'],
    createdBy: 'user-13', createdByName: '런던쿡', createdAt: daysAgo(4),
  },
  {
    id: 'g-sg-1', name: '싱가포르 아침 걷기 모임', category: 'walking',
    description: '더워지기 전 아침에 보타닉가든 한 바퀴! 주재원 가족 환영 🌴',
    place: { country: 'SG', region: 'sg', city: 'central-sg', venue: 'Botanic Gardens' },
    onlineJoinable: false, language: '한국어·영어', schedule: '매주 화·금 07:30',
    timeNote: '현지시간 기준 (SGT)',
    maxMembers: 15, memberIds: ['user-14'],
    createdBy: 'user-14', createdByName: '싱가폴댁', createdAt: daysAgo(9),
  },
  {
    id: 'g-vn-hcmc-1', name: '호치민 푸미흥 테니스', category: 'tennis',
    description: '7군 코트에서 주 2회 레슨 겸 랠리. 라켓 대여 가능해요 🎾',
    place: { country: 'VN', region: 'hcmc', city: 'd7', venue: '푸미흥 테니스 코트' },
    onlineJoinable: false, language: '한국어', schedule: '매주 수·토 17:00',
    timeNote: '현지시간 기준 (ICT)',
    maxMembers: 12, memberIds: ['user-15'],
    createdBy: 'user-15', createdByName: '사이공맘', createdAt: daysAgo(14),
  },
  {
    id: 'g-de-fra-1', name: '프랑크푸르트 주말 자전거', category: 'cycling',
    description: '마인강 따라 라이딩 후 카페. 날씨 좋은 날엔 소풍도 가요 🚴‍♀️',
    place: { country: 'DE', region: 'hessen', city: 'frankfurt', venue: '마인강변 집결' },
    onlineJoinable: false, language: '한국어·영어', schedule: '매주 일 10:00',
    timeNote: '현지시간 기준 (CET)',
    maxMembers: 12, memberIds: ['user-16'],
    createdBy: 'user-16', createdByName: '프랑크언니', createdAt: daysAgo(20),
  },

  // ── 온라인 ──
  {
    id: 'g-online-1', name: '시차 무관 홈트 인증방', category: 'gym',
    description: '어느 나라에 있든 각자 시간에 홈트하고 인증만 남겨요. 주 3회 목표! 🌍',
    place: { country: ONLINE_CODE, region: 'async', city: 'challenge', venue: '앱 인증 + 오픈채팅' },
    onlineJoinable: true, language: '한국어', schedule: '주 3회 자율',
    maxMembers: 50, memberIds: ['ludia', 'user-17', 'user-18'],
    createdBy: 'ludia', createdByName: '루디아', createdAt: daysAgo(3),
  },
  {
    id: 'g-online-2', name: '온라인 새벽 명상 (줌)', category: 'mind',
    description: '한국시간 06:00 / 미국 동부 17:00. 20분 함께 호흡하고 하루를 시작해요 🕯️',
    place: { country: ONLINE_CODE, region: 'live', city: 'zoom', venue: 'Zoom 링크 (가입 시 안내)' },
    onlineJoinable: true, language: '한국어', schedule: '매주 월~금 06:00 (KST)',
    maxMembers: 40, memberIds: ['ludia', 'user-19'],
    createdBy: 'ludia', createdByName: '루디아', createdAt: daysAgo(7),
  },
  {
    id: 'g-online-3', name: '여성 건강 북클럽 (온라인)', category: 'study',
    description: '한 달에 한 권, 호르몬·갱년기·영양 관련 책을 읽고 화상으로 나눠요 📚',
    place: { country: ONLINE_CODE, region: 'live', city: 'zoom', venue: 'Google Meet' },
    onlineJoinable: true, language: '한국어', schedule: '매월 마지막 주 토 21:00 (KST)',
    maxMembers: 20, memberIds: ['user-20'],
    createdBy: 'user-20', createdByName: '책읽는밤', createdAt: daysAgo(11),
  },
]

// ── 모임 활동 게시글 ─────────────────────────────────────────────────────────

export interface MeetupComment {
  id: string
  authorName: string
  authorEmoji: string
  text: string
  createdAt: string
}

export interface MeetupPost {
  id: string
  groupId: string
  authorId: string
  authorName: string
  authorEmoji: string
  content: string
  image?: string
  createdAt: string
  likes: number
  comments: MeetupComment[]
}

// ── 저장된 예전 데이터 호환 ──────────────────────────────────────────────────

/** 예전 v1 구조(문자열 location)로 저장된 모임을 새 구조로 옮겨요. */
export function normalizeGroup(raw: unknown): MeetupGroup | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as Record<string, unknown>
  if (typeof g.id !== 'string' || typeof g.name !== 'string') return null

  const category = typeof g.category === 'string' && isMeetupCategory(g.category) ? g.category : 'etc'
  const legacyLocation = typeof g.location === 'string' ? g.location : ''
  const place = (g.place && typeof g.place === 'object')
    ? g.place as MeetupPlace
    : { country: 'KR', region: 'seoul', city: 'gangnam', venue: legacyLocation || '장소 미정' }

  return {
    id: g.id,
    name: g.name,
    category,
    description: typeof g.description === 'string' ? g.description : '',
    place: {
      country: place.country || 'KR',
      region: place.region || 'seoul',
      city: place.city || 'gangnam',
      venue: place.venue || legacyLocation || '장소 미정',
    },
    onlineJoinable: g.onlineJoinable === true || place.country === ONLINE_CODE,
    language: (LANGUAGE_OPTIONS as readonly string[]).includes(g.language as string)
      ? g.language as MeetupLanguage
      : '한국어',
    schedule: typeof g.schedule === 'string' ? g.schedule : '미정',
    timeNote: typeof g.timeNote === 'string' ? g.timeNote : undefined,
    maxMembers: typeof g.maxMembers === 'number' ? g.maxMembers : 10,
    memberIds: Array.isArray(g.memberIds) ? g.memberIds.filter((x): x is string => typeof x === 'string') : [],
    createdBy: typeof g.createdBy === 'string' ? g.createdBy : 'unknown',
    createdByName: typeof g.createdByName === 'string' ? g.createdByName : '알 수 없음',
    createdAt: typeof g.createdAt === 'string' ? g.createdAt : new Date().toISOString(),
  }
}
