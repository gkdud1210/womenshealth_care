// ── 홍채 타입 · 지금 나의 상태 ──────────────────────────────────────────────
//
// 두 축으로 나눠요.
//  · 타고난 기질 (홍채 섬유 밀도·배열) — 실크 · 리넨 · 헤시안 · 꽃잎 4가지. 잘 변하지 않아요.
//  · 지금 긴장도 (자율신경) — 0(안정·균형) ~ 100(긴장·과부하). 관리하면 움직여요.
// 기질 × 상태(안정 / 긴장) = 8가지 타입. 가운데쯤이면 '경계'로 보여줘요.
//
// 홍채 엔진(LUDIA LAB / LUDIA HEALTH 판독) 결과에서 쓰는 값
//  · 열공(lac)·움(cry) — 섬유 사이 틈. 많을수록 성근(개방형) 섬유
//  · 틈이 동공 가까이(위·장 구역, 안쪽 띠)에 모였는지 — 꽃잎형
//  · 긴장륜(스트레스 링) 소견, 동공 ÷ 홍채 크기 — 자율신경 긴장
//  · 색소 반점(pig)의 구역 — 감정 처리 방식
// 여기에 EDA(스트레스·긴장·자율신경 균형)와 HRV 를 더해 지금 긴장도를 정해요.
// 연구·웰니스용 해석이며 의학적·심리학적 진단이 아니에요.

import type { MultimodalData, IrisEyeDetection, IrisLesion } from '@/components/calendar/LudiaInsightCard'

export type Temperament = 'silk' | 'linen' | 'hessian' | 'flower'
export type PsycheState = 'calm' | 'border' | 'tense'

export interface TemperamentMeta {
  label: string; short: string; emoji: string; color: string; bg: string
  fiber: string; trait: string; desc: string
  /** 밀집형(실크·리넨) / 개방형(헤시안·꽃잎) */
  axis: '밀집형' | '개방형'
}

export const TEMPERAMENTS: Record<Temperament, TemperamentMeta> = {
  silk: {
    label: '실크형', short: '완벽·집중', emoji: '🧵', color: '#6366f1', bg: '#eef2ff', axis: '밀집형',
    fiber: '섬유가 가늘고 빈틈없이 촘촘하게 뻗어 있어요',
    trait: '완벽주의적 실행가',
    desc: '목표 지향적이고 인내심이 강해요. 감정을 쉽게 드러내지 않고 안으로 삭이는 편이에요. 스트레스 한계치가 높지만, 한 번 무너지면 번아웃이 깊게 와요.',
  },
  linen: {
    label: '리넨형', short: '유연·조화', emoji: '🌾', color: '#0d9488', bg: '#f0fdfa', axis: '밀집형',
    fiber: '섬유 사이에 미세한 공간이 보이고 유연한 곡선을 띠어요',
    trait: '균형 잡힌 조율가',
    desc: '환경 적응력과 회복탄력성이 좋아요. 외부 자극에 유연하게 대처하고 사람들 사이에서 중재자 역할을 잘해요.',
  },
  hessian: {
    label: '헤시안형', short: '감성·직관', emoji: '🌿', color: '#7c3aed', bg: '#f5f3ff', axis: '개방형',
    fiber: '섬유가 성글고 열공·틈이 자주 보여요',
    trait: '감성적 직관가',
    desc: '주변 환경과 다른 사람의 감정에 민감한 공감형이에요. 에너지가 쉽게 소진돼서 혼자만의 충전 시간이 꼭 필요해요. 창의적이고 예술적인 기질이 강해요.',
  },
  flower: {
    label: '꽃잎형', short: '열정·표현', emoji: '🌸', color: '#e11d48', bg: '#fff1f2', axis: '개방형',
    fiber: '동공 주변(자율신경환)에 둥근 열공이 꽃잎처럼 모여 있어요',
    trait: '열정적 표현가',
    desc: '표현력이 풍부하고 사교적이에요. 감정 기복이 조금 있지만 자극에 빠르게 반응하고, 즉흥적이며 추진력이 좋아요.',
  },
}

