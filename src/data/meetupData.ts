// ── 모임 카테고리 & 활동비 지원 규칙 ──────────────────────────────────────────
//
// 루디아는 회원들의 건강 모임 활동을 응원하기 위해 활동비 일부를 지원해요.
// 카테고리별로 지원 대상 항목·지원 비율·월 한도가 다르게 설정되어 있어요.

export type MeetupCategory =
  | 'badminton'
  | 'gym'
  | 'yoga'
  | 'running'
  | 'cooking'
  | 'tennis'
  | 'swimming'
  | 'hiking'
  | 'cycling'
  | 'etc'

export interface SubsidyRule {
  percent: number       // 지원 비율 (%)
  capPerMonth: number   // 1인당 월 최대 지원금 (원)
  eligibleItems: string // 지원 대상 항목 설명
}

export interface CategoryMeta {
  label: string
  emoji: string
  color: string
  bg: string
  gradient: string
  subsidy: SubsidyRule
}

export const CATEGORY_META: Record<MeetupCategory, CategoryMeta> = {
  badminton: {
    label: '배드민턴', emoji: '🏸', color: '#0891b2', bg: 'rgba(8,145,178,0.1)',
    gradient: 'linear-gradient(135deg,#cffafe,#67e8f9)',
    subsidy: { percent: 30, capPerMonth: 30000, eligibleItems: '코트 대관료 · 라켓/셔틀콕 구매비' },
  },
  gym: {
    label: '헬스', emoji: '💪', color: '#dc2626', bg: 'rgba(220,38,38,0.1)',
    gradient: 'linear-gradient(135deg,#fee2e2,#fca5a5)',
    subsidy: { percent: 20, capPerMonth: 40000, eligibleItems: '헬스장 회원권 · PT 수강료' },
  },
  yoga: {
    label: '요가·필라테스', emoji: '🧘', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',
    gradient: 'linear-gradient(135deg,#ede9fe,#c4b5fd)',
    subsidy: { percent: 20, capPerMonth: 40000, eligibleItems: '스튜디오 수강료 · 매트 등 소품 구매비' },
  },
  running: {
    label: '러닝', emoji: '🏃', color: '#ea580c', bg: 'rgba(234,88,12,0.1)',
    gradient: 'linear-gradient(135deg,#ffedd5,#fdba74)',
    subsidy: { percent: 20, capPerMonth: 20000, eligibleItems: '러닝화 구매비 · 대회 참가비' },
  },
  cooking: {
    label: '쿠킹', emoji: '🍳', color: '#ca8a04', bg: 'rgba(202,138,4,0.1)',
    gradient: 'linear-gradient(135deg,#fef9c3,#fde047)',
    subsidy: { percent: 15, capPerMonth: 20000, eligibleItems: '재료비 · 쿠킹 클래스 수강료' },
  },
  tennis: {
    label: '테니스', emoji: '🎾', color: '#65a30d', bg: 'rgba(101,163,13,0.1)',
    gradient: 'linear-gradient(135deg,#ecfccb,#bef264)',
    subsidy: { percent: 25, capPerMonth: 30000, eligibleItems: '코트 대관료 · 레슨비' },
  },
  swimming: {
    label: '수영', emoji: '🏊', color: '#2563eb', bg: 'rgba(37,99,235,0.1)',
    gradient: 'linear-gradient(135deg,#dbeafe,#93c5fd)',
    subsidy: { percent: 20, capPerMonth: 30000, eligibleItems: '수영장 이용권 · 강습비' },
  },
  hiking: {
    label: '등산', emoji: '⛰️', color: '#16a34a', bg: 'rgba(22,163,74,0.1)',
    gradient: 'linear-gradient(135deg,#dcfce7,#86efac)',
    subsidy: { percent: 15, capPerMonth: 15000, eligibleItems: '등산 장비 · 교통비' },
  },
  cycling: {
    label: '자전거', emoji: '🚴', color: '#0d9488', bg: 'rgba(13,148,136,0.1)',
    gradient: 'linear-gradient(135deg,#ccfbf1,#5eead4)',
    subsidy: { percent: 15, capPerMonth: 15000, eligibleItems: '대여료 · 정비/장비 구매비' },
  },
  etc: {
    label: '기타 모임', emoji: '✨', color: '#e11d5a', bg: 'rgba(225,29,90,0.1)',
    gradient: 'linear-gradient(135deg,#fce7f3,#fbcfe8)',
    subsidy: { percent: 15, capPerMonth: 15000, eligibleItems: '모임 활동에 사용한 비용' },
  },
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_META) as MeetupCategory[]

