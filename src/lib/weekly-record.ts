// ── 주간 기록 — 운동·식단·생리주기·진단·피드를 일주일(월~일)마다 한 장으로 ─────────────
//
// 앱을 열 때 지난주 기록이 아직 없으면 자동으로 만들어 저장해요(이 기기 localStorage).
// 프로필에서 모아 보고, 원하면 '후기 자랑'으로 골라 공개할 수 있어요.

import type { Workout } from '@/lib/workout-log'
import { WORKOUTS_KEY, WEEKLY_GOAL_MIN } from '@/lib/workout-log'
import { CATEGORY_META, type MeetupCategory } from '@/data/meetupData'
import type { DailyLogFormData, MoodType } from '@/types/health'
import { MOOD_LABELS } from '@/types/health'
import { analyzePsyche } from '@/lib/iris-psyche'
import type { DiagnosticSession } from '@/lib/diagnosticHistory'
import type { ReviewChange, ReviewDraft } from '@/components/feed/LudiaFeed'

export const WEEKLY_KEY = 'ludia_weekly_records_v1'
const MAX_WEEKS_BACK = 12

export interface WeeklyRecord {
  /** 그 주 월요일 (YYYY-MM-DD) */
  id: string
  start: string
  end: string
  createdAt: string
  /** 자동 저장인지, 내가 '지금 저장'을 눌렀는지 */
  auto: boolean
  workout: { count: number; minutes: number; kcal: number; goalPct: number; sports: { sport: MeetupCategory; label: string; emoji: string; count: number; minutes: number }[] }
  diet: { days: number; meals: number; avgKcal: number | null; avgProtein: number | null; foods: string[] }
  cycle: { periodDays: number; avgPain: number | null; moods: string[]; avgSleep: number | null; weight: number | null; logDays: number }
  diag: { count: number; latest: null | { date: string; typeName: string | null; tension: number; hrv: number; stress: number; bmi: number; weight: number } }
  posts: number
  /** 후기 자랑으로 공개한 시각 */
  sharedAt?: string
}

// ── 날짜 ──
const pad = (n: number) => String(n).padStart(2, '0')
export function dayKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
/** 그 날이 속한 주의 월요일 0시 */
export function weekStart(d: Date): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export function weekLabel(r: Pick<WeeklyRecord, 'start' | 'end'>): string {
  const s = new Date(r.start + 'T00:00:00'), e = new Date(r.end + 'T00:00:00')
  const nth = Math.floor((s.getDate() - 1) / 7) + 1
  return `${s.getMonth() + 1}월 ${nth}주차 (${s.getMonth() + 1}/${s.getDate()}~${e.getMonth() + 1}/${e.getDate()})`
}

function read<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : fallback } catch { return fallback }
}

type MealLogs = Record<string, Partial<Record<string, { totalCalories?: number; protein?: number; foods?: { name: string }[] }>>>
type SnsPostLite = { authorId: string; createdAt: string }