export interface PsycheTypeMeta {
  name: string; emoji: string; tagline: string; desc: string; care: string[]
}

/** 기질 × 상태 → 8가지 타입 */
export const PSYCHE_TYPES: Record<Temperament, Record<'calm' | 'tense', PsycheTypeMeta>> = {
  silk: {
    calm:  { name: '단단한 바위형', emoji: '🪨', tagline: '침착한 전략가 · 흔들림 없는 실행력',
             desc: '집중력과 실행력이 안정적으로 발휘되는 상태예요. 계획한 일을 끝까지 해내는 힘이 있어요.',
             care: ['지금의 루틴을 지키되 쉬는 날도 일정에 넣기', '성취 뒤에 몸의 신호(어깨·턱 긴장) 점검하기'] },
    tense: { name: '팽팽한 활시위형', emoji: '🏹', tagline: '과도한 책임감 · 번아웃 직전의 완벽주의자',
             desc: '스스로를 계속 채찍질하며 긴장을 놓지 못하는 상태예요. 겉으로는 괜찮아 보여도 안에서 에너지가 바닥나고 있을 수 있어요.',
             care: ['하루 할 일을 3가지로 줄이기', '잠들기 전 4-7-8 호흡 5분', '마그네슘·따뜻한 반신욕으로 근육 이완'] },
  },
  linen: {
    calm:  { name: '잔잔한 강물형', emoji: '🏞️', tagline: '긍정적 중재자 · 높은 회복탄력성',
             desc: '유연함과 회복력이 잘 살아 있는 상태예요. 스트레스가 와도 금방 제자리로 돌아와요.',
             care: ['좋아하는 사람·활동과 꾸준히 연결되기', '가벼운 유산소로 지금의 리듬 유지'] },
    tense: { name: '소용돌이 바람형', emoji: '🌪️', tagline: '눈치와 배려로 인한 내적 갈등 · 감정 피로',
             desc: '다른 사람을 맞추느라 내 감정은 뒤로 미루고 있는 상태예요. 겉은 평온해도 속에서는 감정 피로가 쌓여요.',
             care: ['하루 한 번 "싫어요·괜찮지 않아요" 말해 보기', '감정 일기 3줄', '혼자 걷는 산책 20분'] },
  },
  hessian: {
    calm:  { name: '깊은 숲속형', emoji: '🌲', tagline: '섬세한 통찰가 · 창의적 아이디어 뱅크',
             desc: '섬세한 감각이 통찰과 창의력으로 잘 쓰이는 상태예요.',
             care: ['혼자만의 충전 시간을 일정으로 지키기', '그림·글쓰기 같은 표현 활동'] },
    tense: { name: '예민한 레이더형', emoji: '📡', tagline: '감각 과부하 · 타인의 감정에 쉽게 소진',
             desc: '주변 자극과 다른 사람의 감정을 너무 많이 받아들여 쉽게 지치는 상태예요.',
             care: ['소음·화면 줄이는 디지털 디톡스 1시간', '사람 만난 뒤 회복 시간 따로 두기', '라벤더·따뜻한 차로 감각 진정'] },
  },
  flower: {
    calm:  { name: '따뜻한 태양형', emoji: '☀️', tagline: '에너지 넘치는 리더 · 빠른 추진력과 사교성',
             desc: '열정과 표현력이 주변을 밝히는 상태예요. 추진력이 잘 살아 있어요.',
             care: ['에너지를 쓸 곳을 2~3가지로 좁히기', '운동으로 에너지를 건강하게 발산'] },
    tense: { name: '타오르는 불꽃형', emoji: '🔥', tagline: '감정 기복 · 에너지 급방전과 충동적 스트레스',
             desc: '에너지를 한꺼번에 쓰고 급하게 방전되는 상태예요. 감정 기복과 충동적인 스트레스 반응이 잦아질 수 있어요.',
             care: ['결정하기 전 10분 기다리기', '규칙적인 식사·수면 시간 고정', '요가·필라테스로 호흡 고르기'] },
  },
}

