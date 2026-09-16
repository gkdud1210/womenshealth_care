import type { MeetupCategory } from '@/data/meetupData'

export type HairCareTypeId =
  | 'stress_ans'
  | 'metabolic_damp_heat'
  | 'deficiency'
  | 'hormonal_dht'
  | 'gut_inflammation'
  | 'cervical_capillary'

export interface HairCareProduct {
  name: string
  reason: string
  tag: string
}

export interface HairCareType {
  id: HairCareTypeId
  emoji: string
  label: string
  subtitle: string
  color: string
  gradient: string
  glow: string
  bg: string
  border: string
  mechanism: string
  profileHints: string[]
  routineClub: { name: string; activities: string[] }
  diet: { good: string[]; avoid: string[] }
  exercise: string[]
  homecare: string[]
  meetupCategory: MeetupCategory
  meetupNote: string
  products: HairCareProduct[]
}

export const HAIR_CARE_TYPES: Record<HairCareTypeId, HairCareType> = {
  stress_ans: {
    id: 'stress_ans',
    emoji: '🔥',
    label: '상열하한 & 자율신경 수축형',
    subtitle: '스트레스 / 혈류 장애',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    glow: 'rgba(239,68,68,0.3)',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.22)',
    mechanism: '교감신경 과활성화로 두피 모세혈관이 수축되고, 두피에 열(상열)이 오르면서 모낭 주기가 짧아지는 패턴이에요.',
    profileHints: [
      '자율신경링(Autonomic Nerve Ring) 변형, 두피 반사구 자극성 색소 침착',
      '만성 어깨·목 결림, 두피 화끈거림, 수면 장애, 업무 스트레스 과다',
      '정상~마른 체형(BMI 18.5~22.9), 상체 긴장도 높음',
    ],
    routineClub: {
      name: '두피 쿨다운 & 11시 수면 인증 클럽',
      activities: ['저녁 명상 인증', '11시 전 수면 인증', '이완 스트레칭'],
    },
    diet: {
      good: ['메밀', '박하차 · 녹차', '연근'],
      avoid: ['정제당', '자극적인 매운 음식'],
    },
    exercise: ['목·어깨 이완 요가', '저강도 유산소 산책', '승모근 스트레칭'],
    homecare: ['멘톨·쿨링 성분 약산성 토닉', '상체 림프 괄사 마사지'],
    meetupCategory: 'yoga',
    meetupNote: '이완 요가 · 스트레칭 모임과 연결해드려요',
    products: [
      { name: '멘톨 쿨링 두피 토닉', reason: '두피 열 진정 & 혈관 이완', tag: '❄️ 쿨링' },
      { name: '아슈와간다 + L-테아닌', reason: '코르티솔 조절 & 이완 지원', tag: '🌿 스트레스' },
    ],
  },

  metabolic_damp_heat: {
    id: 'metabolic_damp_heat',
    emoji: '💧',
    label: '지루성 습열 & 대사 정체형',
    subtitle: '피지 과다 / 인슐린 스파이크',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glow: 'rgba(245,158,11,0.3)',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.22)',
    mechanism: '혈당 스파이크와 대사 정체로 과도한 피지가 분비되어 모공을 막고, 두피 염증(지루성 두피염)을 유발하는 타입이에요.',
    profileHints: [
      '장관(GI tract) 영역 독소 링, 내장 반사구 체액 정체 징후',
      '두피 피지 분비 과다, 비듬·가려움증, 인스턴트/야식 선호, 식후 졸음',
      '과체중~비만 체형(BMI 25.0 이상), 내장지방형',
    ],
    routineClub: {
      name: '정제당 컷 & 두피 스케일링 챌린지',
      activities: ['식후 산책 인증', '물 2L 마시기 인증', '당류 차단 인증'],
    },
    diet: {
      good: ['검은콩', '브로콜리 · 토마토', '등푸른생선'],
      avoid: ['튀김 · 고지방 음식', '알코올'],
    },
    exercise: ['중강도 근력 운동', '인클라인 트레드밀'],
    homecare: ['살리실산·징크피리치온 딥클렌징 샴푸', '주 1~2회 두피 클레이 팩'],
    meetupCategory: 'gym',
    meetupNote: '땀 흘리는 유산소 · 근력 모임과 연결해드려요',
    products: [
      { name: '딥클렌징 스케일링 샴푸', reason: '피지 · 모공 케어', tag: '🧴 클렌징' },
      { name: '오메가-3 EPA/DHA', reason: '항염 & 대사 지원', tag: '💊 보충제' },
    ],
  },

  deficiency: {
    id: 'deficiency',
    emoji: '🌾',
    label: '기혈 수척 & 영양 전달 저하형',
    subtitle: '모근 단백질 결핍 / 다이어트 부작용',
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #64748b, #475569)',
    glow: 'rgba(100,116,139,0.3)',
    bg: 'rgba(100,116,139,0.06)',
    border: 'rgba(100,116,139,0.22)',
    mechanism: '소화 흡수력 저하와 단백질 자원 부족으로 모근 단백질(케라틴) 합성이 어려워지고, 기혈 순환이 저하되는 타입이에요.',
    profileHints: [
      '전반적 조직 미세 틈새(기력 약화), 두피 반사구 옅은 색조',
      '모발이 가늘어지고 건조함, 극단적 다이어트 경험, 소화 불량, 손발 차가움',
      '저체중(BMI 18.5 미만) 또는 급격한 체중 감량',
    ],
    routineClub: {
      name: '단백질 밸런스 & 득근 루틴 클럽',
      activities: ['삼시 세끼 식단 기록', '소화 개선 습관 인증'],
    },
    diet: {
      good: ['계란노른자', '소고기 살코기 · 아보카도', '비오틴 · 아연, 해조류'],
      avoid: ['무리한 절식', '과도한 카페인'],
    },
    exercise: ['하체 중심 근력 운동 (스쿼트 등)', '가벼운 족욕'],
    homecare: ['펩타이드 · 아미노산 두피 세럼', '두피 영양 보습 로션'],
    meetupCategory: 'cooking',
    meetupNote: '단백질 밸런스 쿠킹 모임과 연결해드려요',
    products: [
      { name: '바이오틴 5000mcg + 실리카', reason: '모발 강화 & 두피 개선', tag: '✂️ 모발' },
      { name: '아연 + 비오틴 복합제', reason: '단백질 합성 지원', tag: '💊 보충제' },
    ],
  },

  hormonal_dht: {
    id: 'hormonal_dht',
    emoji: '🧬',
    label: '내분비 & DHT 호르몬 감수성형',
    subtitle: '유전성 / 생체리듬 파괴',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    glow: 'rgba(139,92,246,0.3)',
    bg: 'rgba(139,92,246,0.06)',
    border: 'rgba(139,92,246,0.22)',
    mechanism: 'DHT(디하이드로테스토스테론) 호르몬 민감도와 불규칙한 생활 습관이 겹치면서 모낭 약화가 가속되는 타입이에요.',
    profileHints: [
      '내분비선(갑상선/성호르몬) 관련 영역 변형, 선천 구조 약화 징후',
      '정수리·M자 부위 모발 집중 탈락, 탈모 가족력, 불규칙한 바이오리듬',
      '다양한 체형(BMI 21.0~26.0 범위)',
    ],
    routineClub: {
      name: '생체리듬 리셋 & 안티에이징 클럽',
      activities: ['일정한 서카디언 리듬 유지', '바이오리듬 케어 인증'],
    },
    diet: {
      good: ['두부 · 콩류', '칠면조', '쏘팔메토 함유 식품'],
      avoid: ['불규칙한 식사 시간'],
    },
    exercise: ['필라테스', '수영'],
    homecare: ['모근 강화 기능성 에센스', '저준위 레이저(LLLT) 두피 마사지 기기'],
    meetupCategory: 'swimming',
    meetupNote: '수영 · 필라테스 웰니스 모임과 연결해드려요',
    products: [
      { name: '모근 강화 펩타이드 에센스', reason: 'DHT 민감도 완화 지원', tag: '✂️ 모발' },
      { name: '쏘팔메토 복합제', reason: 'DHT 조절 보조', tag: '💊 보충제' },
    ],
  },

  gut_inflammation: {
    id: 'gut_inflammation',
    emoji: '🌱',
    label: '장내 독소 & 만성 염증형',
    subtitle: '장-두피 축 / 면역 반응',
    color: '#14b8a6',
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    glow: 'rgba(20,184,166,0.3)',
    bg: 'rgba(20,184,166,0.06)',
    border: 'rgba(20,184,166,0.22)',
    mechanism: '장내 미생물 불균형(유해균 증가)으로 생성된 독소가 혈류를 타고 이동해 두피 모낭에 만성 미세 염증을 유발하는 타입이에요.',
    profileHints: [
      '장관(GI tract) 주변 자색/갈색 독소 링, 대장 영역 자극 징후',
      '만성 복부 팽만감, 잦은 소화 장애, 두피 간헐적 트러블·뾰루지, 피부 가려움',
      'BMI 23.0~27.0 (복부 비만 경향 또는 대사 불균형)',
    ],
    routineClub: {
      name: '장 디톡스 & 두피 클린 챌린지',
      activities: ['매일 배변 일기 쓰기', '공복 물 500ml 마시기 인증'],
    },
    diet: {
      good: ['사과', '양배추 · 낫또', '차전자피'],
      avoid: ['인공첨가물', '가공식품'],
    },
    exercise: ['장 마사지 스트레칭', '인클라인 트레드밀 걷기'],
    homecare: ['고함량 프로바이오틱스', '징크·어성초 두피 스칼프 토닉'],
    meetupCategory: 'hiking',
    meetupNote: '가벼운 걷기 · 장 건강 모임과 연결해드려요',
    products: [
      { name: '고함량 프로바이오틱스', reason: '장내 유익균 밸런스 & 독소 배출', tag: '🌱 장건강' },
      { name: '어성초 두피 스칼프 토닉', reason: '항염 작용 & 두피 진정', tag: '🧴 클렌징' },
    ],
  },

  cervical_capillary: {
    id: 'cervical_capillary',
    emoji: '🧍',
    label: '경추 변형 & 모세혈관 압착형',
    subtitle: '거북목 / 승모근 체증',
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    glow: 'rgba(124,58,237,0.3)',
    bg: 'rgba(124,58,237,0.06)',
    border: 'rgba(124,58,237,0.22)',
    mechanism: 'C자 경추 곡선 파괴와 상체 근육 긴장으로 두피로 향하는 목 혈관·신경이 압박되어 모근에 산소·영양 공급이 정체되는 타입이에요.',
    profileHints: [
      '자율신경링 두경부 반사구 영역 불균형 변형',
      '거북목·일자목 증상, 만성 턱관절·두통, 장시간 기기 사용, 정수리 모발이 얇아짐',
      '다양한 체형(상체 자세 불균형·굽은 어깨 체형)',
    ],
    routineClub: {
      name: '체형 교정 & 두피 혈류 리프팅 클럽',
      activities: ['매일 10분 폼롤러 인증', '목·가슴 열기 스트레칭'],
    },
    diet: {
      good: ['바나나', '시금치', '아몬드(마그네슘)'],
      avoid: ['과도한 카페인'],
    },
    exercise: ['C커브 회복 목 스트레칭', '흉추 가동성 운동', '턱 당기기(Chin-in) 자세 교정'],
    homecare: ['목·어깨 전용 괄사 툴', '경추 베개', '웜 아로마 패치'],
    meetupCategory: 'yoga',
    meetupNote: '체형 교정 · 스트레칭 모임과 연결해드려요',
    products: [
      { name: '목·어깨 전용 괄사 툴', reason: '경추 혈류 및 림프 순환 개선', tag: '🧘 체형' },
      { name: '마그네슘 글리시네이트 300mg', reason: '근육 긴장 이완 지원', tag: '💊 보충제' },
    ],
  },
}
