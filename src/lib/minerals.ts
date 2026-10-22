// ── 미네랄 ──────────────────────────────────────────────────────────────────
// 루디아피드 사진 분석과 루디아 호출 식단 분석이 함께 쓰는 미네랄 정의예요.

/** 미네랄 (모두 mg) */
export interface Minerals {
  calcium: number    // 칼슘
  iron: number       // 철분
  magnesium: number  // 마그네슘
  potassium: number  // 칼륨
  zinc: number       // 아연
}

export const MINERAL_KEYS: (keyof Minerals)[] = ['calcium', 'iron', 'magnesium', 'potassium', 'zinc']

/** 하루 권장량 — 2020 한국인 영양소 섭취기준, 19~49세 여성 권장(칼륨은 충분)섭취량 */
export const MINERAL_DAILY: Minerals = { calcium: 700, iron: 14, magnesium: 280, potassium: 3500, zinc: 8 }

export const MINERAL_META: Record<keyof Minerals, { label: string; color: string; why: string }> = {
  calcium:   { label: '칼슘',    color: '#64748b', why: '뼈 건강·골다공증 예방' },
  iron:      { label: '철분',    color: '#dc2626', why: '생리로 잃는 철 보충' },
  magnesium: { label: '마그네슘', color: '#16a34a', why: '생리통·PMS·수면' },
  potassium: { label: '칼륨',    color: '#ea580c', why: '나트륨 배출·부기' },
  zinc:      { label: '아연',    color: '#7c3aed', why: '면역·피부·호르몬' },
}

export function emptyMinerals(): Minerals {
  return { calcium: 0, iron: 0, magnesium: 0, potassium: 0, zinc: 0 }
}

export function addMinerals(a: Minerals, b: Minerals, scale = 1): Minerals {
  const out = { ...a }
  for (const k of MINERAL_KEYS) out[k] += b[k] * scale
  return out
}

/** [칼슘, 철분, 마그네슘, 칼륨, 아연] 배열로 적은 값을 바꿔요 */
export function mineralsFrom(t: readonly [number, number, number, number, number]): Minerals {
  return { calcium: t[0], iron: t[1], magnesium: t[2], potassium: t[3], zinc: t[4] }
}

/** AI 응답의 minerals 객체를 읽어요 — 없거나 이상하면 undefined */
export function parseMinerals(v: unknown): Minerals | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  const n = (x: unknown) => (typeof x === 'number' && isFinite(x) ? Math.max(0, x) : 0)
  return { calcium: n(o.calcium), iron: n(o.iron), magnesium: n(o.magnesium), potassium: n(o.potassium), zinc: n(o.zinc) }
}

/** 소수점이 의미 있는 작은 값(철분·아연)은 한 자리까지 */
export function fmtMg(v: number): string {
  return v < 10 ? (Math.round(v * 10) / 10).toString() : Math.round(v).toLocaleString()
}

/** AI 프롬프트에 넣는 JSON 형식 설명 */
export const MINERALS_PROMPT_SHAPE = `{
      "calcium": 숫자(mg, 칼슘),
      "iron": 숫자(mg, 철분),
      "magnesium": 숫자(mg, 마그네슘),
      "potassium": 숫자(mg, 칼륨),
      "zinc": 숫자(mg, 아연)
    }`
