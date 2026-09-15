import type { MeetupCategory } from '@/data/meetupData'

export type HairCareTypeId = 'stress_heat' | 'metabolic_damp_heat' | 'deficiency' | 'hormonal_genetic'

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
  stress_heat: {
    id: 'stress_heat',
    emoji: '🔥',
    label: '상열하한 & 고스트레스형',
    subtitle: '심리 · 자율신경 불균형',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    glow: 'rgba(239,68,68,0.3)',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.22)',
    mechanism: '교감신경 과활성화로 두피 혈관이 수축되고, 두피에 열이 오르면서 모낭 주기가 짧아지는 패턴이에요.',
    profileHints: [
      '자율신경 균형(HRV · 스트레스 지수) 저하 신호',
      '두피 화끈거림, 만성 어깨 · 목 결림 경향',
      '정상 ~ 마른 체형(BMI 18.5~22.9), 근육량 부족',
    ],
    routineClub: {
      name: '쿨다운 & 마인드풀니스 클럽',
      activities: ['저녁 명상 인증', '11시 전 수면 인증', '상체 유연성 스트레칭'],
    },
    diet: {
      good: ['메밀', '박하차 · 녹차', '연근'],
      avoid: ['정제당', '매운 음식'],
    },
    exercise: ['가벼운 산책', '이완 요가', '승모근 괄사 마사지'],
    homecare: ['멘톨 · 쿨링 성분 약산성 토닉', '목 · 어깨 이완 아로마 오일 테라피'],
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
    label: '대사증후군 & 지루성 습열형',
    subtitle: '영양 과다 · 대사 불균형',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glow: 'rgba(245,158,11,0.3)',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.22)',
    mechanism: '과도한 피지 분비로 모공이 막히고, 체내 염증 수치 증가와 대사 장애로 모발에 영양 전달이 저해돼요.',
    profileHints: [
      '체내 순환 정체 · 독소 축적 경향',
      '기름진 두피, 비듬, 만성 피로',
      '과체중 ~ 비만 체형(BMI 25 이상), 내장지방형',
    ],
    routineClub: {
      name: '클린 디톡스 & 식단 챌린지',
      activities: ['간헐적 단식 인증', '당류 차단 인증', '매일 2L 물 마시기'],
    },
    diet: {
      good: ['검은콩', '토마토 · 브로콜리', '등푸른생선'],
      avoid: ['튀김 · 고지방 음식', '알코올'],
    },
    exercise: ['빠르게 걷기', '인클라인 트레드밀', '중강도 근력 운동'],
    homecare: ['딥클렌징 스케일링 샴푸 (살리실산 · 징크피리치온)', '주 1~2회 두피 딥클레이 팩'],
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
    label: '허약 섭취 & 영양 결핍형',
    subtitle: '기혈 수척 · 다이어트 부작용',
    color: '#64748b',
    gradient: 'linear-gradient(135deg, #64748b, #475569)',
    glow: 'rgba(100,116,139,0.3)',
    bg: 'rgba(100,116,139,0.06)',
    border: 'rgba(100,116,139,0.22)',
    mechanism: '모근 단백질(케라틴) 합성 자원이 부족하고 기혈 순환이 저하되면서 모공이 소모돼요.',
    profileHints: [
      '전반적 조직 강도 저하, 영양 공급 저하 신호',
      '소화 불량, 손발 차가움, 모발이 가늘고 건조',
      '저체중(BMI 18.5 미만) 또는 급격한 체중 감량',
    ],
    routineClub: {
      name: '단백질 밸런스 & 웰빙 쿡클럽',
      activities: ['삼시 세끼 식단 기록', '소화 개선 웰빙 습관 모임'],
    },
    diet: {
      good: ['계란노른자', '소고기 살코기 · 아보카도', '해조류 · 비오틴/아연 보충제'],
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

  hormonal_genetic: {
    id: 'hormonal_genetic',
    emoji: '🧬',
    label: '호르몬 & 불균형 라이프스타일형',
    subtitle: '유전성 + 생활습관 촉진',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    glow: 'rgba(139,92,246,0.3)',
    bg: 'rgba(139,92,246,0.06)',
    border: 'rgba(139,92,246,0.22)',
    mechanism: 'DHT(디하이드로테스토스테론) 민감도와 불규칙한 생활 습관이 겹치면서 탈모 진행 속도가 빨라져요.',
    profileHints: [
      '정수리 · M자 부위 집중 탈락 패턴',
      '불규칙한 수면 패턴, 가족력 보유 가능성',
      'BMI 21~26 범위로 체형은 다양함',
    ],
    routineClub: {
      name: '안티에이징 & 생체리듬 리셋 클럽',
      activities: ['일정한 서카디언 리듬 유지', '바이오리듬 케어 인증'],
    },
    diet: {
      good: ['두부 · 칠면조', '쏘팔메토 · 식물성 오일'],
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
}
