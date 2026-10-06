import type { PlaceRef } from '@/data/regionData'
import type { MeetupCategory } from '@/data/meetupData'

// ── 운동 · 활동 시설 ────────────────────────────────────────────────────────
//
// 모임 탭 옆 "시설 찾기"에서 보여주는 장소들이에요.
// - 공원·산책로처럼 누구나 무료로 이용하는 공공 장소는 실제 장소예요.
// - 유료 시설과 루디아 제휴 할인은 아직 실제 제휴가 없어서 화면 구성을 위한 예시(sample) 데이터예요.
//   실제 제휴가 맺어지면 sample 을 빼고 정보를 바꿔 주세요.

export type FacilityType =
  | 'sports_center' | 'pool' | 'badminton' | 'tennis' | 'fitness' | 'yoga'
  | 'climbing' | 'jogging' | 'walking' | 'kitchen'

export interface FacilityTypeMeta {
  label: string
  emoji: string
  color: string
  bg: string
  /** 이 시설에서 할 수 있는 모임 종목 — 관련 모임 연결에 써요 */
  categories: MeetupCategory[]
}

export const FACILITY_TYPE_META: Record<FacilityType, FacilityTypeMeta> = {
  sports_center: { label: '스포츠센터', emoji: '🏟️', color: '#0f766e', bg: 'rgba(15,118,110,0.1)', categories: ['gym', 'swimming', 'badminton', 'table_tennis', 'volleyball'] },
  pool:          { label: '수영장',     emoji: '🏊', color: '#2563eb', bg: 'rgba(37,99,235,0.1)',  categories: ['swimming'] },
  badminton:     { label: '배드민턴장', emoji: '🏸', color: '#0891b2', bg: 'rgba(8,145,178,0.1)',  categories: ['badminton'] },
  tennis:        { label: '테니스장',   emoji: '🎾', color: '#65a30d', bg: 'rgba(101,163,13,0.1)', categories: ['tennis'] },
  fitness:       { label: '헬스장',     emoji: '💪', color: '#dc2626', bg: 'rgba(220,38,38,0.1)',  categories: ['gym'] },
  yoga:          { label: '요가·필라테스', emoji: '🧘', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', categories: ['yoga', 'pilates'] },
  climbing:      { label: '클라이밍장', emoji: '🧗', color: '#b45309', bg: 'rgba(180,83,9,0.1)',   categories: ['climbing'] },
  jogging:       { label: '조깅 코스',  emoji: '🏃', color: '#ea580c', bg: 'rgba(234,88,12,0.1)',  categories: ['running'] },
  walking:       { label: '걷기 코스',  emoji: '🚶', color: '#0284c7', bg: 'rgba(2,132,199,0.1)',  categories: ['walking', 'hiking'] },
  kitchen:       { label: '공유 주방',  emoji: '🍳', color: '#ca8a04', bg: 'rgba(202,138,4,0.1)',  categories: ['cooking', 'baking'] },
}

export const ALL_FACILITY_TYPES = Object.keys(FACILITY_TYPE_META) as FacilityType[]

export interface FacilityPrice {
  /** null 이면 무료 */
  amount: number | null
  unit: string          // '1회', '1시간', '월' …
  currency: 'KRW' | 'USD' | 'JPY' | 'CAD' | 'AUD' | 'GBP' | 'SGD'
}

export interface Facility {
  id: string
  name: string
  type: FacilityType
  place: PlaceRef
  lat: number
  lng: number
  address: string
  hours: string
  price: FacilityPrice
  /** 루디아 회원 혜택 (제휴 시설) */
  ludia?: { memberAmount: number | null; perk: string }
  amenities: string[]
  description: string
  /** 코스형 장소의 거리 */
  distanceKm?: number
  /** 예시 데이터 (실제 제휴 전) */
  sample?: boolean
}

export function formatPrice(amount: number | null, currency: FacilityPrice['currency']): string {
  if (amount === null) return '무료'
  if (amount === 0) return '무료'
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency', currency, maximumFractionDigits: currency === 'KRW' || currency === 'JPY' ? 0 : 2,
  }).format(amount)
}

export function discountRate(f: Facility): number | null {
  if (!f.ludia || f.price.amount === null || f.ludia.memberAmount === null || f.price.amount === 0) return null
  return Math.round((1 - f.ludia.memberAmount / f.price.amount) * 100)
}