// ── 자율신경환(ANW) 4대 형태 ──
// 정상은 동공 테두리에서 홍채 폭의 약 1/3 지점의 부드러운 원. LUDIA AI 자율신경환 감지(원장 선 기준)로 판별해요.
export type AnwForm = 'normal' | 'narrow' | 'lost' | 'wide' | 'irregular'
export interface AnwMeta { label: string; short: string; emoji: string; feature: string; mind: string; body: string; tension: number }
export const ANW_FORMS: Record<AnwForm, AnwMeta> = {
  normal:    { label: '정상형', short: '부드러운 원', emoji: '⭕', tension: 10,
    feature: '동공 테두리에서 홍채 폭의 약 1/3 지점에 부드러운 원으로 자리 잡고 있어요',
    mind: '긴장과 이완의 전환이 자연스러운 편이에요.',
    body: '자율신경의 브레이크와 엑셀이 고르게 작동하고 있어요.' },
  narrow:    { label: '협착형', short: '정상보다 좁음', emoji: '🔒', tension: 65,
    feature: '자율신경환이 동공 쪽으로 바짝 좁아져 있어요',
    mind: '방어적 통제형 — 변화를 두려워하고 스스로를 엄격한 틀과 규칙 안에 가두려 해요.',
    body: '교감신경 긴장으로 위장관 연동 운동이 떨어지기 쉬워요 (변비·가스, 소화 흡수력 감소).' },
  lost:      { label: '소실형', short: '거의 안 보임', emoji: '🌫️', tension: 55,
    feature: '경계선의 명암 대비가 사라져 매끄럽게 지워진 듯 보여요',
    mind: '감정 둔감·자제형 — 감정을 이성으로 누르거나 스트레스 신호 자체를 차단하고 버텨요.',
    body: '자율신경 전환 스위치가 둔해져 기초 대사가 떨어지고, 피로를 못 느끼다 한 번에 무너지는 번아웃이 올 수 있어요.' },
  wide:      { label: '확장형', short: '크게 넓어짐', emoji: '🎆', tension: 55,
    feature: '자율신경환이 홍채 바깥쪽으로 크게 밀려나 있어요',
    mind: '에너지 발산·산만형 — 호기심이 많고 자극에 즉각 반응하지만 집중이 쉽게 흩어져요.',
    body: '교감·부교감 모두 에너지를 많이 써서 위장관 팽만감, 혈당 기복, 만성 피로가 오기 쉬워요.' },
  irregular: { label: '불균형형', short: '찌그러짐·톱니', emoji: '〰️', tension: 70,
    feature: '특정 방향으로 뾰족하게 튀어나오거나 톱니처럼 들쭉날쭉하고 비대칭이에요',
    mind: '감정 기복·예민형 — 상황이나 자극에 따라 평온함과 예민함을 오가는 롤러코스터 성향이에요.',
    body: '튀어나온 방향과 연결된 장기 구역의 국소 긴장, 신경성 두통, 불규칙한 수면 패턴이 오기 쉬워요.' },
}

export interface AnwResult {
  form: AnwForm
  /** 엔진 측정 없이 동공 크기로 추정했는지 */
  estimated: boolean
  radiusPct?: number | null
  /** 가장 바깥으로 튀어나온 방향 (불균형형) */
  bulgeAt?: string | null
  label?: string | null
  /** 두 눈이 다르면 눈별 형태 */
  byEye?: { eye: string; form: AnwForm }[]
}

