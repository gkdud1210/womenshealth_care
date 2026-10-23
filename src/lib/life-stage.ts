/**
 * 지금 나의 상태(생리 주기·임신·완경 + 케어 모드)를 판별하고,
 * 그 조합에 맞는 영양소·식단·운동·수면 코칭을 만들어요.
 *
 * 서버 없이 기기 안에서만 계산해요 (정적 배포에서도 동작).
 * 권장량은 2020 한국인 영양소 섭취기준(19~49세 여성, 임신부 부가량, 50세 이상)을 따랐어요.
 */

import type { CyclePhase } from '@/types/health'
import { MINERAL_DAILY, type Minerals } from '@/lib/minerals'

// ── 상태 ────────────────────────────────────────────────────────────────

/** 몸의 단계 — 한 번에 하나만 */
export type BodyStage = CyclePhase | 'pregnancy' | 'menopause' | 'irregular' | 'unknown'

/** 케어 모드 — 여러 개를 함께 켤 수 있어요 */
export type CareMode = 'ttc' | 'diet' | 'hair' | 'skin' | 'mental' | 'gut' | 'swelling' | 'senior'

export interface LifeStatus {
  body: BodyStage
  /** 생리 주기 몇 일째 (주기 단계일 때) */
  cycleDay?: number
  /** 임신 주수와 분기 */
  pregnancyWeek?: number
  trimester?: 1 | 2 | 3
  modes: CareMode[]
  /** 다이어트 중이었지만 임신이라 잠시 멈춘 상태 */
  dietPaused?: boolean
}

/** 사용자가 직접 켜고 끄는 모드 — 없으면 케어카드·문진 답변을 따라가요 */
export interface LifeFlags { ttc?: boolean; diet?: boolean }

export const LIFE_FLAGS_KEY = 'ludia_life_flags_v1'

export function loadLifeFlags(): LifeFlags {
  try { return JSON.parse(localStorage.getItem(LIFE_FLAGS_KEY) || '{}') } catch { return {} }
}
export function saveLifeFlags(f: LifeFlags) {
  try { localStorage.setItem(LIFE_FLAGS_KEY, JSON.stringify(f)) } catch {}
}

/** 캘린더에서 고른 주기 모드와 임신 시작일(마지막 생리 시작일)을 읽어요 */
export function loadCycleMode(): { mode: string; pregnancyLMP?: string } {
  let mode = 'normal'
  let pregnancyLMP: string | undefined
  try {
    const user = JSON.parse(localStorage.getItem('ludia_user_v1') || '{}')
    const saved = JSON.parse(localStorage.getItem('ludia_cycle_mode_v1') || '{}')
    mode = user.cycleMode ?? saved.mode ?? 'normal'
    if (saved.pregnancyLMP) pregnancyLMP = saved.pregnancyLMP
  } catch {}
  return { mode, pregnancyLMP }
}

const CARE_MODE_OF: Record<string, CareMode> = {
  weight_metabolic: 'diet',
  hair_scalp: 'hair',
  skin_beauty: 'skin',
  mental_brain: 'mental',
  gut_detox: 'gut',
  musculoskeletal_lymph: 'swelling',
  senior_wellness: 'senior',
}