// ── 모임 ───────────────────────────────────────────────────────────────────

export interface MeetupGroup {
  id: string
  name: string
  category: MeetupCategory
  description: string
  location: string
  schedule: string
  maxMembers: number
  memberIds: string[]
  createdBy: string
  createdByName: string
  createdAt: string
}

export const SEED_GROUPS: MeetupGroup[] = [
  {
    id: 'g-badminton-1', name: '주말 배드민턴 클럽', category: 'badminton',
    description: '매주 토요일 아침, 가볍게 땀 흘리며 스트레스 풀어요! 초보자 대환영 🏸',
    location: '서울 강남구 · 대치 실내체육관', schedule: '매주 토 09:00',
    maxMembers: 16, memberIds: ['ludia', 'user-1', 'user-2'],
    createdBy: 'ludia', createdByName: '루디아',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'g-gym-1', name: '여성 전용 웨이트 모임', category: 'gym',
    description: '주 3회 같이 헬스장 가요. 호르몬 사이클에 맞춘 루틴 정보도 나눠요 💪',
    location: '서울 마포구 · 스포애니 홍대점', schedule: '월·수·금 19:00',
    maxMembers: 12, memberIds: ['ludia', 'user-3'],
    createdBy: 'ludia', createdByName: '루디아',
    createdAt: new Date(Date.now() - 86400000 * 21).toISOString(),
  },
  {
    id: 'g-yoga-1', name: '퇴근 후 요가 소모임', category: 'yoga',
    description: '생리통·수면의 질 개선을 목표로 하는 힐링 요가 모임이에요 🧘‍♀️',
    location: '서울 서초구 · 요가스튜디오 숨', schedule: '매주 화·목 20:00',
    maxMembers: 10, memberIds: ['ludia', 'user-4', 'user-5'],
    createdBy: 'user-4', createdByName: '요가하는언니',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'g-cooking-1', name: '건강식 홈쿠킹 클래스', category: 'cooking',
    description: '한 달에 두 번, 임신·항암·다이어트 맞춤 건강식을 함께 만들어요 🍳',
    location: '서울 성동구 · 쿠킹스튜디오 온', schedule: '격주 일 14:00',
    maxMembers: 8, memberIds: ['ludia'],
    createdBy: 'ludia', createdByName: '루디아',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'g-running-1', name: '한강 러닝크루', category: 'running',
    description: '주말 아침 한강 러닝 후 브런치까지! 페이스 안 따져요 🏃‍♀️',
    location: '서울 영등포구 · 여의도 한강공원', schedule: '매주 일 07:00',
    maxMembers: 20, memberIds: ['ludia', 'user-6'],
    createdBy: 'user-6', createdByName: 'PT받는중',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
]

// ── 모임 활동 게시글 (인증 + 지출) ──────────────────────────────────────────

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
  subsidyRequestId?: string  // 이 인증글에 연결된 지원금 신청
}

// ── 활동비 지원 신청 ─────────────────────────────────────────────────────────

export interface SubsidyRequest {
  id: string
  userId: string
  userName: string
  groupId: string
  groupName: string
  category: MeetupCategory
  itemDescription: string
  amountSpent: number
  subsidyAmount: number
  monthKey: string  // 'YYYY-MM', 월 한도 계산용
  status: '지급예정' | '지급완료'
  createdAt: string
}

export function monthKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function calcSubsidy(category: MeetupCategory, amountSpent: number, alreadyUsedThisMonth: number): number {
  const rule = CATEGORY_META[category].subsidy
  const raw = Math.floor(amountSpent * (rule.percent / 100))
  const remainingCap = Math.max(0, rule.capPerMonth - alreadyUsedThisMonth)
  return Math.min(raw, remainingCap)
}