/** 한 주 기록 만들기 (start = 월요일) */
export function buildWeek(start: Date, opts: { myAuthorIds?: string[]; auto?: boolean } = {}): WeeklyRecord {
  const s = weekStart(start)
  const e = addDays(s, 6)
  const from = dayKey(s), to = dayKey(e)
  const inWeek = (iso: string) => { const k = iso.slice(0, 10); return k >= from && k <= to }
  const dayInWeek = (k: string) => k >= from && k <= to

  // 운동
  const workouts = read<Workout[]>(WORKOUTS_KEY, []).filter(w => inWeek(w.startAt))
  const bySport = new Map<MeetupCategory, { count: number; minutes: number }>()
  for (const w of workouts) {
    const v = bySport.get(w.sport) ?? { count: 0, minutes: 0 }
    v.count++; v.minutes += w.durationMin || 0
    bySport.set(w.sport, v)
  }
  const minutes = workouts.reduce((a, w) => a + (w.durationMin || 0), 0)

  // 식단
  const meals = read<MealLogs>('ludia_meal_logs_v1', {})
  let mealCount = 0, kcal = 0, protein = 0, proteinN = 0
  const foodCount = new Map<string, number>()
  const dietDays = Object.keys(meals).filter(dayInWeek)
  for (const k of dietDays) {
    let dayKcal = 0
    for (const m of Object.values(meals[k] ?? {})) {
      if (!m) continue
      mealCount++
      dayKcal += m.totalCalories ?? 0
      if (m.protein != null) { protein += m.protein; proteinN++ }
      for (const f of m.foods ?? []) foodCount.set(f.name, (foodCount.get(f.name) ?? 0) + 1)
    }
    kcal += dayKcal
  }

  // 생리주기 · 기분 · 수면 · 체중
  const daily = read<Record<string, DailyLogFormData>>('ludia_daily_logs_v1', {})
  const days = Object.keys(daily).filter(dayInWeek).sort().map(k => daily[k])
  const pains = days.map(d => d.painIntensity).filter((x): x is number => typeof x === 'number' && x > 0)
  const sleeps = days.map(d => d.sleepHours).filter((x): x is number => typeof x === 'number' && x > 0)
  const moodCount = new Map<MoodType, number>()
  for (const d of days) if (d.mood) moodCount.set(d.mood, (moodCount.get(d.mood) ?? 0) + 1)
  const weight = [...days].reverse().find(d => typeof d.weight === 'number' && d.weight! > 0)?.weight ?? null

  // 진단
  const sessions = read<DiagnosticSession[]>('ludia_diagnostic_history_v1', []).filter(x => !x.demo && inWeek(x.createdAt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const latest = sessions[0]
  const p = latest ? analyzePsyche(latest.data) : null

  // 내가 쓴 피드
  const ids = new Set(opts.myAuthorIds ?? [])
  const posts = ids.size ? read<SnsPostLite[]>('ludia_sns_v5', []).filter(x => ids.has(x.authorId) && inWeek(x.createdAt)).length : 0

  const round1 = (v: number) => Math.round(v * 10) / 10
  return {
    id: from, start: from, end: to, createdAt: new Date().toISOString(), auto: opts.auto ?? true,
    workout: {
      count: workouts.length, minutes, kcal: workouts.reduce((a, w) => a + (w.calories ?? 0), 0),
      goalPct: Math.min(100, Math.round(minutes / WEEKLY_GOAL_MIN * 100)),
      sports: Array.from(bySport.entries()).sort((a, b) => b[1].minutes - a[1].minutes)
        .map(([sport, v]) => ({ sport, label: CATEGORY_META[sport]?.label ?? sport, emoji: CATEGORY_META[sport]?.emoji ?? '🏃', ...v })),
    },
    diet: {
      days: dietDays.length, meals: mealCount,
      avgKcal: dietDays.length ? Math.round(kcal / dietDays.length) : null,
      avgProtein: proteinN ? Math.round(protein / proteinN) : null,
      foods: Array.from(foodCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n),
    },
    cycle: {
      periodDays: days.filter(d => d.isPeriod).length,
      avgPain: pains.length ? round1(pains.reduce((a, b) => a + b, 0) / pains.length) : null,
      moods: Array.from(moodCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([m]) => MOOD_LABELS[m]),
      avgSleep: sleeps.length ? round1(sleeps.reduce((a, b) => a + b, 0) / sleeps.length) : null,
      weight, logDays: days.length,
    },
    diag: {
      count: sessions.length,
      latest: latest && p ? {
        date: latest.createdAt, typeName: p.type?.name ?? null, tension: p.tension,
        hrv: latest.data.biosignal.hrv, stress: latest.data.eda.stressIndex, bmi: latest.data.biosignal.bmi, weight: latest.data.biosignal.weight,
      } : null,
    },
    posts,
  }
}

export function isEmptyWeek(r: WeeklyRecord) {
  return !r.workout.count && !r.diet.meals && !r.cycle.logDays && !r.diag.count && !r.posts
}

export function loadWeekly(): WeeklyRecord[] {
  const v = read<WeeklyRecord[]>(WEEKLY_KEY, [])
  return Array.isArray(v) ? v.sort((a, b) => b.id.localeCompare(a.id)) : []
}
export function saveWeekly(list: WeeklyRecord[]) {
  try { localStorage.setItem(WEEKLY_KEY, JSON.stringify(list)); return true } catch { return false }
}

/** 지난 주들 중 아직 저장 안 된(그리고 기록이 있는) 주를 자동 저장 — 새로 저장한 개수 */
export function ensureWeeklySnapshots(myAuthorIds: string[] = []): number {
  if (typeof window === 'undefined') return 0
  const list = loadWeekly()
  const have = new Set(list.map(r => r.id))
  const thisWeek = weekStart(new Date())
  let added = 0
  for (let i = 1; i <= MAX_WEEKS_BACK; i++) {
    const s = addDays(thisWeek, -7 * i)
    if (have.has(dayKey(s))) continue
    const r = buildWeek(s, { myAuthorIds, auto: true })
    if (isEmptyWeek(r)) continue
    list.push(r); added++
  }
  if (added) saveWeekly(list)
  return added
}

/** 이번 주(진행 중)를 지금 저장 — 같은 주가 있으면 덮어써요 */
export function saveThisWeekNow(myAuthorIds: string[] = []): WeeklyRecord {
  const r = buildWeek(new Date(), { myAuthorIds, auto: false })
  const list = loadWeekly().filter(x => x.id !== r.id)
  saveWeekly([r, ...list])
  return r
}

export function markShared(id: string) {
  const list = loadWeekly().map(r => r.id === id ? { ...r, sharedAt: new Date().toISOString() } : r)
  saveWeekly(list)
}

// ── 후기 자랑 초안 ──

/** 주간 기록 → 후기 자랑 초안 (지난 기록과 비교해 좋아진 수치는 변화로) */
export function weeklyDraft(r: WeeklyRecord, prev: WeeklyRecord | undefined, careTypes: string[]): ReviewDraft {
  const lines: string[] = []
  if (r.workout.count) lines.push(`🏃 운동 ${r.workout.count}회 · ${r.workout.minutes}분${r.workout.sports.length ? ` (${r.workout.sports.slice(0, 3).map(s => s.label).join('·')})` : ''}`)
  if (r.diet.meals) lines.push(`🥗 식단 ${r.diet.days}일 기록${r.diet.avgKcal ? ` · 하루 평균 ${r.diet.avgKcal.toLocaleString()}kcal` : ''}`)
  if (r.cycle.logDays) lines.push(`🌸 몸 기록 ${r.cycle.logDays}일${r.cycle.periodDays ? ` · 생리 ${r.cycle.periodDays}일` : ''}${r.cycle.avgSleep ? ` · 수면 평균 ${r.cycle.avgSleep}시간` : ''}`)
  if (r.diag.latest?.typeName) lines.push(`👁️ 홍채 타입 ${r.diag.latest.typeName} · 긴장도 ${r.diag.latest.tension}`)

  const changes: ReviewChange[] = []
  const a = prev?.diag.latest, b = r.diag.latest
  if (a && b) {
    const push = (label: string, from: number, to: number, unit: string, higherBetter: boolean, min: number) => {
      if (!from || !to || Math.abs(to - from) < min) return
      if ((to > from) === higherBetter) changes.push({ label, from, to, unit, good: true })
    }
    push('심박변이(HRV)', a.hrv, b.hrv, 'ms', true, 1)
    push('스트레스', a.stress, b.stress, '/100', false, 1)
    push('긴장도', a.tension, b.tension, '/100', false, 1)
    push('체중', a.weight, b.weight, 'kg', false, 0.3)
  }
  if (prev && prev.workout.minutes && r.workout.minutes > prev.workout.minutes) {
    changes.push({ label: '주간 운동', from: prev.workout.minutes, to: r.workout.minutes, unit: '분', good: true })
  }

  return {
    content: `${weekLabel(r).split(' (')[0]} 루디아 기록이에요 📒\n${lines.join('\n')}\n\n`,
    review: {
      period: weekLabel(r),
      changes,
      exercise: r.workout.sports.length ? r.workout.sports.map(s => `${s.label} ${s.count}회 ${s.minutes}분`).join(', ') : undefined,
      diet: r.diet.meals ? `${r.diet.days}일 기록${r.diet.avgKcal ? `, 하루 평균 ${r.diet.avgKcal}kcal` : ''}${r.diet.avgProtein ? `, 단백질 평균 ${r.diet.avgProtein}g` : ''}${r.diet.foods.length ? ` · 자주 먹은 것: ${r.diet.foods.slice(0, 3).join(', ')}` : ''}` : undefined,
      routine: [r.cycle.avgSleep ? `수면 평균 ${r.cycle.avgSleep}시간` : '', r.cycle.moods.length ? `기분 ${r.cycle.moods.join('·')}` : ''].filter(Boolean).join(' · ') || undefined,
    },
    tags: careTypes,
  }
}