export function resolveLifeStatus(input: {
  cycleMode: string
  pregnancyLMP?: string
  phase: CyclePhase
  cycleDay: number
  hasCycleData: boolean
  careTypes: string[]
  intake: string[]
  flags: LifeFlags
  today?: Date
}): LifeStatus {
  const { cycleMode, pregnancyLMP, phase, cycleDay, hasCycleData, careTypes, intake, flags } = input
  const today = input.today ?? new Date()

  let body: BodyStage
  let pregnancyWeek: number | undefined
  let trimester: 1 | 2 | 3 | undefined
  if (cycleMode === 'pregnancy') {
    body = 'pregnancy'
    if (pregnancyLMP) {
      const days = Math.floor((today.getTime() - new Date(pregnancyLMP + 'T00:00:00').getTime()) / 86400000)
      pregnancyWeek = Math.max(1, Math.min(42, Math.floor(days / 7)))
      trimester = pregnancyWeek <= 13 ? 1 : pregnancyWeek <= 27 ? 2 : 3
    }
  } else if (cycleMode === 'menopause') {
    body = 'menopause'
  } else if (cycleMode === 'amenorrhea' || cycleMode === 'irregular') {
    body = 'irregular'
  } else {
    body = hasCycleData ? phase : 'unknown'
  }

  const modes: CareMode[] = []
  // 임신 준비는 임신·완경 중엔 의미가 없어요
  const ttc = flags.ttc ?? intake.includes('sit_fertility')
  if (ttc && body !== 'pregnancy' && body !== 'menopause') modes.push('ttc')
  const diet = flags.diet ?? careTypes.includes('weight_metabolic')
  const dietPaused = diet && body === 'pregnancy'
  if (diet && !dietPaused) modes.push('diet')
  for (const id of careTypes) {
    const m = CARE_MODE_OF[id]
    if (m && m !== 'diet' && !modes.includes(m)) modes.push(m)
  }

  return {
    body,
    cycleDay: body === 'menstrual' || body === 'follicular' || body === 'ovulation' || body === 'luteal' ? cycleDay : undefined,
    pregnancyWeek, trimester, modes, dietPaused,
  }
}

export const BODY_META: Record<BodyStage, { label: string; emoji: string; color: string }> = {
  menstrual:  { label: '생리기',        emoji: '🩸', color: '#e11d48' },
  follicular: { label: '난포기',        emoji: '🌱', color: '#16a34a' },
  ovulation:  { label: '배란기',        emoji: '🥚', color: '#d97706' },
  luteal:     { label: '황체기(PMS)',   emoji: '🌙', color: '#7c3aed' },
  pregnancy:  { label: '임신기',        emoji: '🤰', color: '#a855f7' },
  menopause:  { label: '완경기',        emoji: '🌸', color: '#db2777' },
  irregular:  { label: '주기 불순',     emoji: '⚡', color: '#f59e0b' },
  unknown:    { label: '주기 기록 전',  emoji: '📅', color: '#64748b' },
}

export const MODE_META: Record<CareMode, { label: string; emoji: string }> = {
  ttc:      { label: '임신준비기',  emoji: '🍃' },
  diet:     { label: '다이어트모드', emoji: '⚖️' },
  hair:     { label: '탈모케어',    emoji: '💇' },
  skin:     { label: '피부케어',    emoji: '✨' },
  mental:   { label: '멘탈케어',    emoji: '🧘' },
  gut:      { label: '장케어',      emoji: '🌿' },
  swelling: { label: '부기케어',    emoji: '💧' },
  senior:   { label: '시니어케어',   emoji: '🌳' },
}

/** "다이어트모드 + 생리기" 처럼 한 줄로 */
export function statusLabel(s: LifeStatus): string {
  return [...s.modes.map(m => MODE_META[m].label), bodyLabel(s)].join(' + ')
}

export function bodyLabel(s: LifeStatus): string {
  const base = BODY_META[s.body].label
  if (s.body === 'pregnancy' && s.pregnancyWeek) return `${base} ${s.pregnancyWeek}주`
  if (s.body === 'menstrual' && s.cycleDay) return `${base} ${s.cycleDay}일째`
  return base
}

// ── 코칭 재료 ───────────────────────────────────────────────────────────

export interface Nutrient { name: string; amount?: string; why: string }

interface Block {
  headline: string
  nutrients: Nutrient[]
  foods: string[]
  avoid: string[]
  /** 1 회복 · 2 가볍게 · 3 중간 · 4 활발하게 · 5 고강도 */
  intensity: number
  /** 이 상태에서 넘으면 안 되는 강도 */
  maxIntensity?: number
  exercise: string[]
  exerciseCaution?: string
  sleep: string[]
}

