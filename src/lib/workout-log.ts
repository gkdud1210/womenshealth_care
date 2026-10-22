import type { MeetupCategory } from '@/data/meetupData'

// ── 운동 기록 ────────────────────────────────────────────────────────────────
// 직접 입력하거나 iPhone 건강 앱(애플워치) 내보내기 파일에서 가져온 운동 기록이에요.
// 지금은 기기(localStorage)에 저장되고, 공유는 내가 참여한 모임의 활동 게시글로 올려요.

export const WORKOUTS_KEY = 'ludia_workouts_v1'

/** 이번 주 목표 — WHO 권장 중강도 유산소 주 150분 */
export const WEEKLY_GOAL_MIN = 150

export type WorkoutSource = 'manual' | 'apple_health'
export type WorkoutIntensity = 'easy' | 'moderate' | 'hard'

export interface Workout {
  id: string
  sport: MeetupCategory
  /** 시작 시각 (ISO) */
  startAt: string
  durationMin: number
  distanceKm?: number
  calories?: number
  intensity?: WorkoutIntensity
  /** 다녀온 시설 (시설 찾기의 id) */
  facilityId?: string
  memo?: string
  source: WorkoutSource
  /** 가져온 기록의 중복 확인용 키 */
  sourceKey?: string
  /** 공유한 모임 id */
  sharedGroupIds?: string[]
  createdAt: string
}

/** 운동 기록에서 고를 수 있는 종목 (모임 종목 중 운동만) */
export const WORKOUT_SPORTS: MeetupCategory[] = [
  'walking', 'running', 'swimming', 'cycling', 'hiking', 'gym', 'yoga', 'pilates',
  'badminton', 'tennis', 'table_tennis', 'volleyball', 'golf', 'climbing', 'dance', 'bowling', 'etc',
]

export const INTENSITY_LABEL: Record<WorkoutIntensity, string> = {
  easy: '가볍게', moderate: '적당히', hard: '힘들게',
}