// ── 중간 단계(하이브리드형) 4대 타입 ──
// 섬유 밀도가 중간일 때, 밀집과 개방이 어떤 패턴으로 섞였는지 + 자율신경 안정/긴장으로 나눠요.
export type HybridId = 'harmony' | 'mask' | 'reverse' | 'overload'
export interface HybridMeta extends PsycheTypeMeta { pattern: string; feature: string; body: string }
export const HYBRID_TYPES: Record<HybridId, HybridMeta> = {
  harmony:  { name: '조화로운 조율가형', emoji: '🎻', pattern: '균일 혼합 + 안정',
    feature: '리넨형 바탕에 미세한 틈이 고르게 퍼져 있고 수축륜이 없어요',
    tagline: '빠른 상황 파악 · 건강한 양면성',
    desc: '상황 파악이 빠르고 유연해요. 공과 사를 잘 나누는 건강한 양면성이 있어요.',
    body: '큰 약점은 없지만 환경이 바뀌면 수면·식사 리듬이 쉽게 흐트러져요.',
    care: ['자는 시간·먹는 시간 고정하기', '여행·이사·야근 뒤엔 리듬 되찾는 하루 두기'] },
  mask:     { name: '외강내유 가면형', emoji: '🎭', pattern: '외곽 밀집 + 중심 개방 + 긴장',
    feature: '동공 주변(중심부)은 성글고 바깥쪽은 촘촘해요. 수축륜이 여러 개 보여요',
    tagline: '겉은 단단 · 속은 여림',
    desc: '겉으로는 차갑고 완벽해 보이지만, 속으로는 쉽게 상처받고 눈치를 보는 성향이에요.',
    body: '신경성 위장장애, 만성 어깨·목 결림, 퇴근 후 갑자기 찾아오는 무기력이 오기 쉬워요.',
    care: ['믿을 수 있는 한 사람에게 속마음 말하기', '퇴근 후 20분 따뜻한 샤워·스트레칭으로 "가면 벗기"', '위장이 편한 따뜻한 저녁'] },
  reverse:  { name: '외유내강 반전형', emoji: '🍑', pattern: '중심 밀집 + 외곽 개방 + 안정',
    feature: '동공 주변(중심부)은 단단히 뭉쳐 있고 바깥으로 갈수록 섬유가 벌어져요',
    tagline: '부드러운 겉 · 단단한 심지',
    desc: '평소엔 부드럽고 사교적이지만, 결정적인 순간엔 고집과 심지가 강해요.',
    body: '에너지를 많이 쓴 뒤 회복이 늦고, 손발이 찬 말초 순환 저하가 오기 쉬워요.',
    care: ['큰 일 뒤엔 회복일을 일정에 넣기', '반신욕·족욕으로 손발 데우기', '유산소 운동으로 말초 순환 돕기'] },
  overload: { name: '감각 전환 과부하형', emoji: '🔋', pattern: '부분 열공 + 자율신경 요동',
    feature: '전체 밀도는 보통인데 특정 구역(3·9시 등)에 열공이 몰려 있고 동공이 커져 있어요',
    tagline: '높은 호기심 + 공감 · 쉬운 방전',
    desc: '호기심과 공감 능력이 함께 높아 여러 일을 동시에 하다가 쉽게 방전돼요.',
    body: '교감·부교감 전환이 어려워 잠들기 힘들고, 혈당 스파이크와 부신 피로가 오기 쉬워요.',
    care: ['한 번에 한 가지 일만 하는 "싱글태스킹" 시간', '단 음식 대신 단백질 간식', '잠들기 1시간 전 화면 끄기'] },
}

export type PigmentZone = 'upper' | 'middle' | 'side'
export const PIGMENT_META: Record<PigmentZone, { label: string; emoji: string; desc: string }> = {
  upper:  { label: '상부 (뇌·신경 구역)', emoji: '💭', desc: '생각이 많고(과잉 사고) 밤에 잠이 얕아지며, 불안이 오래 남기 쉬운 유형이에요.' },
  middle: { label: '중부 (소화기·위장 구역)', emoji: '🫃', desc: '스트레스·분노·억울함을 바로 소화하지 못하고 신경성 위염 같은 몸 증상으로 겪기 쉬운 유형이에요.' },
  side:   { label: '측면 (간·담낭 구역)', emoji: '😤', desc: '계획대로 안 풀릴 때 답답함과 짜증이 속에 쌓이기 쉬운 추진형이에요.' },
}

export interface TensionPart { label: string; value: number; weight: number; note: string }