const BODY_BLOCKS: Record<Exclude<BodyStage, 'pregnancy'>, Block> = {
  menstrual: {
    headline: '빠져나간 철분을 채우고, 몸을 따뜻하게 쉬게 해 주세요',
    nutrients: [
      { name: '철분', amount: '14mg', why: '생리혈로 잃는 철 보충' },
      { name: '비타민C', why: '식물성 철분 흡수를 도와요' },
      { name: '마그네슘', amount: '280mg', why: '자궁 근육 긴장을 풀어 생리통 완화' },
      { name: '오메가3', why: '통증 물질(프로스타글란딘) 줄이기' },
    ],
    foods: ['소고기 살코기', '바지락·굴', '시금치', '두부', '견과류', '따뜻한 생강차'],
    avoid: ['카페인 과다', '짠 음식(부기)', '찬 음식', '술'],
    intensity: 2, maxIntensity: 2,
    exercise: ['요가·스트레칭 20~30분', '가벼운 걷기', '골반 풀어주는 고양이 자세'],
    exerciseCaution: '통증이 심한 날은 고강도 운동과 거꾸로 서는 자세를 쉬어요',
    sleep: ['평소보다 30분 일찍 누워 7~9시간', '자기 전 아랫배 따뜻하게 찜질', '옆으로 누워 무릎을 살짝 굽히면 통증이 덜해요'],
  },
  follicular: {
    headline: '에너지가 올라오는 시기 — 근력 운동을 늘리기 좋아요',
    nutrients: [
      { name: '단백질', amount: '50g 이상', why: '근력 운동 효과를 키워요' },
      { name: '비타민B군', why: '에너지 대사' },
      { name: '발효식품', why: '에스트로겐 대사를 돕는 장 건강' },
    ],
    foods: ['달걀', '닭가슴살', '그릭요거트', '김치·된장', '현미', '브로콜리'],
    avoid: ['정제당 과다'],
    intensity: 4,
    exercise: ['근력 운동 무게·횟수 늘리기', '인터벌 러닝', '새 운동 배우기'],
    sleep: ['7시간 이상, 같은 시간에 자고 일어나기'],
  },
  ovulation: {
    headline: '컨디션이 가장 좋은 때 — 운동 강도를 올려도 좋아요',
    nutrients: [
      { name: '아연', amount: '8mg', why: '배란·호르몬 균형' },
      { name: '식이섬유', why: '높아진 에스트로겐을 잘 배출하도록' },
      { name: '비타민B6', why: '다음 단계 PMS 대비' },
    ],
    foods: ['굴·조개', '호박씨', '브로콜리·양배추', '베리류', '연어'],
    avoid: ['과음'],
    intensity: 4,
    exercise: ['고강도 인터벌·크로스핏', '러닝 기록 도전', '구기 종목'],
    exerciseCaution: '이 시기엔 무릎 인대 부상이 늘어난다는 연구가 있어요 — 워밍업을 충분히',
    sleep: ['7시간 이상'],
  },
  luteal: {
    headline: '식욕·부기가 늘어나는 시기 — 마그네슘과 복합 탄수화물로 다스려요',
    nutrients: [
      { name: '마그네슘', amount: '280mg', why: 'PMS·짜증·수면' },
      { name: '비타민B6', why: '기분 변화·부기 완화' },
      { name: '칼슘', amount: '700mg', why: 'PMS 증상 완화' },
      { name: '복합 탄수화물', why: '단 음식 당김을 줄여요' },
    ],
    foods: ['고구마·현미', '바나나', '다크초콜릿 조금', '아몬드', '시금치', '요거트'],
    avoid: ['짠 음식(부기)', '단 간식 폭식', '카페인', '술'],
    intensity: 3, maxIntensity: 3,
    exercise: ['중간 강도 유산소 30분', '필라테스', '수영'],
    exerciseCaution: '체온이 올라 쉽게 지쳐요 — 물을 자주 마셔요',
    sleep: ['체온이 올라 잠이 얕아져요 — 침실을 18~20℃로 시원하게', '저녁 카페인 끊기'],
  },
  menopause: {
    headline: '뼈와 근육을 지키는 게 가장 중요해요',
    nutrients: [
      { name: '칼슘', amount: '800mg', why: '에스트로겐이 줄면 뼈가 빨리 약해져요' },
      { name: '비타민D', amount: '10~15μg', why: '칼슘 흡수' },
      { name: '단백질', amount: '체중 1kg당 1~1.2g', why: '근감소 예방' },
      { name: '콩 이소플라본', why: '안면홍조 완화에 도움' },
      { name: '오메가3', why: '심혈관 보호' },
    ],
    foods: ['두부·두유·낫토', '멸치', '우유·요거트', '연어·고등어', '브로콜리', '달걀'],
    avoid: ['짠 음식(칼슘 손실)', '술', '카페인(홍조·수면)', '매운 음식(홍조)'],
    intensity: 3, maxIntensity: 4,
    exercise: ['근력 운동 주 2~3회', '걷기·계단 등 체중을 싣는 운동(뼈 자극)', '한 발 서기 등 균형 운동'],
    sleep: ['안면홍조·식은땀 대비 침실은 시원하게, 면 잠옷', '저녁 술·카페인 피하기', '잠이 안 오면 20분 뒤 일어나 다시 눕기'],
  },
  irregular: {
    headline: '몸이 에너지 부족 신호를 보내는지 먼저 살펴요',
    nutrients: [
      { name: '충분한 칼로리', why: '에너지가 모자라면 배란이 멈춰요' },
      { name: '건강한 지방', why: '호르몬의 재료' },
      { name: '철분', amount: '14mg', why: '빈혈 예방' },
      { name: '비타민D', why: '호르몬 균형' },
    ],
    foods: ['아보카도', '견과류', '연어', '달걀', '현미밥'],
    avoid: ['굶거나 극단적인 식단', '과한 카페인'],
    intensity: 2, maxIntensity: 3,
    exercise: ['걷기·요가 위주', '고강도 운동은 주 2회 이내로 줄이기'],
    exerciseCaution: '3개월 넘게 생리가 없으면 산부인과 진료를 받아 보세요',
    sleep: ['7~8시간, 매일 같은 시간에 자기', '스트레스 호르몬을 낮추는 저녁 루틴'],
  },
  unknown: {
    headline: '캘린더에 생리 시작일을 기록하면 주기에 맞춰 코칭해 드려요',
    nutrients: [
      { name: '철분', amount: '14mg', why: '가임기 여성에게 부족하기 쉬워요' },
      { name: '칼슘', amount: '700mg', why: '뼈 건강' },
      { name: '단백질', amount: '50g', why: '근육·호르몬 재료' },
    ],
    foods: ['달걀', '두부', '시금치', '우유·요거트', '생선'],
    avoid: ['정제당 과다'],
    intensity: 3, maxIntensity: 4,
    exercise: ['중간 강도 운동 주 150분', '근력 운동 주 2회'],
    sleep: ['7시간 이상'],
  },
}