export const FACILITIES: Facility[] = [
  // ── 서울 · 공공 장소 (실제) ─────────────────────────────────────────────
  {
    id: 'f-yeouido-park', name: '여의도 한강공원', type: 'jogging',
    place: { country: 'KR', region: 'seoul', city: 'yeongdeungpo' }, lat: 37.5284, lng: 126.9326,
    address: '서울 영등포구 여의동로 330', hours: '24시간', distanceKm: 8.4,
    price: { amount: null, unit: '', currency: 'KRW' },
    amenities: ['강변 러닝 코스', '화장실', '자전거 대여', '편의점'],
    description: '한강을 따라 평평하게 이어지는 러닝·산책 코스. 저녁 러닝크루가 많이 모여요.',
  },
  {
    id: 'f-yangjaecheon', name: '양재천 산책로', type: 'walking',
    place: { country: 'KR', region: 'seoul', city: 'gangnam' }, lat: 37.4842, lng: 127.0560,
    address: '서울 강남구 개포동 양재천 일대', hours: '24시간', distanceKm: 6.2,
    price: { amount: null, unit: '', currency: 'KRW' },
    amenities: ['그늘 많은 숲길', '징검다리', '벤치'],
    description: '나무 그늘이 이어지는 하천 산책로. 걷기 모임 입문 코스로 좋아요.',
  },
  {
    id: 'f-seoul-forest', name: '서울숲', type: 'walking',
    place: { country: 'KR', region: 'seoul', city: 'seongdong' }, lat: 37.5444, lng: 127.0374,
    address: '서울 성동구 뚝섬로 273', hours: '24시간 (일부 시설 별도)', distanceKm: 3.5,
    price: { amount: null, unit: '', currency: 'KRW' },
    amenities: ['숲길 산책', '사슴 방사장', '화장실', '카페'],
    description: '도심 속 큰 숲 공원. 가볍게 걷고 명상하기 좋아요.',
  },
  {
    id: 'f-olympic-park', name: '올림픽공원 둘레길', type: 'jogging',
    place: { country: 'KR', region: 'seoul', city: 'songpa' }, lat: 37.5206, lng: 127.1214,
    address: '서울 송파구 올림픽로 424', hours: '05:00 – 22:00', distanceKm: 5.0,
    price: { amount: null, unit: '', currency: 'KRW' },
    amenities: ['완만한 언덕 코스', '화장실', '음수대'],
    description: '몽촌토성을 따라 도는 순환 코스. 적당한 오르막이 있어 인터벌 러닝에 좋아요.',
  },
  {
    id: 'f-namsan', name: '남산 둘레길', type: 'walking',
    place: { country: 'KR', region: 'seoul', city: 'jung' }, lat: 37.5512, lng: 126.9882,
    address: '서울 중구 남산공원길', hours: '24시간', distanceKm: 7.5,
    price: { amount: null, unit: '', currency: 'KRW' },
    amenities: ['숲길', '전망 포인트', '화장실'],
    description: '서울 도심을 내려다보며 걷는 숲길. 경사가 완만한 북측 순환로가 인기예요.',
  },

  // ── 서울 · 유료 시설 (예시) ────────────────────────────────────────────
  {
    id: 'f-gangnam-sports', name: '강남 스포츠센터 (예시)', type: 'sports_center', sample: true,
    place: { country: 'KR', region: 'seoul', city: 'gangnam' }, lat: 37.4995, lng: 127.0630,
    address: '서울 강남구 대치동 일대', hours: '06:00 – 22:00 (일 휴관)',
    price: { amount: 9000, unit: '1회 자유이용', currency: 'KRW' },
    ludia: { memberAmount: 6500, perk: '첫 방문 1회 무료 체험' },
    amenities: ['실내 수영장', '배드민턴 코트 6면', '헬스장', '샤워실', '주차'],
    description: '수영·배드민턴·헬스를 한 곳에서. 여성 전용 샤워실이 따로 있어요.',
  },
  {
    id: 'f-daechi-badminton', name: '대치 배드민턴 전용구장 (예시)', type: 'badminton', sample: true,
    place: { country: 'KR', region: 'seoul', city: 'gangnam' }, lat: 37.4946, lng: 127.0571,
    address: '서울 강남구 대치동 일대', hours: '06:00 – 23:00',
    price: { amount: 20000, unit: '코트 1시간', currency: 'KRW' },
    ludia: { memberAmount: 15000, perk: '루디아 모임 단체 예약 시 셔틀콕 제공' },
    amenities: ['코트 8면', '라켓 대여', '샤워실'],
    description: '천장이 높은 배드민턴 전용 구장. 주말 오전 루디아 배드민턴 모임이 열려요.',
  },
  {
    id: 'f-mapo-pool', name: '마포 구민 수영장 (예시)', type: 'pool', sample: true,
    place: { country: 'KR', region: 'seoul', city: 'mapo' }, lat: 37.5600, lng: 126.9080,
    address: '서울 마포구 일대', hours: '06:00 – 21:30',
    price: { amount: 5000, unit: '자유수영 1회', currency: 'KRW' },
    ludia: { memberAmount: 4000, perk: '여성 아쿠아로빅 강습 10% 할인' },
    amenities: ['25m 6레인', '유아풀', '여성 전용 시간대'],
    description: '자유수영과 아쿠아로빅 강습을 운영하는 구민 수영장.',
  },
  {
    id: 'f-mapo-gym', name: '홍대 우먼스 피트니스 (예시)', type: 'fitness', sample: true,
    place: { country: 'KR', region: 'seoul', city: 'mapo' }, lat: 37.5563, lng: 126.9236,
    address: '서울 마포구 서교동 일대', hours: '06:00 – 24:00',
    price: { amount: 79000, unit: '월', currency: 'KRW' },
    ludia: { memberAmount: 59000, perk: 'PT 체험 1회 + 인바디 측정 무료' },
    amenities: ['여성 전용', '프리웨이트존', '파우더룸'],
    description: '여성 전용 헬스장. 생리 주기에 맞춘 운동 강도 상담을 해줘요.',
  },
  {
    id: 'f-seocho-yoga', name: '서초 요가·필라테스 스튜디오 (예시)', type: 'yoga', sample: true,
    place: { country: 'KR', region: 'seoul', city: 'seocho' }, lat: 37.4920, lng: 127.0100,
    address: '서울 서초구 서초동 일대', hours: '07:00 – 22:00',
    price: { amount: 30000, unit: '그룹 수업 1회', currency: 'KRW' },
    ludia: { memberAmount: 22000, perk: '골반 교정 클래스 첫 수업 50%' },
    amenities: ['기구 필라테스', '소도구 요가', '매트 제공'],
    description: '골반·자세 교정에 집중한 소규모 수업. 루디아 자세 교정 케어카드와 연계돼요.',
  },
  {
    id: 'f-songpa-tennis', name: '송파 테니스장 (예시)', type: 'tennis', sample: true,
    place: { country: 'KR', region: 'seoul', city: 'songpa' }, lat: 37.5150, lng: 127.1150,
    address: '서울 송파구 일대', hours: '06:00 – 22:00',
    price: { amount: 12000, unit: '코트 2시간', currency: 'KRW' },
    amenities: ['하드코트 4면', '야간 조명'],
    description: '구립 야외 하드코트. 온라인 예약제로 운영돼요.',
  },
  {
    id: 'f-seongsu-climbing', name: '성수 클라이밍짐 (예시)', type: 'climbing', sample: true,
    place: { country: 'KR', region: 'seoul', city: 'seongdong' }, lat: 37.5446, lng: 127.0557,
    address: '서울 성동구 성수동 일대', hours: '10:00 – 23:00',
    price: { amount: 25000, unit: '일일권', currency: 'KRW' },
    ludia: { memberAmount: 20000, perk: '암벽화 대여 무료' },
    amenities: ['볼더링', '초보 강습', '샤워실'],
    description: '초보 볼더링 강습이 잘 되어 있는 실내 클라이밍짐.',
  },
  {
    id: 'f-seongsu-kitchen', name: '성수 공유주방 쿠킹스튜디오 (예시)', type: 'kitchen', sample: true,
    place: { country: 'KR', region: 'seoul', city: 'seongdong' }, lat: 37.5420, lng: 127.0490,
    address: '서울 성동구 성수동 일대', hours: '09:00 – 22:00 (예약제)',
    price: { amount: 40000, unit: '주방 2시간 대관', currency: 'KRW' },
    ludia: { memberAmount: 30000, perk: '루디아 식단 레시피 재료 키트 10% 할인' },
    amenities: ['조리대 6개', '오븐', '식기 제공', '최대 12명'],
    description: '소모임 쿠킹 클래스나 건강식 밀프렙 모임에 맞는 공유 주방.',
  },

  // ── 해외 ───────────────────────────────────────────────────────────────
  {
    id: 'f-flushing-park', name: 'Flushing Meadows Corona Park', type: 'jogging',
    place: { country: 'US', region: 'ny', city: 'flushing' }, lat: 40.7400, lng: -73.8407,
    address: 'Queens, NY', hours: '06:00 – 01:00', distanceKm: 5.0,
    price: { amount: null, unit: '', currency: 'USD' },
    amenities: ['호수 둘레 러닝 코스', '테니스 센터', '화장실'],
    description: '뉴욕 퀸즈의 큰 공원. 호수를 도는 평지 코스가 러닝 모임에 좋아요.',
  },
  {
    id: 'f-irvine-center', name: 'Irvine 커뮤니티 스포츠센터 (예시)', type: 'sports_center', sample: true,
    place: { country: 'US', region: 'ca', city: 'irvine' }, lat: 33.6780, lng: -117.8150,
    address: 'Irvine, CA', hours: '06:00 – 21:00',
    price: { amount: 15, unit: '1회 이용', currency: 'USD' },
    ludia: { memberAmount: 10, perk: '요가 클래스 첫 달 20% 할인' },
    amenities: ['체육관', '요가룸', '수영장', '피클볼 코트'],
    description: '어바인 한인 여성 모임이 자주 쓰는 다목적 센터.',
  },
  {
    id: 'f-stanley-park', name: 'Stanley Park Seawall', type: 'walking',
    place: { country: 'CA', region: 'bc', city: 'vancouver' }, lat: 49.3017, lng: -123.1417,
    address: 'Vancouver, BC', hours: '24시간', distanceKm: 9.0,
    price: { amount: null, unit: '', currency: 'CAD' },
    amenities: ['해안 산책로', '자전거 도로 분리', '화장실'],
    description: '바다를 따라 공원을 한 바퀴 도는 산책·러닝 코스.',
  },
  {
    id: 'f-shinjuku-sports', name: '신주쿠 스포츠센터 (예시)', type: 'sports_center', sample: true,
    place: { country: 'JP', region: 'tokyo', city: 'shin-okubo' }, lat: 35.7050, lng: 139.7020,
    address: '東京都新宿区', hours: '09:00 – 22:00',
    price: { amount: 600, unit: '1회 이용', currency: 'JPY' },
    amenities: ['체육관', '수영장', '트레이닝룸'],
    description: '구립 스포츠센터. 저렴하게 수영과 배드민턴을 즐길 수 있어요.',
  },
  {
    id: 'f-strathfield-studio', name: 'Strathfield 필라테스 스튜디오 (예시)', type: 'yoga', sample: true,
    place: { country: 'AU', region: 'nsw', city: 'strathfield' }, lat: -33.8790, lng: 151.0830,
    address: 'Strathfield, NSW', hours: '06:30 – 20:30',
    price: { amount: 30, unit: '그룹 수업 1회', currency: 'AUD' },
    ludia: { memberAmount: 24, perk: '워홀·유학생 10회권 추가 할인' },
    amenities: ['리포머', '매트', '한국어 강사'],
    description: '한국어 수업이 있는 필라테스 스튜디오.',
  },
  {
    id: 'f-newmalden-kitchen', name: 'New Malden 커뮤니티 키친 (예시)', type: 'kitchen', sample: true,
    place: { country: 'GB', region: 'london', city: 'newmalden' }, lat: 51.4010, lng: -0.2560,
    address: 'New Malden, London', hours: '10:00 – 21:00 (예약제)',
    price: { amount: 25, unit: '주방 2시간 대관', currency: 'GBP' },
    ludia: { memberAmount: 18, perk: '한식 재료 마켓 5% 할인' },
    amenities: ['조리대 4개', '오븐', '최대 10명'],
    description: '런던 한인타운의 공유 주방. 소모임 쿠킹 클래스에 좋아요.',
  },
  {
    id: 'f-botanic', name: 'Singapore Botanic Gardens', type: 'walking',
    place: { country: 'SG', region: 'sg', city: 'central-sg' }, lat: 1.3138, lng: 103.8159,
    address: '1 Cluny Rd, Singapore', hours: '05:00 – 24:00', distanceKm: 4.0,
    price: { amount: null, unit: '', currency: 'SGD' },
    amenities: ['정원 산책로', '호수', '화장실'],
    description: '유네스코 세계유산 정원. 아침 걷기 모임 장소로 인기예요.',
  },
]
