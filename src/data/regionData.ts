// ── 국가 · 지역 · 도시 데이터 ────────────────────────────────────────────────
//
// 루디아 크루는 국내뿐 아니라 해외 어디에서든 참여할 수 있어요.
// 국가 → 지역(주/도) → 도시 3단계로 나눠서 원하는 곳의 모임을 찾을 수 있어요.

export interface City {
  id: string
  label: string
}

export interface Region {
  id: string
  label: string
  cities: City[]
}

export interface Country {
  code: string
  label: string
  flag: string
  continent: Continent
  regions: Region[]
}

export type Continent = '아시아' | '북미' | '유럽' | '오세아니아' | '중동·아프리카' | '중남미' | '온라인'

export const CONTINENT_ORDER: Continent[] = ['온라인', '아시아', '북미', '유럽', '오세아니아', '중동·아프리카', '중남미']

/** 위치에 매이지 않는 온라인 모임을 나타내는 가상의 국가 코드 */
export const ONLINE_CODE = 'online'
export const ANY = 'all'

const c = (id: string, label: string): City => ({ id, label })

export const COUNTRIES: Country[] = [
  // 지금은 한국 안에서만 운영해요 (해외·온라인 지역은 지웠어요)
  {
    code: 'KR', label: '대한민국', flag: '🇰🇷', continent: '아시아',
    regions: [
      { id: 'seoul', label: '서울', cities: [
        c('gangnam', '강남구'), c('seocho', '서초구'), c('songpa', '송파구'), c('mapo', '마포구'),
        c('yongsan', '용산구'), c('seongdong', '성동구'), c('yeongdeungpo', '영등포구'), c('jongno', '종로구'),
        c('jung', '중구'), c('gwanak', '관악구'), c('nowon', '노원구'), c('gangseo', '강서구'),
      ] },
      { id: 'gyeonggi', label: '경기', cities: [
        c('seongnam', '성남·분당'), c('suwon', '수원'), c('goyang', '고양·일산'), c('yongin', '용인'),
        c('anyang', '안양·평촌'), c('bucheon', '부천'), c('hwaseong', '화성·동탄'), c('namyangju', '남양주'),
      ] },
      { id: 'incheon', label: '인천', cities: [c('songdo', '송도'), c('bupyeong', '부평'), c('cheongna', '청라'), c('guwol', '구월·남동')] },
      { id: 'busan', label: '부산', cities: [c('haeundae', '해운대'), c('seomyeon', '서면'), c('gwangalli', '광안리'), c('nampo', '남포·중구')] },
      { id: 'daegu', label: '대구', cities: [c('suseong', '수성구'), c('dalseo', '달서구'), c('jung-daegu', '중구')] },
      { id: 'daejeon', label: '대전·세종', cities: [c('yuseong', '유성구'), c('seo-daejeon', '서구'), c('jung-daejeon', '중구'), c('dong-daejeon', '동구'), c('daedeok', '대덕구'), c('sejong', '세종시')] },
      { id: 'gwangju', label: '광주', cities: [c('sangmu', '상무지구'), c('cheomdan', '첨단지구'), c('dong-gwangju', '동구'), c('seo-gwangju', '서구'), c('nam-gwangju', '남구'), c('buk-gwangju', '북구'), c('gwangsan', '광산구')] },
      { id: 'ulsan', label: '울산', cities: [c('nam-ulsan', '남구'), c('ulju', '울주군')] },
      { id: 'gangwon', label: '강원', cities: [c('chuncheon', '춘천'), c('gangneung', '강릉'), c('sokcho', '속초'), c('wonju', '원주')] },
      { id: 'chungcheong', label: '충청', cities: [c('cheongju', '청주'), c('cheonan', '천안·아산'), c('chungju', '충주')] },
      { id: 'jeolla', label: '전라', cities: [c('jeonju', '전주'), c('yeosu', '여수'), c('suncheon', '순천'), c('gunsan', '군산')] },
      { id: 'gyeongsang', label: '경상', cities: [c('changwon', '창원'), c('pohang', '포항'), c('gyeongju', '경주'), c('gimhae', '김해')] },
      { id: 'jeju', label: '제주', cities: [c('jejusi', '제주시'), c('seogwipo', '서귀포시')] },
    ],
  },
]

// ── 조회 헬퍼 ───────────────────────────────────────────────────────────────

export interface PlaceRef {
  country: string
  region: string
  city: string
}

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find(x => x.code === code)
}

export function getRegion(code: string, regionId: string): Region | undefined {
  return getCountry(code)?.regions.find(r => r.id === regionId)
}

export function getCity(code: string, regionId: string, cityId: string): City | undefined {
  return getRegion(code, regionId)?.cities.find(x => x.id === cityId)
}

export function isOnlinePlace(code: string) {
  return code === ONLINE_CODE
}

/** "서울 · 마포구" 형태의 라벨 — 한국 안에서만 운영해서 나라 이름·국기는 붙이지 않아요 */
export function placeLabel(place: PlaceRef, opts: { withFlag?: boolean; short?: boolean } = {}): string {
  const { short = false } = opts
  const country = getCountry(place.country)
  if (!country) return '위치 미정'
  const region = getRegion(place.country, place.region)
  const city = getCity(place.country, place.region, place.city)
  const parts = short
    ? [city?.label ?? region?.label ?? '전국']
    : [region?.label, city?.label].filter(Boolean) as string[]
  return parts.join(' · ') || '전국'
}

/** 국가 코드 → 국기 이모지 */
export function flagOf(code: string): string {
  return getCountry(code)?.flag ?? '📍'
}

export const COUNTRIES_BY_CONTINENT: { continent: Continent; countries: Country[] }[] =
  CONTINENT_ORDER
    .map(continent => ({ continent, countries: COUNTRIES.filter(x => x.continent === continent) }))
    .filter(g => g.countries.length > 0)

export interface PlaceSearchResult extends PlaceRef {
  label: string
  flag: string
}

/** 국가/지역/도시 이름을 한 번에 검색 */
export function searchPlaces(query: string, limit = 30): PlaceSearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: PlaceSearchResult[] = []
  for (const country of COUNTRIES) {
    for (const region of country.regions) {
      for (const city of region.cities) {
        const hay = `${country.label} ${country.code} ${region.label} ${city.label}`.toLowerCase()
        if (hay.includes(q)) {
          out.push({
            country: country.code, region: region.id, city: city.id,
            label: `${region.label} · ${city.label}`,
            flag: country.flag,
          })
          if (out.length >= limit) return out
        }
      }
    }
  }
  return out
}