function pregnancyBlock(trimester?: 1 | 2 | 3): Block {
  const t = trimester ?? 1
  return {
    headline: t === 1
      ? '입덧이 있어도 엽산은 꼭 — 조금씩 자주 먹어요'
      : t === 2
        ? '하루 340kcal 정도 더 필요해요 — 철분과 단백질을 늘려요'
        : '하루 450kcal 정도 더 필요해요 — 단백질·칼슘으로 아기 성장을 도와요',
    nutrients: [
      { name: '엽산', amount: '620μg', why: '신경관 결손 예방' },
      { name: '철분', amount: '24mg', why: '늘어난 혈액량 · 빈혈 예방' },
      { name: '단백질', amount: t === 1 ? '50g' : t === 2 ? '65g' : '80g', why: '태아·태반 성장' },
      { name: '칼슘', amount: '700mg', why: '아기 뼈 · 엄마 뼈 지키기' },
      { name: 'DHA(오메가3)', why: '아기 뇌·눈 발달' },
    ],
    foods: t === 1
      ? ['크래커·누룽지(입덧)', '생강차', '시금치·브로콜리', '달걀', '바나나']
      : ['소고기 살코기', '연어(익혀서)', '두부', '우유·요거트', '시금치', '현미밥'],
    avoid: ['술', '날음식(회·육회·날달걀)', '살균 안 된 치즈', '카페인 하루 200mg 넘게(커피 2잔)', '수은 많은 대형 생선(황새치·참치 뱃살)', '간 과다(비타민A)'],
    intensity: 3, maxIntensity: 3,
    exercise: ['걷기', '임산부 요가', '수영·아쿠아로빅', '주 150분 · 말하면서 할 수 있는 강도'],
    exerciseCaution: '배를 부딪칠 수 있는 운동, 넘어지기 쉬운 운동, 16주 이후 오래 바로 눕는 자세는 피하고, 시작 전 담당 의사와 상의하세요',
    sleep: t === 1
      ? ['피로가 심한 시기 — 낮잠도 괜찮아요', '8시간 이상']
      : ['왼쪽으로 누워 자면 혈류에 좋아요', '배·무릎 사이 베개', '자기 2시간 전 물 줄이기(야간뇨)'],
  }
}

