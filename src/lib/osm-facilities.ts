// ── OpenStreetMap 주변 운동 시설 조회 ─────────────────────────────────────────
//
// 루디아에 등록되지 않은 동네 시설도 찾을 수 있게, 지도에 보이는 영역 안의
// 스포츠센터·수영장·헬스장·코트·트랙 등을 Overpass API 로 불러와요.
// OSM 데이터에는 이용료 정보가 거의 없어서 위치·종류·운영시간만 보여줘요.

export interface OsmFacility {
  id: string
  lat: number
  lng: number
  name: string
  kind: string
  emoji: string
  hours?: string
  access?: string
}

import type { MeetupCategory } from '@/data/meetupData'

export interface Bounds { south: number; west: number; north: number; east: number }

// 공개 Overpass 서버는 자주 바쁘거나 막혀 있어서, 차례로 시도해요
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const TIMEOUT_MS = 15000
const MAX_RESULTS = 200

const SPORT_KIND: Record<string, [string, string]> = {
  tennis: ['테니스장', '🎾'],
  badminton: ['배드민턴장', '🏸'],
  table_tennis: ['탁구장', '🏓'],
  basketball: ['농구장', '🏀'],
  volleyball: ['배구장', '🏐'],
  soccer: ['축구장', '⚽'],
  futsal: ['풋살장', '⚽'],
  running: ['러닝 트랙', '🏃'],
  athletics: ['육상 트랙', '🏃'],
  climbing: ['클라이밍장', '🧗'],
  swimming: ['수영장', '🏊'],
  yoga: ['요가원', '🧘'],
  golf: ['골프장', '⛳'],
  bowling: ['볼링장', '🎳'],
  fitness: ['헬스장', '💪'],
}

function classify(tags: Record<string, string>): [string, string] {
  const sport = (tags.sport ?? '').split(';')[0]
  if (tags.leisure === 'swimming_pool' || sport === 'swimming') return ['수영장', '🏊']
  if (tags.leisure === 'fitness_centre') return ['헬스장·피트니스', '💪']
  if (tags.leisure === 'track') return ['러닝 트랙', '🏃']
  if (SPORT_KIND[sport]) return SPORT_KIND[sport]
  if (tags.leisure === 'sports_centre') return ['스포츠센터', '🏟️']
  if (tags.leisure === 'park') return ['공원·산책로', '🌳']
  if (tags.leisure === 'pitch') return ['운동장', '🏟️']
  return ['운동 시설', '🏟️']
}

const ACCESS_LABEL: Record<string, string> = {
  yes: '누구나 이용', public: '공공 시설', customers: '이용객 전용', members: '회원제', permissive: '개방',
}

// 종목별 Overpass 조건 ({bbox} 자리에 영역이 들어가요). 없는 종목은 실제 시설 찾기를 지원하지 않아요.
const ALL_SPORTS_CLAUSES = [
  'nwr["leisure"~"^(sports_centre|fitness_centre|track)$"]({bbox});',
  'nwr["leisure"="swimming_pool"]["name"]({bbox});',
  'nwr["leisure"="pitch"]["sport"~"tennis|badminton|table_tennis|basketball|volleyball|futsal|athletics|running"]({bbox});',
  'nwr["sport"~"climbing|yoga|bowling"]["name"]({bbox});',
]

const SPORT_CLAUSES: Partial<Record<MeetupCategory, string[]>> = {
  badminton:    ['nwr["sport"~"badminton"]({bbox});'],
  tennis:       ['nwr["sport"~"tennis"]["sport"!~"table_tennis"]({bbox});'],
  table_tennis: ['nwr["sport"~"table_tennis"]({bbox});'],
  volleyball:   ['nwr["sport"~"volleyball"]({bbox});'],
  swimming:     ['nwr["leisure"="swimming_pool"]["name"]({bbox});', 'nwr["sport"~"swimming"]({bbox});'],
  gym:          ['nwr["leisure"="fitness_centre"]({bbox});', 'nwr["sport"~"fitness"]({bbox});'],
  yoga:         ['nwr["sport"~"yoga"]({bbox});'],
  pilates:      ['nwr["sport"~"pilates"]({bbox});', 'nwr["sport"~"yoga"]["name"~"[Pp]ilates|필라테스"]({bbox});'],
  climbing:     ['nwr["sport"~"climbing"]({bbox});'],
  running:      ['nwr["leisure"="track"]({bbox});', 'nwr["sport"~"running|athletics"]({bbox});'],
  walking:      ['nwr["leisure"="park"]["name"]({bbox});'],
  hiking:       ['nwr["leisure"="park"]["name"]({bbox});'],
  golf:         ['nwr["sport"~"golf"]({bbox});'],
  bowling:      ['nwr["sport"~"10pin|bowling"]({bbox});'],
  cycling:      ['nwr["sport"~"cycling"]({bbox});'],
  dance:        ['nwr["leisure"="dance"]({bbox});', 'nwr["sport"~"dance"]({bbox});'],
}

/** 이 종목으로 실제 시설 찾기를 할 수 있는지 */
export function osmSupportsSport(sport: MeetupCategory | 'all'): boolean {
  return sport === 'all' || !!SPORT_CLAUSES[sport]
}

export async function fetchOsmFacilities(b: Bounds, sport: MeetupCategory | 'all' = 'all'): Promise<OsmFacility[]> {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`
  const clauses = sport === 'all' ? ALL_SPORTS_CLAUSES : SPORT_CLAUSES[sport] ?? []
  if (clauses.length === 0) return []
  const query = `
    [out:json][timeout:20];
    (
      ${clauses.map(c => c.split('{bbox}').join(bbox)).join('\n      ')}
    );
    out center ${MAX_RESULTS};`
  const json = await queryOverpass(query)
  const out: OsmFacility[] = []
  for (const el of json.elements) {
    const tags = el.tags ?? {}
    if (tags.access === 'private' || tags.access === 'no') continue
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    if (lat == null || lng == null) continue
    const [kind, emoji] = classify(tags)
    out.push({
      id: `${el.type}/${el.id}`, lat, lng, kind, emoji,
      name: tags['name:ko'] ?? tags.name ?? kind,
      hours: tags.opening_hours,
      access: tags.access ? ACCESS_LABEL[tags.access] : undefined,
    })
  }
  return out
}

type OverpassResponse = {
  elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[]
}

async function queryOverpass(query: string): Promise<OverpassResponse> {
  let lastError: unknown
  for (const url of OVERPASS_URLS) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: ctrl.signal,
      })
      if (!res.ok) throw new Error(`overpass ${res.status}`)
      const json = await res.json() as OverpassResponse
      if (!Array.isArray(json.elements)) throw new Error('overpass: bad response')
      return json
    } catch (e) {
      lastError = e
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError
}

export function osmDirectionsUrl(p: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
}