export interface PsycheResult {
  /** 홍채 엔진 결과를 썼는지 (없으면 EDA·HRV 만으로 긴장도만 계산) */
  hasIris: boolean
  temperament: Temperament | null
  /** 섬유 밀도 0(성김) ~ 100(촘촘) */
  density: number | null
  openings: number
  innerShare: number
  /** 긴장도 0(안정·균형) ~ 100(긴장·과부하) */
  tension: number
  state: PsycheState
  /** 안정·긴장 중 더 가까운 쪽 — 8가지 타입을 정할 때 써요 */
  lean: 'calm' | 'tense'
  type: PsycheTypeMeta | null
  /** 긴장 쪽일 때 돌아갈 본연의 안정 타입 */
  calmType: PsycheTypeMeta | null
  parts: TensionPart[]
  anw: AnwResult | null
  /** 긴장륜(스트레스 링)이 보이는지 */
  stressRing: boolean
  /** 중간 단계(하이브리드형) — 정해지면 type 도 이 타입이에요 */
  hybrid: HybridId | null
  pupilRatio: number | null
  pigments: { zone: PigmentZone; count: number }[]
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

const INNER_ZONE = ['위', '소화', '십이지', '대장', '소장', '결장', '맹장', '자율']
const UPPER_ZONE = ['뇌', '신경', '머리', '정신', '수면']
const SIDE_ZONE = ['간', '담']

function eyes(d: MultimodalData): IrisEyeDetection[] {
  const det = d.iris.detection
  return det ? [det.right, det.left].filter((x): x is IrisEyeDetection => !!x) : []
}

/** 병소가 동공 가까운 안쪽 띠에 있는지 — 좌표가 있으면 거리로, 없으면 구역 이름으로 */
function isInner(l: IrisLesion, e: IrisEyeDetection): boolean {
  const g = e.geometry
  if (g && l.points?.length) {
    const cx = l.points.reduce((s, p) => s + p[0], 0) / l.points.length
    const cy = l.points.reduce((s, p) => s + p[1], 0) / l.points.length
    const r = Math.hypot(cx - g.cx, cy - g.cy)
    return (r - g.pupilR) / Math.max(1, g.irisR - g.pupilR) < 0.35
  }
  const zone = l.zoneName ?? l.organs?.[0]?.name ?? ''
  return INNER_ZONE.some(k => zone.includes(k))
}

function pigmentZone(l: IrisLesion): PigmentZone | null {
  const zone = l.zoneName ?? l.organs?.[0]?.name ?? ''
  if (SIDE_ZONE.some(k => zone.includes(k))) return 'side'
  if (INNER_ZONE.some(k => zone.includes(k))) return 'middle'
  if (UPPER_ZONE.some(k => zone.includes(k))) return 'upper'
  const clock = l.position?.clock
  if (clock === 11 || clock === 12 || clock === 1) return 'upper'
  if (clock === 3 || clock === 9 || clock === 8 || clock === 4) return 'side'
  return null
}

export function analyzePsyche(d: MultimodalData): PsycheResult {
  const es = eyes(d)
  const hasIris = es.length > 0

  // ── 기질: 섬유 사이 틈(열공·움) 수와 위치 ──
  let openings = 0, inner = 0, lacunae = 0
  const pigmentCount: Record<PigmentZone, number> = { upper: 0, middle: 0, side: 0 }
  let ring = 0
  const ratios: number[] = []
  const clocks: number[] = []
  const anwEyes: { eye: string; a: NonNullable<IrisEyeDetection['anw']> }[] = []
  for (const e of es) {
    if (e.anw && e.anw.form !== 'unknown') anwEyes.push({ eye: e === d.iris.detection?.right ? '우안' : '좌안', a: e.anw })
    for (const l of e.lesions) {
      if (l.key === 'lac' || l.key === 'cry') {
        const w = Math.max(0.4, Math.min(1, l.confidence || 0.7))
        openings += w
        if (l.key === 'lac') lacunae += w
        if (isInner(l, e)) inner += w
        if (l.position?.clock) clocks.push(l.position.clock)
      }
      if (l.key === 'pig') {
        const z = pigmentZone(l)
        if (z) pigmentCount[z]++
      }
    }
    for (const f of e.globalFindings ?? []) {
      if (f.key === 'ner' || f.key === 'stress_ring') ring = Math.max(ring, f.score != null ? clamp(f.score <= 1 ? f.score * 100 : f.score) : 80)
    }
    if (e.geometry && e.geometry.irisR > 0) ratios.push(e.geometry.pupilR / e.geometry.irisR)
  }
  const perEye = hasIris ? openings / es.length : 0
  const innerShare = openings > 0 ? inner / openings : 0
  let temperament: Temperament | null = null
  let density: number | null = null
  if (hasIris) {
    density = Math.round(clamp(100 - perEye * 14))
    temperament = perEye < 1 ? 'silk'
      : perEye < 3 ? 'linen'
      : innerShare >= 0.5 && lacunae / es.length >= 1.5 ? 'flower'
      : 'hessian'
  }
  const pupilRatio = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null

  // ── 자율신경환 형태 — 엔진 측정 우선, 없으면 동공 크기로 추정 ──
  let anw: AnwResult | null = null
  const RANK: AnwForm[] = ['irregular', 'lost', 'narrow', 'wide', 'normal']
  if (anwEyes.length) {
    const top = [...anwEyes].sort((x, y) => RANK.indexOf(x.a.form as AnwForm) - RANK.indexOf(y.a.form as AnwForm))[0]
    anw = {
      form: top.a.form as AnwForm, estimated: false, radiusPct: top.a.radiusPct ?? null,
      bulgeAt: top.a.form === 'irregular' ? top.a.farthest?.at ?? null : null, label: top.a.label ?? null,
      byEye: anwEyes.length > 1 && anwEyes[0].a.form !== anwEyes[1].a.form ? anwEyes.map(x => ({ eye: x.eye, form: x.a.form as AnwForm })) : undefined,
    }
  } else if (hasIris && pupilRatio !== null && (pupilRatio < 0.3 || pupilRatio > 0.42)) {
    anw = { form: pupilRatio < 0.3 ? 'narrow' : 'wide', estimated: true }
  }

  // ── 지금 긴장도 ──
  const parts: TensionPart[] = []
  if (hasIris) {
    parts.push({ label: '긴장륜(스트레스 링)', value: ring, weight: 0.25,
      note: ring > 0 ? '홍채에 동심원 모양 긴장 주름이 보여요' : '뚜렷한 긴장 주름이 없어요' })
    if (pupilRatio !== null) {
      // 보통 0.30~0.42 — 너무 작거나 크면 자율신경이 한쪽으로 쏠린 신호
      const dev = pupilRatio < 0.3 ? (0.3 - pupilRatio) / 0.12 : pupilRatio > 0.42 ? (pupilRatio - 0.42) / 0.12 : 0
      parts.push({ label: '동공 크기', value: Math.round(clamp(dev * 100)), weight: 0.1,
        note: `동공이 홍채의 ${Math.round(pupilRatio * 100)}% — ${pupilRatio < 0.3 ? '작은 편(수축)' : pupilRatio > 0.42 ? '큰 편(산동)' : '보통'}` })
    }
    if (anw && !anw.estimated) {
      parts.push({ label: '자율신경환 형태', value: ANW_FORMS[anw.form].tension, weight: 0.15,
        note: anw.form === 'lost'
          ? '자율신경환이 거의 안 보여요 — 피로 신호를 스스로 꺼둔 상태일 수 있어 실제 피로가 숫자보다 클 수 있어요'
          : `${ANW_FORMS[anw.form].label} (${ANW_FORMS[anw.form].short})${anw.radiusPct != null ? ` · 동공에서 홍채 폭의 ${anw.radiusPct}%` : ''}` })
    }
  }
  parts.push({ label: 'EDA 스트레스', value: clamp(d.eda.stressIndex), weight: 0.25, note: `피부 전도 스트레스 지수 ${d.eda.stressIndex}` })
  parts.push({ label: '근육·신경 긴장', value: clamp(d.eda.tensionLevel), weight: 0.1, note: `긴장도 ${d.eda.tensionLevel}` })
  parts.push({ label: '교감신경 쏠림', value: Math.round(clamp((60 - d.eda.ansBalance) * 2.5)), weight: 0.1,
    note: `자율신경 균형 ${d.eda.ansBalance} (50 이상이면 부교감이 충분해요)` })
  parts.push({ label: 'HRV(회복력)', value: Math.round(clamp((60 - d.biosignal.hrv) * 2.5)), weight: 0.2,
    note: `심박변이 ${d.biosignal.hrv}ms — 높을수록 잘 회복돼요` })
  const wsum = parts.reduce((s, p) => s + p.weight, 0)
  const tension = Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / wsum)
  const state: PsycheState = tension < 40 ? 'calm' : tension > 60 ? 'tense' : 'border'
  const lean = tension >= 50 ? 'tense' : 'calm'