const MODE_BLOCKS: Record<CareMode, Partial<Block> & { intensityDelta?: number }> = {
  ttc: {
    nutrients: [
      { name: '엽산', amount: '400μg', why: '임신 3개월 전부터 — 신경관 결손 예방' },
      { name: '비타민D', why: '난소 기능·착상' },
      { name: '오메가3', why: '난자 질' },
    ],
    foods: ['녹색 잎채소', '콩·렌틸콩', '달걀', '고등어·연어'],
    avoid: ['술·담배', '카페인 하루 200mg 넘게', '수은 많은 대형 생선'],
    exercise: ['중간 강도 운동 주 150분'],
    exerciseCaution: '지나친 고강도 운동은 배란을 방해할 수 있어요',
    sleep: ['7~8시간 규칙적으로 — 수면이 무너지면 호르몬도 흔들려요'],
  },
  diet: {
    nutrients: [
      { name: '단백질', why: '끼니마다 손바닥 한 개 — 근육은 지키고 지방만' },
      { name: '식이섬유', why: '포만감 유지' },
    ],
    foods: ['닭가슴살', '달걀', '두부', '채소 듬뿍', '현미·귀리'],
    avoid: ['액상과당 음료', '야식', '튀김'],
    intensityDelta: 1,
    exercise: ['근력 운동 주 2~3회 + 유산소'],
    sleep: ['잠이 6시간보다 적으면 식욕 호르몬이 늘어요'],
  },
  hair: {
    nutrients: [
      { name: '단백질', why: '머리카락의 재료(케라틴)' },
      { name: '철분', why: '부족하면 휴지기 탈모' },
      { name: '아연', amount: '8mg', why: '모낭 재생' },
      { name: '비오틴·비타민D', why: '모발 성장 주기' },
    ],
    foods: ['달걀', '검은콩', '굴', '연어', '호두'],
    avoid: ['굶는 다이어트', '과음'],
    exercise: ['두피 혈류를 돕는 유산소'],
    sleep: ['자정 전에 잠들기 — 모발 성장 호르몬은 깊은 잠에서 나와요'],
  },
  skin: {
    nutrients: [{ name: '비타민C', why: '콜라겐 합성' }, { name: '아연', why: '트러블 회복' }],
    foods: ['파프리카', '키위', '토마토'],
    avoid: ['고당 디저트', '유제품 과다'],
    sleep: ['7시간 이상 — 피부 재생 시간'],
  },
  mental: {
    nutrients: [{ name: '마그네슘', why: '긴장 완화' }, { name: '트립토판', why: '세로토닌·멜라토닌 재료' }],
    foods: ['바나나', '우유', '귀리', '견과류'],
    avoid: ['과한 카페인', '공복 상태 오래'],
    exercise: ['햇빛 보며 걷기 20분'],
    sleep: ['잠들기 1시간 전 휴대폰 내려놓기'],
  },
  gut: {
    nutrients: [{ name: '식이섬유', why: '장내 유익균 먹이' }, { name: '발효식품', why: '유익균 보충' }],
    foods: ['김치', '요거트', '양배추', '사과', '물 1.5L'],
    avoid: ['자극적인 음식', '밀가루 과다'],
  },
  swelling: {
    nutrients: [{ name: '칼륨', amount: '3,500mg', why: '나트륨 배출' }],
    foods: ['바나나', '감자', '오이', '팥물'],
    avoid: ['짠 국물', '가공육'],
    exercise: ['종아리 펌핑 스트레칭'],
  },
  senior: {
    nutrients: [{ name: '단백질', why: '근감소 예방' }, { name: '칼슘·비타민D', why: '골다공증 예방' }],
    foods: ['두부', '생선', '우유'],
    exercise: ['의자 스쿼트', '균형 운동'],
  },
}

