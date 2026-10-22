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
  /** 요금이 공개돼 있지 않아 전화로 물어봐야 하는 곳 (amount 는 null) */
  inquire?: boolean
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
  /** 월 이용권 (수영장 월 자유수영 등) — 공개된 곳만 */
  monthly?: { adult: number; youth?: number; child?: number; note?: string }
  /** 루디아 회원 혜택 (제휴 시설) */
  ludia?: { memberAmount: number | null; perk: string }
  amenities: string[]
  /** 챙겨 갈 준비물 */
  supplies?: string[]
  /** 주차 안내 */
  parking?: string
  /** 알아두면 좋은 이용 규칙 (휴관일, 이용 시간 제한 등) */
  notes?: string[]
  /** 이 시설에서 할 수 있는 종목 (없으면 시설 종류의 기본 종목) */
  activities?: MeetupCategory[]
  description: string
  /** 코스형 장소의 거리 */
  distanceKm?: number
  /** 예시 데이터 (실제 제휴 전) */
  sample?: boolean
}

/** 이 시설에서 할 수 있는 종목 */
export function facilityActivities(f: Facility): MeetupCategory[] {
  return f.activities ?? FACILITY_TYPE_META[f.type].categories
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

/** 수영장 기본 준비물 — 공공 수영장은 샤워용품을 직접 챙겨야 해요 */
const POOL_SUPPLIES = ['수영복', '수영모', '수경', '수건', '비누·샴푸 등 세면도구']

/** 배드민턴장 기본 준비물 — 공공 체육관은 라켓·신발을 빌려주지 않아요 */
const BADMINTON_SUPPLIES = ['라켓', '셔틀콕', '실내 전용 운동화', '운동복', '수건·물']

export const FACILITIES: Facility[] = [
  // ── 서울 · 공공 장소 (실제) ─────────────────────────────────────────────
  {
    id: 'f-yeouido-park', name: '여의도 한강공원', type: 'jogging',
    place: { country: 'KR', region: 'seoul', city: 'yeongdeungpo' }, lat: 37.5284, lng: 126.9326,
    address: '서울 영등포구 여의동로 330', hours: '24시간', distanceKm: 8.4,
    price: { amount: null, unit: '', currency: 'KRW' },
    amenities: ['강변 러닝 코스', '화장실', '자전거 대여', '편의점'],
    activities: ['running', 'walking', 'cycling'],
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
    activities: ['running', 'walking'],
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
    activities: ['swimming', 'badminton', 'gym'],
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
    activities: ['yoga', 'pilates'],
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

  // ── 대전 · 공공 수영장 (실제) ───────────────────────────────────────────
  // 출처: 대전시설관리공단·각 구 체육센터 안내, 이오미터(25m.kr) 수영장 정보 (2026-10 기준)
  // 자유수영 시간은 강습 일정에 따라 매달 바뀔 수 있어요.
  {
    id: 'f-hanbat-pool', name: '한밭수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'jung-daejeon' }, lat: 36.3172, lng: 127.4279,
    address: '대전 중구 대종로 373 (부사동, 한밭종합운동장 내)',
    hours: '평일 06:00 – 21:00 · 주말·공휴일 06:00 – 18:00',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 52000, youth: 38000, child: 29000 },
    amenities: [
      '50m × 25m 국제 규격 10레인', '남·여 샤워실·탈의실', '유료 개인사물함',
      '매점', '수영복 코너', '휴게실', '관람석', '자전거 보관대',
    ],
    supplies: POOL_SUPPLIES,
    parking: '한밭종합운동장 주차장 이용 — 한밭체육관과 주경기장 정문 사이, 충무실내체육관 옆에 일반·장애인 우선 구역이 있어요.',
    notes: [
      '1회 이용은 샤워 포함 3시간 (넘으면 1시간마다 입장료 50% 추가)',
      '마감 1시간 전까지 입장, 마감 30분 전 물에서 나와야 해요',
      '매주 수요일 15:00 – 17:00 청소 시간 (14:30 – 16:50 입장 제한)',
      '첫째·셋째·다섯째 일요일과 명절·공휴일 일부 휴관',
      '키 130cm 이상 어린이만 입장 가능',
      '청소년 2,700원 · 어린이 2,000원',
      '11 – 55세 여성은 월 회원 이용료 10% 감면',
      '문의 042-724-3300 (대전시설관리공단)',
    ],
    description: '1994년 문을 연 대전시설관리공단 운영 공공 수영장. 50m 국제 규격 풀에서 자유수영과 수영·아쿠아로빅 강습을 해요.',
  },

  {
    id: 'f-dj-hanbat-culture', name: '한밭문화체육센터 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'jung-daejeon' }, lat: 36.3087, lng: 127.4091,
    address: '대전 중구 보문산로 270', hours: '평일 06:00 – 21:00 · 토·공휴일 09:00 – 18:00',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    amenities: ['메인풀', '유아풀', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '센터 주차빌딩 256면 (장애인 8면, 경차·친환경차 구역 포함)',
    notes: [
      '자유수영: 월·화·목·금 08:00 – 09:00, 15:00 – 19:00 · 주말 09:00 – 13:00, 14:00 – 17:30',
      '청소년 2,700원 · 어린이 2,000원',
      '1일 1회 2시간 이용',
      '입장 마감: 평일 18시, 주말·공휴일 17시',
      '메인풀은 키 140cm 이상, 유아풀은 36개월·키 90cm 이상 (성인 보호자 동반)',
      '오리발·스노클 사용 불가',
      '첫째·셋째·다섯째 일요일, 명절·공휴일 휴관 (수요일 수영장 휴무 여부는 방문 전 확인)',
      '문의 042-724-3800',
    ],
    description: '보문산 아래 대전시설관리공단 운영 수영장. 유아풀이 있어 아이와 함께 가기 좋아요.',
  },
  {
    id: 'f-dj-olympic-hall', name: '올림픽기념 국민생활관 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'seo-daejeon' }, lat: 36.3548, lng: 127.3732,
    address: '대전 서구 신갈마로230번길 77', hours: '평일 06:00 – 21:00 · 주말 06:00 – 18:00',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 52000, youth: 38000, child: 29000 },
    amenities: ['메인풀', '보조풀', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '일일입장 시 3시간 무료 (안내데스크에 차량번호 등록, 미등록 시 요금 부과)',
    notes: [
      '자유수영: 월·수·금 06:00 – 11:00, 14:10 – 17:50, 19:00 – 20:50 · 화·목 06:00 – 11:00, 14:10 – 15:40, 17:00 – 20:50 · 토 06:00 – 11:00, 14:10 – 17:30 · 일 06:00 – 17:30',
      '청소년 2,700원 · 어린이 2,000원',
      '1일 1회 3시간 이용, 회차 종료 30분 전 입장 마감',
      '메인풀은 키 150cm 이상, 보조풀은 키 90cm 이상 (48개월 이상은 같은 성별 보호자 동반)',
      '둘째·넷째·다섯째 일요일, 명절·공휴일 일부 휴관',
      '문의 042-724-3500',
    ],
    description: '갈마동의 대전시설관리공단 운영 수영장. 평일 아침·저녁 자유수영 시간이 넉넉해요.',
  },
  {
    id: 'f-dj-seogu-sports', name: '서구국민체육센터 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'seo-daejeon' }, lat: 36.3038, lng: 127.3629,
    address: '대전 서구 정림서로 181', hours: '화 – 금 06:00 – 21:00 · 주말 06:00 – 17:30 (월 휴관)',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 52000 },
    amenities: ['실내 수영장', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '무료 주차 (공간이 좁아요)',
    notes: [
      '자유수영: 화·금 18:00 – 19:00 · 수 16:00 – 19:00 · 목 13:00 – 15:00, 18:00 – 19:00 · 주말 06:00 – 17:30',
      '청소년 2,700원 · 어린이 2,000원',
      '평일에는 초등학생 이하 입장 불가',
      '매월 마지막 주 토요일은 16시까지',
      '월요일, 공휴일, 선거일 휴관',
      '문의 042-583-8486',
    ],
    description: '정림동 구립 체육센터 수영장. 평일은 강습 위주, 주말엔 하루 종일 자유수영을 해요.',
  },
  {
    id: 'f-dj-namsun-park', name: '남선공원종합체육관 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'seo-daejeon' }, lat: 36.3453, lng: 127.3967,
    address: '대전 서구 남선로 66', hours: '평일 06:00 – 21:30 · 주말 10:00 – 18:30',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 52000, youth: 38000, child: 29000, note: '3개월 5% · 6개월 10% · 12개월 15% 할인 (성인 3개월 148,200원)' },
    amenities: ['실내 수영장', '여름 야외 파도풀', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '일일입장 시 4시간 무료 (영수증 바코드로 정산)',
    notes: [
      '자유수영: 월·수·금 12:00 – 18:30 · 화·목·주말 10:00 – 18:30',
      '청소년 2,700원 · 어린이 2,000원',
      '1일 1회 2시간 이용, 종료 1시간 전까지 입장',
      '7 – 8월에는 야외 파도풀 운영 (별도 요금, 구명조끼 대여 3,000원)',
      '공휴일, 근로자의 날 휴관',
      '13 – 55세 여성은 1개월 등록 시 10% 할인',
      '문의 042-488-5605',
    ],
    description: '남선공원 안 종합체육관 수영장. 낮 시간 자유수영이 길고, 여름엔 파도풀도 열어요.',
  },
  {
    id: 'f-dj-donggu-sports', name: '동구국민체육센터 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'dong-daejeon' }, lat: 36.3395, lng: 127.4382,
    address: '대전 동구 가양로 9', hours: '월 – 금 06:00 – 21:00 · 토 06:00 – 18:00 (일 휴관)',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    amenities: ['성인풀', '어린이풀', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '무료 주차',
    notes: [
      '자유수영: 월·화·목·금 14:00 – 18:50 · 수 06:00 – 07:50, 09:00 – 10:50, 14:00 – 21:00 · 토 06:00 – 11:50, 13:00 – 17:00',
      '청소년 2,700원 · 어린이 2,000원',
      '1일 1회 2시간 이용, 종료 1시간 전까지 입장',
      '성인풀 키 130cm, 어린이풀 키 100cm 미만은 보호자 1:1 동반',
      '만 4세 이상은 다른 성별 탈의실 출입 불가',
      '오리발·구명조끼·튜브·스노클 사용 불가',
      '일요일, 명절·공휴일 일부 휴관 + 평일 월 1회 휴무 (홈페이지 공지)',
      '문의 042-624-6400',
    ],
    description: '가양동 구립 체육센터 수영장. 성인풀과 어린이풀이 나뉘어 있어요.',
  },
  {
    id: 'f-dj-yongun', name: '용운국제수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'dong-daejeon' }, lat: 36.3251, lng: 127.4666,
    address: '대전 동구 동부로 138', hours: '평일 06:00 – 21:00 · 주말 06:00 – 18:00',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 52000, youth: 38000, child: 29000 },
    amenities: ['50m 경영풀', '25m 보조풀', '유아풀', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '무료 주차',
    notes: [
      '자유수영: 운영 시간 내내 (수·토·일·공휴일 11:30 – 13:00 청소 시간 제외)',
      '청소년 2,700원 · 어린이 2,000원',
      '여름철 평일(수 제외) 성인 자유수영은 12:00 – 21:00',
      '1일 1회 3시간 이용, 폐장 1시간 전까지 입장',
      '보조풀·유아풀은 아쿠아로빅 시간(평일 08 · 14 · 18시, 토 07 – 10시) 이용 제한',
      '경영풀 키 140cm, 보조풀 키 130cm 이상 · 유아풀은 36개월·키 90cm 이상 (성인 보호자 동반)',
      '둘째·넷째·다섯째 일요일 휴관',
      '문의 042-280-1000',
    ],
    description: '대전시설관리공단이 운영하는 50m 국제 규격 수영장. 거의 하루 종일 자유수영을 할 수 있어요.',
  },
  {
    id: 'f-dj-daedeok-sports', name: '대덕국민체육센터 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'daedeok' }, lat: 36.4455, lng: 127.4135,
    address: '대전 대덕구 대덕대로1486번길 101', hours: '화 – 금 06:00 – 21:00 · 주말 06:00 – 18:00 (월 휴관)',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    amenities: ['실내 수영장', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '무료 주차',
    notes: [
      '자유수영: 평일 50분 회차 (08 · 11 · 13 · 14 · 15 · 18시, 목요일은 16 · 17시 추가) · 주말 06:10 – 17:30',
      '청소년 2,700원 · 어린이 2,000원',
      '1일 1회 입장',
      '36개월 미만 입장 불가',
      '월요일 휴관',
      '문의 042-716-3000',
    ],
    description: '신탄진 쪽 구립 체육센터 수영장. 평일엔 시간대별 회차로 자유수영을 해요.',
  },
  {
    id: 'f-dj-daedeok-youth', name: '대덕구청소년어울림센터 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'daedeok' }, lat: 36.3643, lng: 127.4343,
    address: '대전 대덕구 쌍청당로 25', hours: '화 – 금 06:00 – 21:00 · 주말 06:00 – 17:00 (월 휴관)',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 57000, youth: 43000, child: 34000, note: '월 회원은 주말·공휴일에도 자유수영 가능' },
    amenities: ['성인풀', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '일일입장 시 무료',
    notes: [
      '자유수영: 평일 08:00 – 08:50, 18:00 – 18:50 · 주말 06:00 – 12:00, 13:00 – 17:00',
      '청소년 2,700원 · 어린이 2,000원',
      '키 150cm 이하 어린이는 성인풀 자유수영 불가 (보호자 1명당 1명 동반 가능)',
      '월요일, 명절, 근로자의 날, 대체공휴일 휴관',
      '문의 042-626-7728',
    ],
    description: '송촌동 청소년 센터 안 수영장. 주말 자유수영 시간이 길어요.',
  },
  {
    id: 'f-dj-worldcup', name: '대전월드컵스포츠센터 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.3651, lng: 127.325,
    address: '대전 유성구 월드컵대로 32 (월드컵경기장 내)', hours: '평일 06:00 – 22:00 · 토 06:00 – 18:00 (일 휴관)',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 52000, youth: 38000, child: 29000 },
    amenities: ['실내 수영장', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '일일입장 시 5시간 무료',
    notes: [
      '자유수영: 월·금 13:00 – 14:50, 16:00 – 18:50 · 화·목 13:00 – 18:50 · 수 06:00 – 11:50, 13:00 – 14:50, 16:00 – 20:50 · 토 06:00 – 17:30',
      '청소년 2,700원 · 어린이 2,000원',
      '1일 1회 2시간 이용, 종료 1시간 전까지 입장',
      '일요일 휴관 + 월 1회 휴무 (홈페이지 공지)',
      '문의 042-823-8688',
    ],
    description: '노은동 월드컵경기장 안 스포츠센터 수영장. 주차가 넉넉해요.',
  },
  {
    id: 'f-dj-guzeuk', name: '구즉국민체육센터 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.435, lng: 127.3841,
    address: '대전 유성구 송강로42번길 34', hours: '화 – 금 06:00 – 22:00 · 주말 06:00 – 18:00 (월 휴관)',
    price: { amount: 3200, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 52000, youth: 38000, child: 24000 },
    amenities: ['성인풀', '유아풀', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '무료 주차 (공간이 좁아요)',
    notes: [
      '자유수영: 화 12:30 – 13:50, 18:00 – 18:50 · 수 12:30 – 14:50, 18:00 – 18:50 · 목 12:30 – 13:50, 16:00 – 18:50 · 금 12:30 – 13:50 · 토 09:00 – 12:00, 13:00 – 17:30 · 일 06:00 – 12:00, 13:00 – 17:30',
      '청소년 2,400원 · 어린이 1,600원',
      '만 5세(60개월) 이상 입장, 키 140cm 미만은 보호자와 유아풀만',
      '스노클·오리발·숏핀 사용 불가',
      '월요일, 공휴일, 선거일 휴관',
      '문의 042-933-5570',
    ],
    description: '송강동 유성구 체육센터 수영장. 공공 수영장 중에서도 입장료가 저렴해요.',
  },
  {
    id: 'f-dj-jinjam', name: '진잠다목적체육관 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.2946, lng: 127.3206,
    address: '대전 유성구 계백로 835', hours: '화 – 금 06:00 – 22:00 · 주말 06:00 – 18:00 (월 휴관)',
    price: { amount: 3200, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 52000, youth: 38000, child: 24000 },
    amenities: ['성인풀', '유아풀', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '일일입장 시 2시간 무료 (안내데스크에서 할인권 받기)',
    notes: [
      '자유수영: 화 – 목 14:50 – 15:50 · 금 14:50 – 17:50 · 주말 06:00 – 12:00, 13:00 – 17:30',
      '청소년 2,400원 · 어린이 1,600원',
      '만 5세(60개월) 이상 입장, 키 140cm 미만은 보호자와 유아풀만',
      '월요일, 공휴일, 선거일 휴관',
      '문의 042-542-5570',
    ],
    description: '진잠동 유성구 다목적체육관 수영장. 평일은 오후 한 회차, 주말엔 길게 자유수영을 해요.',
  },
  {
    id: 'f-dj-bandabi', name: '유성반다비체육센터 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.3779, lng: 127.3441,
    address: '대전 유성구 유성대로 976', hours: '화 – 금 06:00 – 22:00 · 토 06:00 – 18:00 · 일 09:00 – 18:00 (월 휴관)',
    price: { amount: 3200, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 52000, youth: 38000, child: 24000 },
    amenities: ['성인풀', '유아풀', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '무료 주차',
    notes: [
      '자유수영: 평일 07:30 – 08:50, 14:30 – 15:50, 17:30 – 18:50 · 토 06:10 – 08:10, 09:10 – 11:10, 12:40 – 14:40, 15:10 – 17:10 · 일 09:10 – 11:10, 12:40 – 14:40, 15:10 – 17:10',
      '청소년 2,400원 · 어린이 1,600원',
      '1회 2시간 이용 (넘으면 추가 결제), 정원이 차면 입장 불가',
      '만 5세(60개월) 이상 입장, 키 140cm 미만은 보호자와 유아풀만',
      '주말에는 마스터반 이상 실력자 오리발 사용 가능',
      '월요일, 근로자의 날 휴관',
      '문의 042-862-7338',
    ],
    description: '장애인과 비장애인이 함께 쓰는 반다비 체육센터 수영장. 시간대별 2시간 회차로 자유수영을 해요.',
  },
  {
    id: 'f-dj-yuseong-welfare', name: '유성구종합사회복지관 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.3529, lng: 127.3396,
    address: '대전 유성구 도안대로589번길 27', hours: '월 – 토 운영 (일 휴관)',
    price: { amount: 3200, unit: '성인 자유수영 1회', currency: 'KRW' },
    amenities: ['실내 수영장', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '무료 주차 (공간이 좁아요)',
    notes: [
      '자유수영: 월·화·목·금 08:00 – 09:00, 13:30 – 14:50, 16:00 – 17:50 · 수 06:00 – 17:30, 18:00 – 20:30 · 토 06:00 – 11:50',
      '청소년 2,400원 · 어린이 1,600원',
      '유아, 수영이 서툰 어린이, 키 140cm 이하 어린이는 보호자 동반',
      '일요일 휴관',
      '문의 042-825-3183',
    ],
    description: '도안동 복지관 안 수영장. 수요일엔 거의 하루 종일 자유수영을 해요.',
  },
  {
    id: 'f-dj-yuseong-disability', name: '유성구장애인종합복지관 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.3814, lng: 127.3234,
    address: '대전 유성구 북유성대로 166', hours: '월 – 토 운영 (일 휴관)',
    price: { amount: 3000, unit: '성인 자유수영 1회', currency: 'KRW' },
    amenities: ['실내 수영장', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '센터 주차장은 장애인용이에요. 비장애인은 주차장 옆 갓길이나 근처 죽동 공영주차장을 이용하세요.',
    notes: [
      '자유수영: 월·금 07:00 – 08:30, 09:00 – 10:20, 13:00 – 14:30, 19:00 – 20:30 · 화·목 07:00 – 08:30, 09:00 – 11:30, 13:00 – 14:30, 19:00 – 20:30 · 수 07:00 – 08:30, 09:00 – 10:20, 13:00 – 14:30 · 토 09:00 – 11:30, 13:00 – 15:30',
      '청소년 2,000원 · 어린이 1,500원',
      '장애인 전용 시간: 월·수·금 09:00 – 10:20, 13:00 – 14:30 · 화·목 09:00 – 11:30, 13:00 – 14:30',
      '장애인 자유수영 무료, 중증장애인은 보호자 동반 (보호자 1명 무료)',
      '7세 미만 어린이는 보호자 동반',
      '일요일 휴관',
      '가임기 여성은 일일권 외 이용료 10% 할인',
      '문의 0507-1443-6880',
    ],
    description: '죽동 장애인종합복지관 수영장. 장애인 전용 시간 외에는 누구나 자유수영을 할 수 있어요.',
  },
  {
    id: 'f-dj-domasil', name: '도마실국민체육센터 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'seo-daejeon' }, lat: 36.3124, lng: 127.3852,
    address: '대전 서구 유등로 235', hours: '평일 06:00 – 21:00 · 토 06:00 – 18:00 (일 휴관)',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 52000, youth: 38000, child: 29000 },
    amenities: ['성인풀', '어린이풀', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '주차장 27면 (좁아서 만차면 이용할 수 없어요)',
    notes: [
      '자유수영: 월·금 15:00 – 18:50 · 화·목 14:00 – 18:50 · 수 06:00 – 07:50, 09:00 – 11:50, 15:00 – 20:50 · 토 06:00 – 07:50, 09:00 – 11:50, 14:00 – 17:30',
      '청소년 2,700원 · 어린이 2,000원',
      '성인풀 키 100 – 120cm 어린이는 보호자 1:1 동반',
      '어린이풀 키 100cm 미만·7세 미만은 보호자 1:1 동반',
      '일요일, 공휴일, 근로자의 날 휴관',
      '문의 042-582-5556',
    ],
    description: '도마동 구립 체육센터 수영장. 성인풀과 어린이풀이 따로 있어요.',
  },
  {
    id: 'f-dj-pyeongsong', name: '평송청소년문화센터 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'seo-daejeon' }, lat: 36.3659, lng: 127.3918,
    address: '대전 서구 둔산대로 201', hours: '화 – 금 06:00 – 20:30 · 주말 06:00 – 17:30 (월 휴관)',
    price: { amount: 4300, unit: '성인 자유수영 1회', currency: 'KRW' },
    monthly: { adult: 52000, youth: 38000, child: 29000 },
    amenities: ['실내 수영장', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '주차 가능',
    notes: [
      '자유수영: 주말 06:10 – 10:50, 13:00 – 17:50 (평일은 강습 위주)',
      '청소년 2,700원 · 어린이 2,000원',
      '1일 1회 입장',
      '키 130cm 미만 입장 불가',
      '오리발·스노클·핀 사용 불가',
      '월요일 휴관',
      '문의 042-480-1623',
    ],
    description: '둔산동 청소년 문화센터 안 수영장. 주말 자유수영을 하기 좋아요.',
  },
  {
    id: 'f-dj-chumok', name: '추목수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.4136, lng: 127.3398,
    address: '대전 유성구 자운로221번길 120-10', hours: '화 – 금 05:40 – 19:40 · 주말 07:00 – 17:40 (월 휴관)',
    price: { amount: 4400, unit: '성인 자유수영 1회', currency: 'KRW' },
    amenities: ['실내 수영장', '샤워실'],
    supplies: POOL_SUPPLIES,
    parking: '무료 주차',
    notes: [
      '자유수영: 화 – 금 05:40 – 08:10, 09:00 – 12:00, 13:30 – 19:40 · 주말 07:00 – 12:00, 13:00 – 15:00, 16:00 – 17:40',
      '청소년 4,400원 · 어린이 2,750원',
      '오리발·킥판·풀부이 사용 가능',
      '월요일 휴관',
      '문의 042-863-5747',
    ],
    description: '추목동 수영장. 새벽 5시 40분부터 열고, 오리발·풀부이 훈련도 할 수 있어요.',
  },

  // ── 대전 · 사설 수영장 (실제) ─────────────────────────────────────────
  {
    id: 'f-dj-fsporex', name: '에프스포렉스 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'dong-daejeon' }, lat: 36.3384, lng: 127.4324,
    address: '대전 동구 우암로 128', hours: '화 – 금 05:30 – 21:00 · 주말 06:00 – 18:00 (둘째·넷째 월 휴관)',
    price: { amount: 9000, unit: '성인 자유수영 1회', currency: 'KRW' },
    amenities: ['실내 수영장', '드라이기', '샴푸·비누·샤워젤 비치'],
    supplies: ['수영복', '수영모', '수경', '수건'],
    parking: '주차 가능',
    notes: [
      '자유수영: 평일 50분 회차 (10 · 11 · 14 · 15 · 18 · 19시)',
      '둘째·넷째 월요일 휴관',
      '문의 0507-1323-8612',
    ],
    description: '동구 우암로의 사설 스포츠센터 수영장. 샤워용품이 갖춰져 있어 수건만 챙기면 돼요.',
  },
  {
    id: 'f-dj-sambu', name: '삼부스포렉스 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'jung-daejeon' }, lat: 36.3241, lng: 127.3937,
    address: '대전 중구 태평로 83', hours: '평일 05:30 – 22:00 · 토 06:00 – 19:00 (일 휴관)',
    price: { amount: 8000, unit: '성인 자유수영 1회', currency: 'KRW' },
    amenities: ['실내 수영장', '드라이기'],
    supplies: ['수영복', '수영모', '수경', '수건', '세면도구'],
    parking: '3시간 무료 주차',
    notes: [
      '자유수영: 수 05:30 – 12:20, 13:30 – 14:50, 16:00 – 22:00 · 토 06:00 – 19:00',
      '일요일 휴관',
      '문의 042-535-8454',
    ],
    description: '중구 태평로의 사설 스포츠센터 수영장. 평일 아침 5시 30분부터 열어요.',
  },
  {
    id: 'f-dj-j-swimming', name: 'J스위밍센터', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.3871, lng: 127.3096,
    address: '대전 유성구 지족동로142번길 29-8 2층', hours: '평일 06:00 – 21:00 · 토 09:00 – 15:00 (일·5주차 휴관)',
    price: { amount: 9000, unit: '성인 자유수영 1회', currency: 'KRW' },
    amenities: ['실내 수영장', '드라이기'],
    supplies: ['수영복', '수영모', '수경', '수건', '세면도구'],
    parking: '2시간 무료 (주차 타워)',
    notes: [
      '자유수영: 평일 08:00 – 09:00 · 수 06:00 – 11:00, 19:00 – 21:00 · 토 13:00 – 15:00',
      '성인만 자유수영 가능',
      '수요일 오전은 성별로 나눠 운영 (여성 06:00 – 11:00, 남성 06:00 – 09:00)',
      '일요일, 5주차 휴관',
      '문의 0507-1339-2792',
    ],
    description: '지족동 사설 수영장. 수요일 오전엔 여성만 이용하는 시간이 있어요.',
  },
  {
    id: 'f-dj-newgreen', name: '뉴그린 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'seo-daejeon' }, lat: 36.3595, lng: 127.3779,
    address: '대전 서구 청사로 128 1층', hours: '평일 06:00 – 22:00 · 토 07:00 – 16:00 (일 휴관)',
    price: { amount: null, unit: '', currency: 'KRW', inquire: true },
    amenities: ['실내 수영장', '드라이기', '수건 비치'],
    supplies: ['수영복', '수영모', '수경', '세면도구'],
    parking: '주차 가능',
    notes: [
      '일요일 휴관',
      '문의 042-486-4040',
    ],
    description: '둔산동 정부청사 근처 사설 수영장. 수건이 준비돼 있어요.',
  },
  {
    id: 'f-dj-aqua-sunsa', name: '아쿠아 선사 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'seo-daejeon' }, lat: 36.362, lng: 127.377,
    address: '대전 서구 청사서로 46 지하', hours: '평일 06:00 – 21:50 · 토 09:00 – 16:50 (일 휴관)',
    price: { amount: null, unit: '', currency: 'KRW', inquire: true },
    amenities: ['실내 수영장', '드라이기'],
    supplies: ['수영복', '수영모', '수경', '수건', '세면도구'],
    parking: '주차 가능',
    notes: [
      '일요일 휴관',
      '문의 042-488-4800',
    ],
    description: '서구 청사서로의 사설 수영장.',
  },
  {
    id: 'f-dj-cheonma', name: '천마하이파이브 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'seo-daejeon' }, lat: 36.3434, lng: 127.3862,
    address: '대전 서구 계룡로571번길 23-19 지하 2층', hours: '평일 06:00 – 22:00 · 토 06:00 – 15:30 (일 휴관)',
    price: { amount: null, unit: '', currency: 'KRW', inquire: true },
    amenities: ['실내 수영장', '드라이기'],
    supplies: ['수영복', '수영모', '수경', '수건', '세면도구'],
    parking: '주차 가능',
    notes: [
      '일요일, 공휴일, 선거일 휴관',
      '문의 0507-1355-6665',
    ],
    description: '서구 계룡로의 사설 수영장.',
  },
  {
    id: 'f-dj-narae', name: '나래스포츠 수영장', type: 'pool',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.3916, lng: 127.3107,
    address: '대전 유성구 반석동로 51-15', hours: '평일 09:00 – 22:00 · 토 08:30 – 15:00 (일 휴관)',
    price: { amount: null, unit: '', currency: 'KRW', inquire: true },
    amenities: ['실내 수영장'],
    supplies: ['수영복', '수영모', '수경', '수건', '세면도구'],
    parking: '주차 가능',
    notes: [
      '일요일 휴관',
      '문의 042-825-7994',
    ],
    description: '반석동 사설 스포츠센터 수영장.',
  },

  // ── 대전 · 공공 배드민턴장 (실제) ─────────────────────────────────────────
  // 출처: 대전시 공공체육시설 안내, 대전시설관리공단, 서구 공공체육시설, 대전유성스포츠클럽 (2026-10 기준)
  {
    id: 'f-dj-hanmaum', name: '한마음생활체육관', type: 'badminton',
    place: { country: 'KR', region: 'daejeon', city: 'jung-daejeon' }, lat: 36.319, lng: 127.3865,
    address: '대전 중구 유등천로 420', hours: '매일 06:00 – 22:00 (첫째·셋째 월 휴관)',
    price: { amount: 2800, unit: '성인 1회 (2시간)', currency: 'KRW' },
    monthly: { adult: 40000, youth: 26000, child: 21000 },
    amenities: ['배드민턴 5면', '탁구 14대', '관람석', '샤워장', '매점'],
    activities: ['badminton', 'table_tennis'],
    supplies: BADMINTON_SUPPLIES,
    notes: [
      '1일 1회 2시간 이용 (월 회원도 하루 1회)',
      '청소년·군인 1,700원 · 어린이 1,400원',
      '첫째·셋째 월요일, 신정·명절·석가탄신일·성탄절 휴관',
      '문의 042-536-5507',
    ],
    description: '배드민턴 5면을 갖춘 대전시설관리공단 생활체육관. 지하에는 탁구장이 있어요.',
  },
  {
    id: 'f-dj-hanbat-culture-gym', name: '한밭문화체육센터 체육관', type: 'badminton',
    place: { country: 'KR', region: 'daejeon', city: 'jung-daejeon' }, lat: 36.3087, lng: 127.4091,
    address: '대전 중구 보문산로 270 (3층)', hours: '평일 06:00 – 21:00 · 토·공휴일 09:00 – 18:00',
    price: { amount: 2800, unit: '성인 1회 (2시간)', currency: 'KRW' },
    amenities: ['배드민턴 2면', '탁구 4대', '샤워실'],
    activities: ['badminton', 'table_tennis'],
    supplies: BADMINTON_SUPPLIES,
    parking: '센터 주차빌딩 256면',
    notes: [
      '1일 1회 2시간 이용 (넘으면 1시간마다 이용료 50% 추가)',
      '청소년 1,700원 · 어린이 1,400원',
      '첫째·셋째·다섯째 일요일, 명절·공휴일 휴관',
      '문의 042-724-3800',
    ],
    description: '수영장이 있는 복합문화체육센터 3층 체육관. 배드민턴 2면과 탁구대가 있어요.',
  },
  {
    id: 'f-dj-gilchi-gym', name: '길치문화체육센터 체육관', type: 'badminton',
    place: { country: 'KR', region: 'daejeon', city: 'daedeok' }, lat: 36.3569, lng: 127.4546,
    address: '대전 대덕구 신상로 71', hours: '평일 06:00 – 21:00 · 토·공휴일 09:00 – 18:00',
    price: { amount: 2800, unit: '성인 1회 (2시간)', currency: 'KRW' },
    amenities: ['배드민턴 1면', '탁구 2대', '수영장', '작은도서관'],
    activities: ['badminton', 'table_tennis'],
    supplies: BADMINTON_SUPPLIES,
    notes: [
      '1일 1회 2시간 이용 (넘으면 1시간마다 이용료 50% 추가)',
      '청소년 1,700원 · 어린이 1,400원',
      '배드민턴 강습 주 2회(화·목) 월 48,000원',
      '첫째·셋째·다섯째 일요일, 명절·공휴일 휴관',
      '문의 042-724-3830',
    ],
    description: '대덕구 복합문화체육센터 지하 체육관. 1면짜리라 소규모로 치기 좋아요.',
  },
  {
    id: 'f-dj-olympic-hall-gym', name: '올림픽기념 국민생활관 체육관', type: 'badminton',
    place: { country: 'KR', region: 'daejeon', city: 'seo-daejeon' }, lat: 36.3548, lng: 127.3732,
    address: '대전 서구 신갈마로230번길 77', hours: '평일 06:00 – 13:00, 14:00 – 22:00 · 주말·공휴일 06:00 – 19:00',
    price: { amount: 2800, unit: '성인 1회', currency: 'KRW' },
    monthly: { adult: 30000, youth: 20000, child: 16000 },
    amenities: ['배드민턴 코트', '탁구대', '샤워실'],
    activities: ['badminton', 'table_tennis'],
    supplies: BADMINTON_SUPPLIES,
    parking: '일일입장 시 3시간 무료 (안내데스크에 차량번호 등록)',
    notes: [
      '실내 전용 운동화가 없으면 입장할 수 없어요 (라켓·운동화 대여 없음)',
      '청소년 1,700원 · 어린이 1,400원',
      '샤워 포함 3시간 이내 이용, 회차 종료 1시간 전 입장 마감',
      '평일 13:00 – 14:00 청소 시간',
      '배드민턴 단체강습 월·수·금 (성인 월 40,000원)',
      '둘째·넷째·다섯째 일요일, 명절·공휴일 일부 휴관',
      '문의 042-724-3500',
    ],
    description: '갈마동 국민생활관 체육관. 평일 밤 10시까지, 주말에도 저녁 7시까지 칠 수 있어요.',
  },
  {
    id: 'f-dj-gwanjeo', name: '관저다목적체육관', type: 'badminton',
    place: { country: 'KR', region: 'daejeon', city: 'seo-daejeon' }, lat: 36.2932, lng: 127.3366,
    address: '대전 서구 관저중로 10', hours: '평일 06:00 – 21:40 · 토 06:00 – 17:30 (일·공휴일 휴관)',
    price: { amount: 2200, unit: '성인 1회 (2시간)', currency: 'KRW' },
    monthly: { adult: 30000, youth: 22000, child: 15000 },
    amenities: ['배드민턴 코트', '탁구대', '헬스장', '수영장'],
    activities: ['badminton', 'table_tennis'],
    supplies: BADMINTON_SUPPLIES,
    parking: '주차장이 좁아요. 만차면 이용할 수 없어 대중교통을 권해요.',
    notes: [
      '1일 1회 2시간 이용',
      '청소년 1,700원 · 어린이 1,400원',
      '초등생·유아는 보호자와 함께 입장',
      '초보자 배드민턴 단체강습 화·목 19:00 (월 70,000원)',
      '일요일, 공휴일, 근로자의 날 휴관',
      '문의 042-545-6000',
    ],
    description: '관저동 구립 다목적체육관. 구립이라 이용료가 저렴하고 초보자 강습도 있어요.',
  },
  {
    id: 'f-dj-domasil-gym', name: '도마실국민체육센터 체육관', type: 'badminton',
    place: { country: 'KR', region: 'daejeon', city: 'seo-daejeon' }, lat: 36.313, lng: 127.3853,
    address: '대전 서구 유등로 235', hours: '평일 06:00 – 21:40 · 토 06:00 – 17:30 (일·공휴일 휴관)',
    price: { amount: 2200, unit: '성인 1회 (2시간)', currency: 'KRW' },
    monthly: { adult: 30000, youth: 22000, child: 15000 },
    amenities: ['배드민턴 코트', '탁구대', '수영장'],
    activities: ['badminton', 'table_tennis'],
    supplies: BADMINTON_SUPPLIES,
    parking: '주차장 27면 (좁아서 만차면 이용할 수 없어요)',
    notes: [
      '1일 1회 2시간 이용',
      '청소년 1,700원 · 어린이 1,400원',
      '초등생·유아는 보호자와 함께 입장',
      '배드민턴 단체강습 월·수·금 (월 90,000원)',
      '일요일, 공휴일, 근로자의 날 휴관',
      '문의 042-582-5556',
    ],
    description: '도마동 구립 체육센터 체육관. 저렴한 월 이용권으로 꾸준히 치기 좋아요.',
  },
  {
    id: 'f-dj-yuseong-sports', name: '유성종합스포츠센터', type: 'badminton',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.3781, lng: 127.3445,
    address: '대전 유성구 유성대로 978', hours: '운영 시간은 센터에 문의',
    price: { amount: 2400, unit: '성인 1시간', currency: 'KRW' },
    monthly: { adult: 32000, youth: 24000, child: 16000, note: '월 이용권은 하루 2시간 기준' },
    amenities: ['배드민턴 코트', '키오스크 발권'],
    activities: ['badminton', 'table_tennis'],
    supplies: BADMINTON_SUPPLIES,
    notes: [
      '청소년 1,700원 · 어린이 1,400원 (1시간)',
      '키오스크에서 일일권 구매 (청소년·어린이·할인은 인포데스크)',
      '라켓·셔틀콕·신발 대여·판매 없음, 실내 전용 운동화 필수',
      '문의 042-862-7330 (유성스포츠클럽)',
    ],
    description: '유성스포츠클럽이 운영하는 체육센터. 일일권과 월 이용권으로 배드민턴을 칠 수 있어요.',
  },
  {
    id: 'f-dj-guzeuk-gym', name: '구즉국민체육센터 체육관', type: 'badminton',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.435, lng: 127.3841,
    address: '대전 유성구 송강로42번길 34', hours: '화 – 금 06:00 – 22:00 · 주말 06:00 – 18:00 (월 휴관)',
    price: { amount: 2400, unit: '성인 1시간', currency: 'KRW' },
    monthly: { adult: 32000, youth: 24000, child: 16000, note: '월 이용권은 하루 2시간 기준' },
    amenities: ['배드민턴 코트', '탁구대', '수영장'],
    activities: ['badminton', 'table_tennis'],
    supplies: BADMINTON_SUPPLIES,
    parking: '무료 주차 (공간이 좁아요)',
    notes: [
      '청소년 1,700원 · 어린이 1,400원 (1시간)',
      '키오스크에서 일일권 구매',
      '라켓·셔틀콕·신발 대여·판매 없음, 실내 전용 운동화 필수',
      '월요일, 공휴일, 선거일 휴관',
      '문의 042-933-5570',
    ],
    description: '송강동 구립 체육센터 체육관. 배드민턴과 탁구를 함께 운영해요.',
  },
  {
    id: 'f-dj-jinjam-gym', name: '진잠다목적체육관 체육관', type: 'badminton',
    place: { country: 'KR', region: 'daejeon', city: 'yuseong' }, lat: 36.2946, lng: 127.3206,
    address: '대전 유성구 계백로 835', hours: '화 – 금 06:00 – 22:00 · 주말 06:00 – 18:00 (월 휴관)',
    price: { amount: 2400, unit: '성인 1시간', currency: 'KRW' },
    monthly: { adult: 32000, youth: 24000, child: 16000, note: '월 이용권은 하루 2시간 기준' },
    amenities: ['배드민턴 코트', '탁구대', '수영장'],
    activities: ['badminton', 'table_tennis'],
    supplies: BADMINTON_SUPPLIES,
    parking: '일일입장 시 2시간 무료 (안내데스크에서 할인권 받기)',
    notes: [
      '청소년 1,700원 · 어린이 1,400원 (1시간)',
      '키오스크에서 일일권 구매',
      '라켓·셔틀콕·신발 대여·판매 없음, 실내 전용 운동화 필수',
      '월요일, 공휴일, 선거일 휴관',
      '문의 042-542-5570',
    ],
    description: '진잠동 다목적체육관. 배드민턴과 탁구를 함께 운영해요.',
  },

  // ── 해외 ───────────────────────────────────────────────────────────────
  {
    id: 'f-flushing-park', name: 'Flushing Meadows Corona Park', type: 'jogging',
    place: { country: 'US', region: 'ny', city: 'flushing' }, lat: 40.7400, lng: -73.8407,
    address: 'Queens, NY', hours: '06:00 – 01:00', distanceKm: 5.0,
    price: { amount: null, unit: '', currency: 'USD' },
    amenities: ['호수 둘레 러닝 코스', '테니스 센터', '화장실'],
    activities: ['running', 'walking', 'tennis'],
    description: '뉴욕 퀸즈의 큰 공원. 호수를 도는 평지 코스가 러닝 모임에 좋아요.',
  },
  {
    id: 'f-irvine-center', name: 'Irvine 커뮤니티 스포츠센터 (예시)', type: 'sports_center', sample: true,
    place: { country: 'US', region: 'ca', city: 'irvine' }, lat: 33.6780, lng: -117.8150,
    address: 'Irvine, CA', hours: '06:00 – 21:00',
    price: { amount: 15, unit: '1회 이용', currency: 'USD' },
    ludia: { memberAmount: 10, perk: '요가 클래스 첫 달 20% 할인' },
    amenities: ['체육관', '요가룸', '수영장', '피클볼 코트'],
    activities: ['yoga', 'swimming', 'gym'],
    description: '어바인 한인 여성 모임이 자주 쓰는 다목적 센터.',
  },
  {
    id: 'f-stanley-park', name: 'Stanley Park Seawall', type: 'walking',
    place: { country: 'CA', region: 'bc', city: 'vancouver' }, lat: 49.3017, lng: -123.1417,
    address: 'Vancouver, BC', hours: '24시간', distanceKm: 9.0,
    price: { amount: null, unit: '', currency: 'CAD' },
    amenities: ['해안 산책로', '자전거 도로 분리', '화장실'],
    activities: ['walking', 'running', 'cycling'],
    description: '바다를 따라 공원을 한 바퀴 도는 산책·러닝 코스.',
  },
  {
    id: 'f-shinjuku-sports', name: '신주쿠 스포츠센터 (예시)', type: 'sports_center', sample: true,
    place: { country: 'JP', region: 'tokyo', city: 'shin-okubo' }, lat: 35.7050, lng: 139.7020,
    address: '東京都新宿区', hours: '09:00 – 22:00',
    price: { amount: 600, unit: '1회 이용', currency: 'JPY' },
    amenities: ['체육관', '수영장', '트레이닝룸'],
    activities: ['swimming', 'badminton', 'gym'],
    description: '구립 스포츠센터. 저렴하게 수영과 배드민턴을 즐길 수 있어요.',
  },
  {
    id: 'f-strathfield-studio', name: 'Strathfield 필라테스 스튜디오 (예시)', type: 'yoga', sample: true,
    place: { country: 'AU', region: 'nsw', city: 'strathfield' }, lat: -33.8790, lng: 151.0830,
    address: 'Strathfield, NSW', hours: '06:30 – 20:30',
    price: { amount: 30, unit: '그룹 수업 1회', currency: 'AUD' },
    ludia: { memberAmount: 24, perk: '워홀·유학생 10회권 추가 할인' },
    amenities: ['리포머', '매트', '한국어 강사'],
    activities: ['pilates'],
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
