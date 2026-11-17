// ── 홍채로 보는 나의 심리 상태 ──────────────────────────────────────────────
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

export type AnwType = 'nerve' | 'suppress' | 'diffuse' | 'balanced'
export const ANW_META: Record<AnwType, { label: string; emoji: string; desc: string }> = {
  nerve:    { label: '신경 긴장형', emoji: '⚡', desc: '긴장륜(스트레스 링)이 보여요. 교감신경이 오래 항진돼 스스로를 채찍질하거나 주변 평가에 예민해 긴장을 놓기 어려운 상태예요.' },
  suppress: { label: '내면 억압형', emoji: '🛡️', desc: '동공이 작은 편이에요. 외부 자극에서 나를 지키려 방어벽을 치고, 욕구를 누르며 규칙·루틴에 기대는 경향이 있어요.' },
  diffuse:  { label: '에너지 확산형', emoji: '🎆', desc: '동공이 큰 편이에요. 호기심이 많고 바깥으로 에너지를 쓰지만, 집중이 흩어지고 여러 일을 벌이다 쉽게 지칠 수 있어요.' },
  balanced: { label: '균형형', emoji: '⚖️', desc: '긴장륜이 뚜렷하지 않고 동공 크기도 보통이에요. 자율신경 반응이 비교적 고른 편이에요.' },
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
  anw: AnwType | null
  pupilRatio: number | null
  pigments: { zone: PigmentZone; count: number }[]
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

const INNER_ZONE = ['위', '장', '소화', '십이지', '대장', '소장', '자율']
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
  for (const e of es) {
    for (const l of e.lesions) {
      if (l.key === 'lac' || l.key === 'cry') {
        const w = Math.max(0.4, Math.min(1, l.confidence || 0.7))
        openings += w
        if (l.key === 'lac') lacunae += w
        if (isInner(l, e)) inner += w
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

  // ── 자율신경환 반응 타입 ──
  let anw: AnwType | null = null
  if (hasIris) {
    anw = ring >= 40 ? 'nerve'
      : pupilRatio !== null && pupilRatio < 0.3 ? 'suppress'
      : pupilRatio !== null && pupilRatio > 0.42 ? 'diffuse'
      : 'balanced'
  }

  const pigments = (Object.keys(pigmentCount) as PigmentZone[])
    .filter(z => pigmentCount[z] > 0)
    .map(z => ({ zone: z, count: pigmentCount[z] }))
    .sort((a, b) => b.count - a.count)

  return {
    hasIris, temperament, density, openings: Math.round(openings * 10) / 10, innerShare,
    tension, state, lean,
    type: temperament ? PSYCHE_TYPES[temperament][lean] : null,
    calmType: temperament && lean === 'tense' ? PSYCHE_TYPES[temperament].calm : null,
    parts, anw, pupilRatio, pigments,
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