export const INTENSITY_LABEL = ['', '회복', '가볍게', '중간', '활발하게', '고강도'] as const

// ── 오늘 기록 분석 ─────────────────────────────────────────────────────

export interface TodayIntake {
  kcal: number
  protein: number
  minerals?: Minerals
  mealsLogged: number
}

export interface RecentActivity {
  /** 최근 7일 평균 수면 (기록 없으면 undefined) */
  avgSleep?: number
  sleepDays: number
  /** 이번 주 운동 시간 (분) */
  weekMinutes: number
}

export interface Coaching {
  status: LifeStatus
  label: string
  headline: string
  /** 다른 상태끼리 부딪힐 때의 조정 */
  adjustments: string[]
  nutrients: Nutrient[]
  foods: string[]
  avoid: string[]
  intensity: number
  exercise: string[]
  exerciseCautions: string[]
  sleep: string[]
  /** 오늘·이번 주 기록을 보고 한 말 */
  todayNotes: string[]
  /** 하루 칼로리 목표 보정 (kcal) */
  kcalDelta: number
  /** 다이어트 적자를 막아야 하는 상태 */
  blockDeficit: boolean
  /** 칼로리 목표 옆에 붙는 식단 방향 (상태가 기존 케어 식단보다 우선할 때) */
  focusOverride?: string
}

function uniqBy<T>(list: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>()
  return list.filter(t => { const k = key(t); if (seen.has(k)) return false; seen.add(k); return true })
}

/** 상태별 하루 목표 (오늘 부족한 것 찾기용) */
function dailyTargets(s: LifeStatus): { protein: number; minerals: Minerals } {
  const minerals = { ...MINERAL_DAILY }
  let protein = 50
  if (s.body === 'pregnancy') {
    minerals.iron = 24
    protein = s.trimester === 3 ? 80 : s.trimester === 2 ? 65 : 50
  }
  if (s.body === 'menopause') { minerals.calcium = 800; minerals.iron = 8 }
  if (s.modes.includes('diet')) protein = Math.max(protein, 60)
  return { protein, minerals }
}

const MINERAL_FOODS: Record<keyof Minerals, string> = {
  calcium: '우유·요거트·멸치·두부',
  iron: '소고기 살코기·바지락·시금치',
  magnesium: '견과류·현미·시금치',
  potassium: '바나나·감자·고구마',
  zinc: '굴·소고기·호박씨',
}
const MINERAL_LABEL: Record<keyof Minerals, string> = {
  calcium: '칼슘', iron: '철분', magnesium: '마그네슘', potassium: '칼륨', zinc: '아연',
}