  // ── 중간 단계(하이브리드형) — 섬유 밀도가 중간(눈당 틈 1~4개)일 때 섞인 패턴으로 ──
  let hybrid: HybridId | null = null
  if (hasIris && perEye >= 1 && perEye <= 4) {
    // 틈이 한 방향(±1시간)에 얼마나 몰렸는지
    const conc = clocks.length >= 2
      ? Math.max(...clocks.map(c => clocks.filter(x => Math.min(Math.abs(x - c), 12 - Math.abs(x - c)) <= 1).length)) / clocks.length
      : 0
    if (conc >= 0.6 && clocks.length >= 2 && ((pupilRatio ?? 0) > 0.42 || tension >= 55)) hybrid = 'overload'
    else if (innerShare >= 0.6 && lean === 'tense') hybrid = 'mask'
    else if (innerShare <= 0.25 && lean === 'calm') hybrid = 'reverse'
    else if (conc < 0.5 && lean === 'calm' && ring < 40) hybrid = 'harmony'
  }

  const pigments = (Object.keys(pigmentCount) as PigmentZone[])
    .filter(z => pigmentCount[z] > 0)
    .map(z => ({ zone: z, count: pigmentCount[z] }))
    .sort((a, b) => b.count - a.count)

  return {
    hasIris, temperament, density, openings: Math.round(openings * 10) / 10, innerShare,
    tension, state, lean,
    type: hybrid ? HYBRID_TYPES[hybrid] : temperament ? PSYCHE_TYPES[temperament][lean] : null,
    calmType: !hybrid && temperament && lean === 'tense' ? PSYCHE_TYPES[temperament].calm : null,
    parts, anw, stressRing: ring >= 40, hybrid, pupilRatio, pigments,
  }
}