export function loadWorkouts(): Workout[] {
  if (typeof window === 'undefined') return []
  try {
    const s = localStorage.getItem(WORKOUTS_KEY)
    const parsed = s ? JSON.parse(s) : []
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export function saveWorkouts(list: Workout[]): boolean {
  try { localStorage.setItem(WORKOUTS_KEY, JSON.stringify(list)); return true } catch { return false }
}

export function sortWorkouts(list: Workout[]): Workout[] {
  return [...list].sort((a, b) => b.startAt.localeCompare(a.startAt))
}

/** 이미 있는 기록(같은 sourceKey)은 빼고 더해요 — 같은 파일을 두 번 가져와도 중복되지 않게 */
export function mergeImported(list: Workout[], imported: Workout[]): { list: Workout[]; added: number } {
  const keys = new Set(list.map(w => w.sourceKey).filter(Boolean))
  const fresh = imported.filter(w => w.sourceKey && !keys.has(w.sourceKey))
  return { list: sortWorkouts([...list, ...fresh]), added: fresh.length }
}

// ── 집계 ────────────────────────────────────────────────────────────────────

/** 이번 주 월요일 0시 */
export function startOfWeek(d = new Date()): Date {
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
  return s
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface WorkoutTotals { count: number; minutes: number; calories: number; distanceKm: number }

export function totals(list: Workout[]): WorkoutTotals {
  return list.reduce((t, w) => ({
    count: t.count + 1,
    minutes: t.minutes + w.durationMin,
    calories: t.calories + (w.calories ?? 0),
    distanceKm: t.distanceKm + (w.distanceKm ?? 0),
  }), { count: 0, minutes: 0, calories: 0, distanceKm: 0 })
}

export function inRange(list: Workout[], from: Date, to: Date): Workout[] {
  const a = from.getTime(), b = to.getTime()
  return list.filter(w => { const t = new Date(w.startAt).getTime(); return t >= a && t < b })
}

/** 종목별 운동 시간 — 많은 순 */
export function minutesBySport(list: Workout[]): { sport: MeetupCategory; minutes: number; count: number }[] {
  const m = new Map<MeetupCategory, { minutes: number; count: number }>()
  for (const w of list) {
    const v = m.get(w.sport) ?? { minutes: 0, count: 0 }
    m.set(w.sport, { minutes: v.minutes + w.durationMin, count: v.count + 1 })
  }
  return Array.from(m, ([sport, v]) => ({ sport, ...v })).sort((a, b) => b.minutes - a.minutes)
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  if (h === 0) return `${m}분`
  return m ? `${h}시간 ${m}분` : `${h}시간`
}

/** 모임에 올릴 공유 글 */
export function shareText(w: Workout, sportLabel: string, sportEmoji: string, facilityName?: string): string {
  const parts = [formatDuration(w.durationMin)]
  if (w.distanceKm) parts.push(`${w.distanceKm.toFixed(w.distanceKm < 10 ? 2 : 1)}km`)
  if (w.calories) parts.push(`${Math.round(w.calories)}kcal`)
  const d = new Date(w.startAt)
  const when = `${d.getMonth() + 1}/${d.getDate()}`
  const lines = [`${sportEmoji} ${when} ${sportLabel} ${parts.join(' · ')}${facilityName ? ` @${facilityName}` : ''}`]
  if (w.memo) lines.push(w.memo)
  return lines.join('\n')
}

// ── iPhone 건강 앱 내보내기 가져오기 ────────────────────────────────────────
//
// 건강 앱 → 프로필 → "모든 건강 데이터 내보내기" 로 만든 내보내기.zip(또는 압축을 푼 export.xml)을 읽어요.
// 파일이 수백 MB가 될 수 있어서 통째로 읽지 않고 조금씩 풀면서 <Workout> 만 골라내요.

const HK_SPORT: Record<string, MeetupCategory> = {
  Walking: 'walking', Running: 'running', Swimming: 'swimming', Cycling: 'cycling', HandCycling: 'cycling',
  Hiking: 'hiking', Yoga: 'yoga', Pilates: 'pilates', MindAndBody: 'yoga', Flexibility: 'yoga',
  Badminton: 'badminton', Tennis: 'tennis', TableTennis: 'table_tennis', Volleyball: 'volleyball',
  Golf: 'golf', Climbing: 'climbing', Bowling: 'bowling',
  Dance: 'dance', SocialDance: 'dance', CardioDance: 'dance', Barre: 'dance',
  TraditionalStrengthTraining: 'gym', FunctionalStrengthTraining: 'gym', HighIntensityIntervalTraining: 'gym',
  CrossTraining: 'gym', Elliptical: 'gym', StairClimbing: 'gym', Stairs: 'gym', Rowing: 'gym',
  CoreTraining: 'gym', MixedCardio: 'gym', JumpRope: 'gym', Kickboxing: 'gym', Boxing: 'gym',
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`))
  return m ? m[1] : undefined
}

/** "2024-05-01 07:10:00 +0900" → ISO */
function hkDate(s: string | undefined): string | undefined {
  if (!s) return undefined
  const m = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/)
  const d = m ? new Date(`${m[1]}T${m[2]}${m[3]}${m[4]}:${m[5]}`) : new Date(s)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

function toKm(value: number, unit: string | undefined): number {
  if (unit === 'mi') return value * 1.609344
  if (unit === 'm') return value / 1000
  if (unit === 'yd') return value * 0.0009144
  return value
}

function toKcal(value: number, unit: string | undefined): number {
  return unit === 'kJ' ? value / 4.184 : value
}

/** <Workout ...> ... </Workout> 블록 하나를 기록으로 바꿔요 */
export function parseWorkoutBlock(block: string): Workout | null {
  const open = block.match(/^<Workout\b[^>]*>/)?.[0] ?? block
  const type = attr(open, 'workoutActivityType')?.replace('HKWorkoutActivityType', '')
  const startAt = hkDate(attr(open, 'startDate'))
  if (!type || !startAt) return null

  let durationMin = Number(attr(open, 'duration') ?? 0)
  const durUnit = attr(open, 'durationUnit')
  if (durUnit === 'sec' || durUnit === 's') durationMin /= 60
  else if (durUnit === 'hr' || durUnit === 'h') durationMin *= 60
  if (!durationMin) {
    const end = hkDate(attr(open, 'endDate'))
    if (end) durationMin = (new Date(end).getTime() - new Date(startAt).getTime()) / 60000
  }
  if (!(durationMin > 0)) return null

  // 예전 형식은 Workout 에 바로, 최근 형식은 WorkoutStatistics 안에 거리·칼로리가 있어요
  let distanceKm: number | undefined
  let calories: number | undefined
  const dist = attr(open, 'totalDistance')
  if (dist) distanceKm = toKm(Number(dist), attr(open, 'totalDistanceUnit'))
  const energy = attr(open, 'totalEnergyBurned')
  if (energy) calories = toKcal(Number(energy), attr(open, 'totalEnergyBurnedUnit'))
  for (const stat of block.match(/<WorkoutStatistics\b[^>]*>/g) ?? []) {
    const t = attr(stat, 'type') ?? ''
    const sum = Number(attr(stat, 'sum'))
    if (!sum) continue
    if (t.endsWith('ActiveEnergyBurned') && calories === undefined) calories = toKcal(sum, attr(stat, 'unit'))
    else if (t.startsWith('HKQuantityTypeIdentifierDistance') && distanceKm === undefined) distanceKm = toKm(sum, attr(stat, 'unit'))
  }

  return {
    id: `wk_${Date.parse(startAt).toString(36)}_${type}`,
    sport: HK_SPORT[type] ?? 'etc',
    startAt,
    durationMin: Math.round(durationMin),
    distanceKm: distanceKm ? Math.round(distanceKm * 100) / 100 : undefined,
    calories: calories ? Math.round(calories) : undefined,
    source: 'apple_health',
    sourceKey: `apple:${type}:${startAt}`,
    createdAt: new Date().toISOString(),
  }
}

/** 글자 조각을 받으면서 <Workout> 블록을 찾아요 (블록이 조각 경계에 걸쳐도 이어 붙여요) */
async function scanWorkouts(text: ReadableStream<string>, onProgress?: (found: number) => void): Promise<Workout[]> {
  const found: Workout[] = []
  let buf = ''
  const reader = text.getReader()
  for (;;) {
    const { value, done } = await reader.read()
    if (value) buf += value
    for (;;) {
      const start = buf.indexOf('<Workout ')
      if (start < 0) { buf = buf.slice(-16); break }    // 태그 앞부분이 잘려 있을 수 있어 조금 남겨요
      const selfClose = buf.indexOf('/>', start)
      const tagEnd = buf.indexOf('>', start)
      if (tagEnd < 0) { buf = buf.slice(start); break }
      let end: number
      if (selfClose >= 0 && selfClose + 1 === tagEnd) end = tagEnd + 1
      else {
        const close = buf.indexOf('</Workout>', start)
        if (close < 0) { buf = buf.slice(start); break }
        end = close + '</Workout>'.length
      }
      const w = parseWorkoutBlock(buf.slice(start, end))
      if (w) found.push(w)
      buf = buf.slice(end)
    }
    if (found.length && onProgress) onProgress(found.length)
    if (done) break
  }
  return found
}

/** zip 안에서 export.xml 을 찾아 압축을 풀며 읽는 스트림 */
async function zipEntryStream(file: File, match: (name: string) => boolean): Promise<ReadableStream<Uint8Array>> {
  // 중앙 디렉터리는 파일 끝에 있어요
  const tailSize = Math.min(file.size, 66000)
  const tail = new DataView(await file.slice(file.size - tailSize).arrayBuffer())
  let eocd = -1
  for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('zip 파일을 읽을 수 없어요.')
  let cdSize = tail.getUint32(eocd + 12, true)
  let cdOffset = tail.getUint32(eocd + 16, true)
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    // ZIP64 — 4GB가 넘는 내보내기
    const loc = eocd - 20
    if (loc < 0 || tail.getUint32(loc, true) !== 0x07064b50) throw new Error('zip 파일을 읽을 수 없어요.')
    const z64 = Number(tail.getBigUint64(loc + 8, true))
    const rec = new DataView(await file.slice(z64, z64 + 56).arrayBuffer())
    cdSize = Number(rec.getBigUint64(40, true))
    cdOffset = Number(rec.getBigUint64(48, true))
  }
  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer())
  const dec = new TextDecoder()
  for (let p = 0; p + 46 <= cd.byteLength && cd.getUint32(p, true) === 0x02014b50;) {
    const method = cd.getUint16(p + 10, true)
    let compSize = cd.getUint32(p + 20, true)
    const nameLen = cd.getUint16(p + 28, true), extraLen = cd.getUint16(p + 30, true), commentLen = cd.getUint16(p + 32, true)
    let localOffset = cd.getUint32(p + 42, true)
    const name = dec.decode(new Uint8Array(cd.buffer, p + 46, nameLen))
    if (match(name)) {
      // ZIP64 확장 필드에서 실제 크기·위치를 읽어요
      for (let e = p + 46 + nameLen; e < p + 46 + nameLen + extraLen;) {
        const id = cd.getUint16(e, true), size = cd.getUint16(e + 2, true)
        if (id === 0x0001) {
          let q = e + 4
          if (cd.getUint32(p + 24, true) === 0xffffffff) q += 8
          if (compSize === 0xffffffff) { compSize = Number(cd.getBigUint64(q, true)); q += 8 }
          if (localOffset === 0xffffffff) localOffset = Number(cd.getBigUint64(q, true))
        }
        e += 4 + size
      }
      const local = new DataView(await file.slice(localOffset, localOffset + 30).arrayBuffer())
      const dataStart = localOffset + 30 + local.getUint16(26, true) + local.getUint16(28, true)
      const raw = file.slice(dataStart, dataStart + compSize).stream()
      if (method === 0) return raw
      if (method !== 8) throw new Error('지원하지 않는 압축 방식이에요.')
      if (typeof DecompressionStream === 'undefined') throw new Error('이 브라우저는 zip을 풀 수 없어요. export.xml 을 올려주세요.')
      return raw.pipeThrough(new DecompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>)
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  throw new Error('zip 안에 export.xml 이 없어요.')
}

/** 내보내기.zip 또는 export.xml 에서 운동 기록을 꺼내요 */
export async function importAppleHealth(file: File, onProgress?: (found: number) => void): Promise<Workout[]> {
  const isZip = /\.zip$/i.test(file.name) || file.type.includes('zip')
  const bytes = isZip
    ? await zipEntryStream(file, n => /(^|\/)export\.xml$/i.test(n))
    : file.stream()
  return scanWorkouts(bytes.pipeThrough(new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>), onProgress)
}