export function buildCoaching(s: LifeStatus, today: TodayIntake, recent: RecentActivity): Coaching {
  const base = s.body === 'pregnancy' ? pregnancyBlock(s.trimester) : BODY_BLOCKS[s.body]
  const modes = s.modes.map(m => MODE_BLOCKS[m])
  const adjustments: string[] = []
  const has = (m: CareMode) => s.modes.includes(m)

  // 운동 강도 — 몸 단계가 기준, 다이어트는 한 단계 올리되 몸 단계의 상한을 넘지 않아요
  let intensity = base.intensity + modes.reduce((d, m) => d + (m.intensityDelta ?? 0), 0)
  if (base.maxIntensity) intensity = Math.min(intensity, base.maxIntensity)
  if (has('ttc')) intensity = Math.min(intensity, 4)
  intensity = Math.max(1, Math.min(5, intensity))

  // 칼로리
  let kcalDelta = 0
  let blockDeficit = false
  if (s.body === 'pregnancy') {
    kcalDelta = s.trimester === 3 ? 450 : s.trimester === 2 ? 340 : 0
    blockDeficit = true
    if (s.dietPaused) adjustments.push('임신 중에는 다이어트를 멈추고, 권장 체중 증가 범위 안에서 관리해요. 칼로리 목표도 임신부 기준으로 바꿨어요.')
  }
  if (s.body === 'irregular') {
    blockDeficit = true
    if (has('diet')) adjustments.push('생리가 불규칙할 땐 칼로리를 너무 줄이면 더 늦어질 수 있어요. 감량보다 규칙적인 세 끼를 먼저 챙겨요.')
  }
  if (has('ttc') && has('diet')) adjustments.push('임신 준비 중 감량은 한 달 2kg 이내로 천천히 — 극단적인 식단은 배란을 흔들어요.')
  if (s.body === 'menstrual' && has('diet')) {
    kcalDelta = 100
    adjustments.push('생리 중엔 감량 속도를 잠깐 늦춰요(목표 +100kcal). 체중이 1~2kg 늘어 보이는 건 대부분 수분이라 걱정하지 않아도 돼요.')
  }
  if (s.body === 'luteal' && has('diet')) {
    kcalDelta = 150
    adjustments.push('황체기엔 기초대사량이 조금 올라 배고픈 게 정상이에요. 목표를 150kcal 올렸으니 간식은 단백질·견과류로 골라요.')
  }
  if ((s.body === 'follicular' || s.body === 'ovulation') && has('diet')) adjustments.push('감량하기 가장 좋은 시기예요. 근력 운동을 늘려 근육을 지키면서 빼요.')
  if (has('hair') && has('diet')) adjustments.push('급하게 빼면 2~3달 뒤 머리가 한꺼번에 빠질 수 있어요(휴지기 탈모). 단백질은 줄이지 마세요.')
  if (has('hair') && s.body === 'menopause') adjustments.push('완경 후엔 에스트로겐이 줄어 모발이 가늘어지기 쉬워요. 콩 단백질과 두피 혈류 운동을 함께 챙겨요.')
  if (has('hair') && s.body === 'menstrual') adjustments.push('생리로 철분이 빠지는 지금이 탈모 관리에도 중요해요. 철분 식품을 매 끼니에 넣어요.')
  if (has('ttc') && s.body === 'ovulation') adjustments.push('지금이 가임기예요. 무리한 운동보다 충분한 수면과 휴식이 좋아요.')

  // 오늘 기록
  const todayNotes: string[] = []
  const targets = dailyTargets(s)
  if (today.mealsLogged > 0) {
    if (today.protein < targets.protein * (today.mealsLogged / 3) * 0.8) {
      todayNotes.push(`단백질이 지금 ${Math.round(today.protein)}g이에요. 오늘 목표 ${targets.protein}g까지 남은 끼니에 달걀·두부·생선을 넣어요.`)
    }
    if (today.minerals) {
      const ratio = today.mealsLogged / 3
      const low = (Object.keys(targets.minerals) as (keyof Minerals)[])
        .filter(k => today.minerals![k] < targets.minerals[k] * ratio * 0.6)
      // 상태에 중요한 것부터
      const priority: (keyof Minerals)[] = s.body === 'menopause' ? ['calcium', 'magnesium'] : ['iron', 'calcium', 'magnesium']
      low.sort((a, b) => Number(priority.includes(b)) - Number(priority.includes(a)))
      for (const k of low.slice(0, 2)) {
        todayNotes.push(`${MINERAL_LABEL[k]}이 오늘 목표(${targets.minerals[k].toLocaleString()}mg)보다 모자라요 → ${MINERAL_FOODS[k]}`)
      }
    }
  } else {
    todayNotes.push('오늘 식단을 찍어 올리면 부족한 영양소를 바로 짚어 드려요.')
  }
  if (recent.avgSleep !== undefined) {
    if (recent.avgSleep < 6.5) todayNotes.push(`최근 ${recent.sleepDays}일 평균 수면이 ${recent.avgSleep.toFixed(1)}시간이에요. 오늘은 30분 일찍 누워 봐요.`)
    else todayNotes.push(`최근 평균 수면 ${recent.avgSleep.toFixed(1)}시간 — 잘 지키고 있어요.`)
  }
  if (intensity >= 3) {
    if (recent.weekMinutes < 150) todayNotes.push(`이번 주 운동 ${recent.weekMinutes}분 — 권장 150분까지 ${150 - recent.weekMinutes}분 남았어요.`)
    else todayNotes.push(`이번 주 운동 ${recent.weekMinutes}분으로 권장량을 채웠어요 👏`)
  } else if (recent.weekMinutes > 0) {
    todayNotes.push(`이번 주 운동 ${recent.weekMinutes}분. 지금은 강도보다 회복이 우선이에요.`)
  }

  const modeHeadline = has('diet') && (s.body === 'follicular' || s.body === 'ovulation') ? ' · 감량하기 좋은 때예요' : ''

  return {
    status: s,
    label: statusLabel(s),
    headline: base.headline + modeHeadline,
    adjustments,
    nutrients: uniqBy([...base.nutrients, ...modes.flatMap(m => m.nutrients ?? [])], n => n.name),
    foods: uniqBy([...base.foods, ...modes.flatMap(m => m.foods ?? [])], f => f).slice(0, 12),
    avoid: uniqBy([...base.avoid, ...modes.flatMap(m => m.avoid ?? [])], f => f),
    intensity,
    // 강도가 낮아야 하는 시기엔 다이어트 운동 추천을 빼요
    exercise: uniqBy([...base.exercise, ...s.modes.filter(m => !(m === 'diet' && intensity <= 2)).flatMap(m => MODE_BLOCKS[m].exercise ?? [])], f => f),
    exerciseCautions: [base.exerciseCaution, ...modes.map(m => m.exerciseCaution)].filter((x): x is string => !!x),
    sleep: uniqBy([...base.sleep, ...modes.flatMap(m => m.sleep ?? [])], f => f),
    todayNotes,
    kcalDelta,
    blockDeficit,
    focusOverride: s.body === 'pregnancy'
      ? '임신부 권장 칼로리 기준 · 엽산·철분·단백질을 고루 챙겨요'
      : s.body === 'irregular' && has('diet')
        ? '감량보다 규칙적인 세 끼로 충분히 먹어요'
        : undefined,
  }
}

/** 칼로리 목표를 상태에 맞게 보정해요 — 임신·주기 불순이면 감량 목표를 풀어요 */
export function adjustKcalRange(range: [number, number], c: Pick<Coaching, 'kcalDelta' | 'blockDeficit'>): [number, number] {
  let [lo, hi] = range
  if (c.blockDeficit) { lo = Math.max(lo, 1800); hi = Math.max(hi, 2100) }
  return [lo + c.kcalDelta, hi + c.kcalDelta]
}