export const STATE_META: Record<PsycheState, { label: string; color: string; bg: string }> = {
  calm:   { label: '안정·균형 상태',  color: '#0d9488', bg: '#f0fdfa' },
  border: { label: '중간 (경계)',      color: '#d97706', bg: '#fffbeb' },
  tense:  { label: '긴장·과부하 상태', color: '#e11d48', bg: '#fff1f2' },
}

/** "안정에 가까워요" 같은 한 줄 */
export function tensionLine(t: number): string {
  if (t < 25) return '안정·균형 쪽에 많이 가까워요'
  if (t < 40) return '안정·균형 쪽에 가까운 편이에요'
  if (t <= 60) return t < 50 ? '가운데쯤이지만 살짝 안정 쪽이에요' : '가운데쯤이지만 살짝 긴장 쪽이에요'
  if (t <= 75) return '긴장·과부하 쪽에 가까운 편이에요'
  return '긴장·과부하 쪽에 많이 가까워요'
}

// ── BMI (대한비만학회 아시아 기준) ──────────────────────────────────────────

export const BMI_BANDS = [
  { max: 18.5, label: '저체중', color: '#60a5fa' },
  { max: 23,   label: '정상',   color: '#10b981' },
  { max: 25,   label: '과체중', color: '#f59e0b' },
  { max: 30,   label: '비만',   color: '#f97316' },
  { max: 99,   label: '고도비만', color: '#ef4444' },
] as const

export function bmiBand(bmi: number) {
  return BMI_BANDS.find(b => bmi < b.max) ?? BMI_BANDS[BMI_BANDS.length - 1]
}
